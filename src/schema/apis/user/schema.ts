import z from "zod";

export const updateUserSchema = z.object({
   userName: z.string().max(40, "Maximum 40 characters are allowes").optional(),
   avatar: z
      .custom<Express.Multer.File>()
      .refine((file) => file?.mimetype.startsWith("image/"), {
         message: "Avatar must be an image",
      })
      .refine((file) => file?.size <= 2 * 1024 * 1024, {
         message: "Max file size is 2MB",
      })
      .optional(),
});
