import z from "zod";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { Request, Response } from "express";
import { SortOrder } from "mongoose";

import blogModel, { IBlog } from "@/models/blog-model";

import logger from "@/lib/winston";
import generateSlug from "@/utils/generate-slug";
import env from "@/schema/env-schema";
import { createBlogSchema, updateBlogSchema } from "@/schema/apis/blog/schema";
import { removeFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";

type BlogData = Pick<IBlog, "title" | "content" | "status">;

type BlogDataUpdate = Partial<{
   title: string;
   content: string;
   status: string;
   bannerImage:
      | { url: string; public_id: string; width: number; height: number }
      | Express.Multer.File;
}>;

// For purifying the blog content
const window = new JSDOM("").window;
const purify = DOMPurify(window);

export const createBlog = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const body = req.body as BlogData;
      const bannerImage = req.file;

      const {
         success,
         data: parsedBody,
         error,
      } = createBlogSchema.safeParse({ ...body, bannerImage });

      if (!success) {
         const formatedError = z.flattenError(error);

         return res.status(400).json({
            status: 400,
            message: "Validation error",
            error: formatedError.fieldErrors,
         });
      }

      parsedBody.content = purify.sanitize(parsedBody.content);

      const data = await uploadToCloudinary(parsedBody.bannerImage.buffer, "blog_banners");

      if (!data) {
         logger.error("Error while banner image uploading");
         return res.status(500).json({
            status: 500,
            message: "Internal server error",
         });
      }

      const newBlogData = {
         ...parsedBody,
         bannerImage: {
            public_id: data.public_id,
            url: data.secure_url,
            width: data.width,
            height: data.height,
         },
      };

      await blogModel.create({ ...newBlogData, author: userId!, slug: generateSlug() });

      res.status(201).json({
         status: 201,
         message: "Blog created successfully",
      });

      logger.info("Blog created successfully");
   } catch (error) {
      logger.error("Error while creating a blog", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const deleteBlog = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const { slug } = req.params as { slug: string };

      if (!slug) {
         return res.status(400).json({
            status: 400,
            message: "Slug not provided",
         });
      }

      const blog = await blogModel.findOne({ slug, author: userId }).exec();

      if (!blog) {
         return res.status(404).json({
            status: 404,
            message: "Blog not found",
         });
      }

      await removeFromCloudinary(blog.bannerImage.public_id);

      await blogModel.findOneAndDelete({ slug, author: userId });

      res.status(200).json({
         status: 200,
         message: "Blog deleted successfully",
      });

      logger.info("Blog deleted successfully");
   } catch (error) {
      logger.error("Error while deleting a blog", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const updateBlog = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const { slug } = req.params as { slug: string };
      const body = req.body as BlogData;
      const bannerImage = req.file;

      if (!slug) {
         return res.status(400).json({
            status: 400,
            message: "Slug not provided",
         });
      }

      const {
         success,
         data: parsedBody,
         error,
      } = updateBlogSchema.safeParse({ ...body, bannerImage });

      if (!success) {
         const formatedError = z.flattenError(error);

         return res.status(400).json({
            status: 400,
            message: "Validation error",
            error: formatedError.fieldErrors,
         });
      }

      if (parsedBody.content) {
         parsedBody.content = purify.sanitize(parsedBody.content);
      }

      const blog = await blogModel.findOne({ slug, author: userId }).exec();

      if (!blog) {
         return res.status(404).json({
            status: 404,
            message: "Blog not found",
         });
      }

      const updatedBlogData: BlogDataUpdate = {
         ...parsedBody,
      };

      if (parsedBody.bannerImage) {
         await removeFromCloudinary(blog.bannerImage.public_id);

         const data = await uploadToCloudinary(parsedBody.bannerImage.buffer, "blog_banners");

         if (!data) {
            logger.error("Error while banner image uploading");
            return res.status(500).json({
               status: 500,
               message: "Internal server error",
            });
         }

         updatedBlogData.bannerImage = {
            public_id: data.public_id,
            url: data.secure_url,
            width: data.width,
            height: data.height,
         };
      }

      const updatedBlog = await blogModel
         .findOneAndUpdate(
            { slug, author: userId },
            { ...updatedBlogData },
            { returnDocument: "after" },
         )
         .select("-__v")
         .lean()
         .exec();

      res.status(200).json({
         status: 200,
         message: "Blog updated successfuly",
         blog: updatedBlog,
      });

      logger.info("Blog updated successfuly");
   } catch (error) {
      logger.error("Error while updating a blog", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const getAllBlogs = async (req: Request, res: Response) => {
   try {
      const isTopLiked = req.query.topLiked === "1";

      const limit = parseInt((req.query.limit as string) || env.QUERY_LIMIT);

      const offset = parseInt((req.query.offset as string) || env.QUERY_OFFSET);

      const totalBlogs = await blogModel.countDocuments({
         status: "published",
      });

      const sortOptions: Record<string, SortOrder> = isTopLiked
         ? { likesCount: -1 }
         : { createdAt: -1 };

      const blogs = await blogModel
         .find({ status: "published" })
         .select("-__v -bannerImage.public_id")
         .populate("author", "-__v -createdAt -updatedAt -email -avatar.public_id")
         .limit(limit)
         .skip(offset)
         .sort(sortOptions)
         .lean()
         .exec();

      res.status(200).json({
         status: 200,
         message: "All blogs successfully get",
         blogs,
         total: totalBlogs,
         limit,
         offset,
      });
      logger.info("All blogs successfully get");
   } catch (error) {
      logger.error("Error while getting all blogs", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const getSingleBlog = async (req: Request, res: Response) => {
   try {
      const userId = req.optionalUserId;
      const { slug } = req.params as { slug: string };

      if (!slug) {
         return res.status(400).json({
            status: 400,
            message: "Slug not provided",
         });
      }

      const blog = await blogModel
         .findOne({ slug })
         .select("-__v +likes")
         .populate("author", "-__v -createdAt -updatedAt -email -bannerImage.public_id")
         .lean()
         .exec();

      if (!blog) {
         return res.status(404).json({
            status: 404,
            message: "Post not found",
         });
      }

      const alreadyLiked = userId && blog.likes.some((id) => id.toString() === userId.toString());

      const { likes, ...blogWithoutLikes } = blog;

      res.status(200).json({
         status: 200,
         message: "Blog successfully fetched",
         blog: { ...blogWithoutLikes, isLiked: alreadyLiked },
      });

      logger.info("Blog successfully get");
   } catch (error) {
      logger.error("Error while getting all blogs", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const getUserBlogs = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const limit = parseInt((req.query.limit as string) || env.QUERY_LIMIT);

      const offset = parseInt((req.query.offset as string) || env.QUERY_OFFSET);

      const totalBlogs = await blogModel.countDocuments({
         author: userId,
      });

      const blogs = await blogModel
         .find({
            author: userId,
         })
         .select("-__v")
         .populate("author", "-__v -createdAt -updatedAt -email -avatar.public_id")
         .limit(limit)
         .skip(offset)
         .sort({ createdAt: -1 })
         .lean()
         .exec();

      res.status(200).json({
         status: 200,
         message: "User blogs fetched successfully",
         blogs,
         total: totalBlogs,
         limit,
         offset,
      });

      logger.info("User blogs fetched successfully");
   } catch (error) {
      logger.error("Error while getting user all blogs", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const getUserLikedBlogs = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const limit = parseInt((req.query.limit as string) || env.QUERY_LIMIT);

      const offset = parseInt((req.query.offset as string) || env.QUERY_OFFSET);

      const totalBlogs = await blogModel.countDocuments({
         likes: userId,
      });

      const blogs = await blogModel
         .find({
            likes: userId,
         })
         .select("-__v")
         .populate("author", "-__v -createdAt -updatedAt -email -avatar.public_id")
         .limit(limit)
         .skip(offset)
         .sort({ createdAt: -1 })
         .lean()
         .exec();

      res.status(200).json({
         status: 200,
         message: "User liked blogs fetched successfully",
         likedBlogs: blogs,
         total: totalBlogs,
         limit,
         offset,
      });

      logger.info("User liked blogs fetched successfully");
   } catch (error) {
      logger.error("Error while getting user all blogs", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const getUserSingleBlog = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;

      const { slug } = req.params as { slug: string };

      if (!slug) {
         return res.status(400).json({
            status: 400,
            message: "Slug not provided",
         });
      }

      const blog = await blogModel
         .findOne({
            slug,
            author: userId,
         })
         .select("-__v")
         .populate("author", "-__v -createdAt -updatedAt -email -avatar.public_id")
         .lean()
         .exec();

      if (!blog) {
         return res.status(404).json({
            status: 404,
            message: "Blog not found",
         });
      }

      res.status(200).json({
         status: 200,
         message: "User single blog fetched",
         blog,
      });

      logger.info("User single blog fetched");
   } catch (error) {
      logger.error("Error while getting user single blogs", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};

export const likeUnlikeBlog = async (req: Request, res: Response) => {
   try {
      const userId = req.userId;
      const { slug } = req.params as { slug: string };

      const blog = await blogModel.findOne({ slug, status: "published" }).select("+likes").exec();

      if (!blog) {
         return res.status(404).json({
            status: 404,
            message: "Blog not found OR Isn't published yet",
         });
      }

      const alreadyLiked = blog.likes.some((id) => id.toString() === userId.toString());

      if (alreadyLiked) {
         blog.likes.pull(userId);
      } else {
         blog.likes.addToSet(userId);
      }

      blog.likesCount = blog.likes.length; // ✅ sync count
      await blog.save(); // ✅ single DB call instead of findOneAndUpdate

      res.status(200).json({
         status: 200,
         message: alreadyLiked ? "Blog unliked" : "Blog liked",
         likesCount: blog.likesCount,
         isLiked: !alreadyLiked,
      });

      logger.info(alreadyLiked ? "Blog unliked" : "Blog liked");
   } catch (error) {
      logger.error("Error while liking/unliking blog", error);
      const err = error as Error;
      res.status(500).json({
         status: 500,
         message: err.message,
      });
   }
};
