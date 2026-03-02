import z from "zod";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { Request, Response } from "express";

import blogModel, { IBlog } from "@/models/blog-model";

import logger from "@/lib/winston";
import generateSlug from "@/utils/generate-slug";
import { createBlogSchema, updateBlogSchema } from "@/schema/apis/blog/schema";
import { removeFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";
import env from "@/schema/env-schema";
import userModel from "@/models/user-model";

type BlogData = Pick<IBlog, "title" | "content" | "status">;

type BlogDataUpdate = Partial<Pick<IBlog, "title" | "content" | "status" | "bannerImage">>;

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

      const data = await uploadToCloudinary(parsedBody.bannerImage.buffer);

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

      await blogModel.create({ ...newBlogData, author: userId, slug: generateSlug() });

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

      const { success, data: parsedBody, error } = updateBlogSchema.safeParse(body);

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

      if (bannerImage) {
         await removeFromCloudinary(blog.bannerImage.public_id);

         const data = await uploadToCloudinary(bannerImage.buffer);

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
      const limit = parseInt((req.query.limit as string) || env.QUERY_LIMIT);

      const offset = parseInt((req.query.offset as string) || env.QUERY_OFFSET);

      const totalBlogs = await blogModel.countDocuments({
         status: "published",
      });

      const blogs = await blogModel
         .find({ status: "published" })
         .select("-__v -bannerImage.public_id")
         .populate("author", "-__v -createdAt -updatedAt -email -avatar.public_id")
         .limit(limit)
         .skip(offset)
         .sort({ createdAt: -1 })
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
      const { slug } = req.params as { slug: string };

      if (!slug) {
         return res.status(400).json({
            status: 400,
            message: "Slug not provided",
         });
      }

      const blog = await blogModel
         .findOne({ slug })
         .select("-__v")
         .populate("author", "-__v -createdAt -updatedAt -email -bannerImage.public_id")
         .lean()
         .exec();

      res.status(200).json({ status: 200, message: "Blog successfully fetched", blog });

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
      const { blogId } = req.params as { blogId: string };

      const blog = await blogModel.findById(blogId).select("+likes").exec();

      if (!blog) {
         return res.status(404).json({
            status: 404,
            message: "Blog not found",
         });
      }

      const alreadyLiked = blog.likes.includes(userId);

      const updateBlog = await blogModel
         .findByIdAndUpdate(
            blogId,
            alreadyLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
            { returnDocument: "after" },
         )
         .select("likesCount likes")
         .exec();

      if (!updateBlog) {
         return res.status(500).json({
            status: 500,
            message: "Error while liking/unliking blog",
         });
      }

      updateBlog.likesCount = updateBlog.likes.length;

      await updateBlog.save();

      res.status(200).json({
         status: 200,
         message: alreadyLiked ? "Blog unliked" : "Blog liked",
         likesCount: updateBlog.likes.length,
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
