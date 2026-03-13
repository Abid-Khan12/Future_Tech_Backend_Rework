import { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "@/utils/generate-token";
import { Types } from "mongoose";

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
   try {
      const token = req.headers.authorization?.split(" ")[1] ?? req.cookies?.accessToken;

      if (!token) {
         req.optionalUserId = null; // ✅ no token, just continue as guest
         return next();
      }

      const jwtPayload = verifyAccessToken(token) as { userId: Types.ObjectId };
      req.optionalUserId = jwtPayload.userId;
      next();
   } catch {
      req.optionalUserId = null; // ✅ invalid token, treat as guest
      next();
   }
};

export default optionalAuth;
