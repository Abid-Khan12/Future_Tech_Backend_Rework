import "dotenv/config";

import z from "zod";

const envSchema = z.object({
   PORT: z.string().nonempty(),
   MONGO_URI: z.string().nonempty(),
   JWT_ACCESS_SECRET: z.string().nonempty(),
   JWT_REFRESH_SECRET: z.string().nonempty(),
   JWT_ACCESS_EXPIRY: z.string().nonempty(),
   JWT_REFRESH_EXPIRY: z.string().nonempty(),
   FRONTEND_URL: z.string().nonempty(),
   NODE_ENV: z.enum(["development", "production"]),
   CLOUDINARY_CLOUD_NAME: z.string().nonempty(),
   CLOUDINARY_API_KEY: z.string().nonempty(),
   CLOUDINARY_API_SECRET: z.string().nonempty(),
   CLOUDINARY_FOLDER_NAME: z.string().nonempty(),
   QUERY_LIMIT: z.string().nonempty(),
   QUERY_OFFSET: z.string().nonempty(),
});

const env = envSchema.parse(process.env);

export default env;
