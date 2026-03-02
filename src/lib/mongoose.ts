import mongoose, { ConnectOptions } from "mongoose";

import env from "@/schema/env-schema";
import logger from "@/lib/winston";

const clientOptions: ConnectOptions = {
   dbName: "express-demo-db",
   appName: "Cluster0",
   serverApi: {
      version: "1",
      strict: true,
      deprecationErrors: true,
   },
};

export const connectDB = async (): Promise<void> => {
   try {
      await mongoose.connect(env.MONGO_URI, clientOptions);

      logger.info("DB connected successfully");
   } catch (error) {
      if (error instanceof Error) {
         throw error;
      }
      logger.error("Error connecting to database", error);
   }
};

export const disconnectDB = async (): Promise<void> => {
   try {
      await mongoose.disconnect();

      logger.warn("DB disconnected successfully");
   } catch (error) {
      if (error instanceof Error) {
         throw new Error(error.message);
      }
      logger.error("Error disconnecting from database", error);
   }
};
