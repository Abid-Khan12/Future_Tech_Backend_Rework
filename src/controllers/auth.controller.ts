import { Request, Response } from "express";
import z from "zod";
import bcrypt from "bcrypt";
import { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { Types } from "mongoose";

import userModel from "@/models/user-model";
import tokenModel from "@/models/token-model";

import logger from "@/lib/winston";
import env from "@/schema/env-schema";
import { loginSchema, signUpSchema } from "@/schema/apis/auth/schema";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
   generateAccessToken,
   generateRefreshToken,
   verifyRefreshToken,
} from "@/utils/generate-token";

export const signUp = async (req: Request, res: Response) => {
   try {
      const body = req.body;

      const {
         success,
         data: parsedBody,
         error,
      } = signUpSchema.safeParse({ ...body, avatar: req.file });

      if (!success) {
         const formatedError = z.flattenError(error);

         return res.status(400).json({
            status: 400,
            message: "Validation error",
            error: formatedError.fieldErrors,
         });
      }

      const existingUser = await userModel.findOne({
         $or: [{ email: parsedBody.email }, { userName: parsedBody.userName }],
      });

      if (existingUser) {
         let identifier = existingUser.userName === parsedBody.userName ? "Username" : "Email";
         return res.status(409).json({
            status: 409,
            message: `${identifier} already exists`,
         });
      }

      const result = await uploadToCloudinary(parsedBody.avatar.buffer, "avatars");

      if (!result) {
         logger.error("Error while uploading avatar to cloudinary");
         return res.status(500).json({
            status: 500,
            message: "Internal server error",
         });
      }

      const newUser = await userModel.create({
         ...parsedBody,
         avatar: {
            public_id: result.public_id,
            url: result.secure_url,
         },
      });

      if (!newUser) {
         return res.status(500).json({
            status: 500,
            message: "Error while creating new user",
         });
      }

      const accessToken = generateAccessToken(newUser._id);

      const refershToken = generateRefreshToken(newUser._id);

      await tokenModel.create({
         userId: newUser._id,
         token: refershToken,
      });
      logger.info("Token created successfully");

      res.cookie("refreshToken", refershToken, {
         httpOnly: true,
         secure: env.NODE_ENV === "production",
         sameSite: "strict",
      });

      res.status(201).json({
         status: 201,
         message: "Sign up successfully",
         accessToken,
         user: {
            userName: newUser.userName,
            email: newUser.email,
            avatar: newUser.avatar.url,
         },
      });

      logger.info("User register successfully");
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "sign-up",
         message: `Error while signing up ${error}`,
      });
      res.status(500).json({
         status: 500,
         message: "Internal server error",
         error: err.message,
      });
   }
};

export const login = async (req: Request, res: Response) => {
   try {
      const body = req.body;

      const { success, data: parsedBody, error } = loginSchema.safeParse(body);

      if (!success) {
         const formatedError = z.flattenError(error);

         return res.status(400).json({
            status: 400,
            message: "Validation error",
            error: formatedError.fieldErrors,
         });
      }

      const user = await userModel
         .findOne({
            $or: [{ email: parsedBody.identifier }, { userName: parsedBody.identifier }],
         })
         .select("+password")
         .exec();

      if (!user) {
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         const isEmail = emailRegex.test(parsedBody.identifier);
         return res.status(404).json({
            status: 404,
            message: `User with this ${isEmail ? "email" : "username"} does not exist`,
         });
      }

      const isPassMatched = await bcrypt.compare(parsedBody.password, user.password);

      if (!isPassMatched) {
         return res.status(400).json({
            status: 400,
            message: "Invalid password",
         });
      }

      const accessToken = generateAccessToken(user._id);

      const refershToken = generateRefreshToken(user._id);

      const updatedToken = await tokenModel.findOneAndUpdate(
         { userId: user._id },
         {
            token: refershToken,
         },
         {
            returnDocument: "after",
         },
      );

      if (!updatedToken) {
         await tokenModel.create({
            userId: user._id,
            token: refershToken,
         });
      }

      logger.info("Token updated OR created successfully");

      res.cookie("refreshToken", refershToken, {
         httpOnly: true,
         secure: env.NODE_ENV === "production",
         sameSite: "strict",
         maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
         status: 200,
         message: "Login successfully",
         user: {
            userName: user.userName,
            email: user.email,
            avatar: user.avatar.url,
         },
         accessToken,
      });

      logger.info("User login successfully");
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "Login",
         message: `Error while logging in ${error}`,
      });
      res.status(500).json({
         message: "Internal server error",
         error: err.message,
      });
   }
};

export const refreshToken = async (req: Request, res: Response) => {
   try {
      const refreshToken = req.cookies.refreshToken as string;

      if (!refreshToken) {
         logger.info("cookie refresh token not found");
         return res.status(401).json({
            status: 401,
            message: "Unauthorized",
         });
      }

      const tokenExits = await tokenModel.exists({ token: refreshToken });

      if (!tokenExits) {
         logger.info("refresh token model not found");
         return res.status(401).json({
            status: 401,
            message: "Unauthorized",
         });
      }

      const jwtPayload = verifyRefreshToken(refreshToken) as { userId: Types.ObjectId };

      const accessToken = generateAccessToken(jwtPayload.userId);

      res.status(200).json({
         status: 200,
         message: "Token refresh succfully",
         accessToken,
      });

      logger.info("Access token refresh succfully");
   } catch (error) {
      if (error instanceof TokenExpiredError) {
         logger.error({
            path: "refresh token",
            message: "Token expired, login again",
         });
         return res.status(401).json({
            status: 401,
            message: "Token expired, login again",
         });
      }

      if (error instanceof JsonWebTokenError) {
         logger.error({
            path: "refresh token",
            message: "Invalid refresh token",
         });
         return res.status(401).json({
            status: 401,
            message: "Invalid refresh token",
         });
      }

      const err = error as Error;
      logger.error({
         path: "refresh token",
         message: `Error while refreshing the token ${error}`,
      });
      res.status(500).json({
         message: "Internal server error",
         error: err.message,
      });
   }
};

export const logout = async (req: Request, res: Response) => {
   try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
         await tokenModel.deleteOne({ token: refreshToken });

         logger.info("User refresh token deleted");
      }

      res.clearCookie("refreshToken", {
         httpOnly: true,
         sameSite: "strict",
         secure: env.NODE_ENV === "production",
      });

      res.status(200).json({
         status: 200,
         message: "Logout successfully",
      });

      logger.info("User logout successfully");
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "logout",
         message: `Error while logging out ${error}`,
      });
      res.status(500).json({
         message: "Internal server error",
         error: err.message,
      });
   }
};
