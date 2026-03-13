import { Router } from "express";

import authenticate from "@/middlewares/authenticate";
import optionalAuth from "@/middlewares/optional-auth";
import upload from "@/lib/multer";
import {
   createBlog,
   deleteBlog,
   getAllBlogs,
   getSingleBlog,
   getUserBlogs,
   getUserLikedBlogs,
   getUserSingleBlog,
   likeUnlikeBlog,
   updateBlog,
} from "@/controllers/blog.controller";

const blogRoute: Router = Router();

blogRoute.post("/", authenticate, upload.single("bannerImage"), createBlog);

blogRoute.delete("/:slug", authenticate, deleteBlog);

blogRoute.patch("/:slug", authenticate, upload.single("bannerImage"), updateBlog);

blogRoute.get("/", getAllBlogs);

blogRoute.get("/user", authenticate, getUserBlogs);

blogRoute.get("/user/like", authenticate, getUserLikedBlogs);

blogRoute.get("/user/:slug", authenticate, getUserSingleBlog);

blogRoute.get("/:slug", optionalAuth, getSingleBlog);

blogRoute.patch("/like-unlike/:slug", authenticate, likeUnlikeBlog);

export default blogRoute;
