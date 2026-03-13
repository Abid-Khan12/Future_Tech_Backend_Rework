import z from "zod";
import bcrypt from "bcrypt";
import { Request, Response } from "express";

import userModel from "@/models/user-model";
import tokenModel from "@/models/token-model";

import logger from "@/lib/winston";
import env from "@/schema/env-schema";
import { removeFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";
import { updateSchema, updateUserPasswordSchema } from "@/schema/apis/auth/schema";

type TUpdateUser = Partial<{
   userName: string;
   avatar: { url: string; public_id: string } | Express.Multer.File;
}>;

export const getUser = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;

      const user = await userModel.findById(userId).select("-__v").lean().exec();

      res.status(200).json({
         status: 200,
         message: "User successfully get",
         user,
      });

      logger.info("User get successfully");
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "getUser",
         message: `Error while getting the user: ${error}`,
      });
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const updateUser = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const body = req.body as { userName: string };

      const {
         success,
         data: parsedBody,
         error,
      } = updateSchema.safeParse({ ...body, avatar: req.file });

      if (!success) {
         const formatedError = z.flattenError(error);

         return res.status(400).json({
            status: 400,
            message: "Validation error",
            error: formatedError.fieldErrors,
         });
      }

      const user = await userModel.findById(userId).select("-__v").exec();

      if (!user) {
         return res.status(404).json({
            status: 404,
            message: "User not found",
         });
      }

      let newData: TUpdateUser = { ...parsedBody };

      if (parsedBody.avatar) {
         await removeFromCloudinary(user.avatar.public_id);

         const data = await uploadToCloudinary(parsedBody.avatar.buffer, "avatars");

         if (!data) {
            logger.error("Error while uploading avatar to cloudinary");
            return res.status(500).json({
               status: 500,
               message: "Internal server error",
            });
         }

         newData.avatar = {
            url: data.secure_url,
            public_id: data.public_id,
         };
      }

      const existingUser = await userModel.findOne({ userName: newData.userName }).lean().exec();

      if (existingUser) {
         return res.status(409).json({
            status: 409,
            message: `User name already exists`,
         });
      }

      const updateUser = await userModel
         .findByIdAndUpdate(userId, { ...newData }, { returnDocument: "after" })
         .select("-__v -_id -updatedAt -createdAt")
         .lean()
         .exec();

      if (!updateUser) {
         return res.status(500).json({
            status: 500,
            message: "Error while updating the user",
         });
      }

      res.status(200).json({
         status: 200,
         message: "Updated successfully",
         user: {
            userName: updateUser.userName,
            email: updateUser.email,
            avatar: updateUser.avatar.url,
         },
      });

      logger.info("User updated successfully");
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "updateUser",
         message: `Error while updating the user: ${error}`,
      });
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const deleteUser = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;

      const user = await userModel.findById(userId).select("-__v").exec();

      if (!user) {
         return res.status(404).json({
            status: 404,
            message: "User not found",
         });
      }

      await tokenModel.findOneAndDelete({
         userId,
      });

      await removeFromCloudinary(user.avatar.public_id);

      await userModel.findByIdAndDelete(user._id);

      res.clearCookie("refreshToken", {
         httpOnly: true,
         sameSite: "strict",
         secure: env.NODE_ENV === "production",
      });

      res.status(200).json({
         status: 200,
         message: "Account deleted successfully",
      });

      logger.info("User deleted successfully");
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "updateUser",
         message: `Error while deleting the user: ${error}`,
      });
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const updateUserPassword = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const body = req.body;

      const { success, data: parsedBody, error } = updateUserPasswordSchema.safeParse(body);

      if (!success) {
         const formatedError = z.flattenError(error);

         return res.status(400).json({
            status: 400,
            message: "Validation error",
            error: formatedError.fieldErrors,
         });
      }

      const user = await userModel.findById(userId).select("-__v +password").exec();

      if (!user) {
         return res.status(404).json({
            status: 404,
            message: "User not found",
         });
      }

      const isPassMatched = await bcrypt.compare(parsedBody.oldPassword, user.password);

      if (!isPassMatched) {
         return res.status(400).json({
            status: 400,
            message: "Invalid old password",
         });
      }

      user.password = parsedBody.newPassword;

      await user.save();

      res.status(200).json({
         status: 200,
         message: "Password updated successfully",
      });

      logger.info("Password updated for this user", user._id);
   } catch (error) {
      const err = error as Error;
      logger.error({
         path: "updatedUserPassword",
         message: `Error while updating user password: ${error}`,
      });

      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};
