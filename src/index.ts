import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";

import env from "@/schema/env-schema";
import limiter from "@/lib/express_rate_limit";
import mainRoute from "@/routes/main.route";
import logger from "@/lib/winston";
import { connectDB, disconnectDB } from "@/lib/mongoose";

const app = express();

// Trust reverse proxy (important for production like Leapcell)
app.set("trust proxy", 1);

// 1️⃣ Security headers first
app.use(helmet());

// 2️⃣ Enable CORS early
app.use(
   cors({
      origin: env.FRONTEND_URL,
      credentials: true,
   }),
);

// 3️⃣ Rate limiting (protects all routes)
app.use(limiter);

// 4️⃣ Parse body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5️⃣ Parse cookies
app.use(cookieParser());

// 6️⃣ Compress responses (should be after routes or near end)
app.use(compression());

(async () => {
   try {
      await connectDB();

      app.use("/api", mainRoute);

      app.listen(env.PORT, () => {
         logger.info(`Server is running at http://localhost:${env.PORT}`);
      });
   } catch (error) {
      logger.error("Failed to start the server Error:", error);
      if (env.NODE_ENV === "production") {
         process.exit(1);
      }
   }
})();

const handleServerShutDown = async () => {
   try {
      await disconnectDB();

      logger.warn("Server SHUTDOWN successfully");
      process.exit(0);
   } catch (error) {
      logger.error("Error during server shutdown", error);
   }
};

process.on("SIGINT", handleServerShutDown);
process.on("SIGTERM", handleServerShutDown);
