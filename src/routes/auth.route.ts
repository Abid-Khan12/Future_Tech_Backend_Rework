import { Router } from "express";

import { signUp, login, refreshToken, logout } from "@/controllers/auth.controller";
import upload from "@/lib/multer";
import authenticate from "@/middlewares/authenticate";

const authRoute: Router = Router();

authRoute.post("/sign-up", upload.single("avatar"), signUp);

authRoute.post("/login", login);

authRoute.post("/refresh-token", refreshToken);

authRoute.post("/logout", authenticate, logout);

export default authRoute;
