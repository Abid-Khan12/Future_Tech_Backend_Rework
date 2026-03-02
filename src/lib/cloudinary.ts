import env from "@/schema/env-schema";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import logger from "./winston";

cloudinary.config({
   cloud_name: env.CLOUDINARY_CLOUD_NAME,
   api_key: env.CLOUDINARY_API_KEY,
   api_secret: env.CLOUDINARY_API_SECRET,
   secure: env.NODE_ENV === "production",
});

export const uploadToCloudinary = (
   buffer: Buffer<ArrayBufferLike>,
): Promise<UploadApiResponse | undefined> => {
   return new Promise((resolve, reject) => {
      cloudinary.uploader
         .upload_stream(
            {
               allowed_formats: ["png", "jpg"],
               folder: env.CLOUDINARY_FOLDER_NAME,
               transformation: {
                  quality: "auto",
               },
               resource_type: "image",
            },
            (error, result) => {
               if (error) {
                  reject(error);
                  return;
               }
               resolve(result);
               logger.info("Image uploaded to cloudinary successfully");
            },
         )
         .end(buffer);
   });
};

export const removeFromCloudinary = async (public_id: string) => {
   try {
      await cloudinary.uploader.destroy(public_id, {
         resource_type: "image",
      });

      logger.info("Image destroyed from cloudinary successfully");
   } catch (error) {
      logger.error("Error destorying the image from cloudinary", error);
   }
};
