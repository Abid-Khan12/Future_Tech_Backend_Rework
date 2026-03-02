import { Request, Response } from "express";

import userModel, { IUser } from "@/models/user-model";

import logger from "@/lib/winston";
import env from "@/schema/env-schema";
import { removeFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";
import tokenModel from "@/models/token-model";

type TUpdateUser = Partial<Pick<IUser, "userName" | "avatar">>;

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
      const avatarFile = req.file;

      const user = await userModel.findById(userId).select("-__v").exec();

      if (!user) {
         return res.status(404).json({
            status: 404,
            message: "User not found",
         });
      }

      let newData: TUpdateUser = { ...body };

      if (avatarFile) {
         await removeFromCloudinary(user?.avatar.public_id);

         const result = await uploadToCloudinary(avatarFile.buffer);

         if (!result) {
            logger.error("Error while uploading avatar to cloudinary");
            return res.status(500).json({
               status: 500,
               message: "Internal server error",
            });
         }

         newData.avatar = {
            url: result.secure_url,
            public_id: result.public_id,
         };
      }

      const updateUser = await userModel
         .findByIdAndUpdate(userId, { ...newData }, { returnDocument: "after" })
         .select("-__v")
         .lean()
         .exec();

      res.status(200).json({
         status: 200,
         message: "Updated successfully",
         user: updateUser,
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
