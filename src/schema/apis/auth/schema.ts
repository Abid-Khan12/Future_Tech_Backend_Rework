import z from "zod";

export const signUpSchema = z.object({
   userName: z
      .string()
      .min(1, "User name is required")
      .max(40, "Maximum 40 characters are allowed"),
   email: z.email({
      error: "Invalid email address",
   }),
   password: z.string().min(1, "Password is required").max(20, "Maximum 20 characters are allowed"),
   avatar: z
      .custom<Express.Multer.File>()
      .refine((file) => !!file, "Avatar is required")
      .refine((file) => file?.mimetype.startsWith("image/"), {
         message: "Avatar must be an image",
      })
      .refine((file) => file?.size <= 2 * 1024 * 1024, {
         message: "Max file size is 2MB",
      }),
});

export const loginSchema = z.object({
   identifier: z.string().min(1, "Username OR email is required"),
   password: z.string().min(1, "Password is required"),
});
