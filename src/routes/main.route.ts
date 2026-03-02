import { Router } from "express";

import authRoute from "@/routes/auth.route";
import userRoute from "@/routes/user.routes";
import blogRoute from "@/routes/blog.route";

const mainRoute: Router = Router();

mainRoute.use("/auth", authRoute);

mainRoute.use("/user", userRoute);

mainRoute.use("/blog", blogRoute);

export default mainRoute;
