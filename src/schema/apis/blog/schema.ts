import z from "zod";

export const createBlogSchema = z.object({
   title: z.string().min(1, "Title is required").max(100, "Maximum 100 characters are allowed"),
   content: z.string().min(1, "Title is required").max(1000, "Maximum 1000 characters are allowed"),
   status: z.enum(["draft", "published"]),
   bannerImage: z
      .custom<Express.Multer.File>()
      .refine((file) => !!file, "Banner image is required")
      .refine((file) => file?.mimetype.startsWith("image/"), {
         message: "Banner must be an image",
      })
      .refine((file) => file?.size <= 2 * 1024 * 1024, {
         message: "Max file size is 2MB",
      }),
});

export const updateBlogSchema = z.object({
   title: z.string().max(100, "Maximum 100 characters are allowed").optional(),
   content: z.string().max(1000, "Maximum 1000 characters are allowed").optional(),
   status: z.enum(["draft", "published"]),
});
