import { Router } from "express";

import authenticate from "@/middlewares/authenticate";
import upload from "@/lib/multer";
import {
   createBlog,
   deleteBlog,
   getAllBlogs,
   getSingleBlog,
   getUserBlogs,
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

blogRoute.patch("/like-unlike/:blogId", authenticate, likeUnlikeBlog);

blogRoute.get("/user/:slug", authenticate, getUserSingleBlog);

blogRoute.get("/:slug", getSingleBlog);

export default blogRoute;
