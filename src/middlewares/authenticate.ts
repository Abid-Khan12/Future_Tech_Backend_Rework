import { NextFunction, Request, Response } from "express";

import logger from "@/lib/winston";
import { verifyAccessToken } from "@/utils/generate-token";
import { Types } from "mongoose";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const authHeader = req.headers.authorization as string;

      if (!authHeader) {
         return res.status(401).json({
            status: 401,
            message: "Unauthorized",
         });
      }

      const token = authHeader?.split(" ")[1];

      const jwtPayload = verifyAccessToken(token) as { userId: Types.ObjectId };

      req.userId = jwtPayload.userId;

      next();
   } catch (error) {
      if (error instanceof TokenExpiredError) {
         logger.error({
            path: "authenticate middleware",
            message: "Access Token expired",
         });
         return res.status(401).json({
            status: 401,
            message: "Access Token expired, request one with refresh token",
         });
      }

      if (error instanceof JsonWebTokenError) {
         logger.error({
            path: "authenticate middleware",
            message: "Invalid access token",
         });
         return res.status(401).json({
            status: 401,
            message: "Invalid access token",
         });
      }

      const err = error as Error;
      logger.error({
         path: "authenticate middleware",
         message: err.message,
      });
   }
};

export default authenticate;
