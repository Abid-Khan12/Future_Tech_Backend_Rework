import { v2 as cloudinary, TransformationOptions, UploadApiResponse } from "cloudinary";

import env from "@/schema/env-schema";
import logger from "./winston";

cloudinary.config({
   cloud_name: env.CLOUDINARY_CLOUD_NAME,
   api_key: env.CLOUDINARY_API_KEY,
   api_secret: env.CLOUDINARY_API_SECRET,
   secure: env.NODE_ENV === "production",
});

export const uploadToCloudinary = (
   buffer: Buffer<ArrayBufferLike>,
   subFolder: "avatars" | "blog_banners",
): Promise<UploadApiResponse | undefined> => {
   const transformation: TransformationOptions =
      subFolder === "avatars"
         ? {
              quality: "auto",
              fetch_format: "webp",
              width: 200,
              height: 200,
              crop: "fill",
              gravity: "face",
           }
         : { quality: "auto", fetch_format: "webp", width: 1280, crop: "scale" };

   return new Promise((resolve, reject) => {
      cloudinary.uploader
         .upload_stream(
            {
               allowed_formats: ["png", "jpg", "webp", "avif"],
               folder: `${env.CLOUDINARY_FOLDER_NAME}/${subFolder}`,
               transformation,
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
