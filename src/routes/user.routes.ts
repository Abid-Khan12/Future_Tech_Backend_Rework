import { Router } from "express";

import authenticate from "@/middlewares/authenticate";
import { deleteUser, getUser, updateUser, updateUserPassword } from "@/controllers/user.controller";
import upload from "@/lib/multer";

const userRoute: Router = Router();

userRoute.get("/", authenticate, getUser);

userRoute.delete("/", authenticate, deleteUser);

userRoute.patch("/", authenticate, upload.single("avatar"), updateUser);

userRoute.patch("/password", authenticate, updateUserPassword);

export default userRoute;
