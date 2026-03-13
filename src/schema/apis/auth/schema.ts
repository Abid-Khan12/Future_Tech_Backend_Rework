import z from "zod";

export const signUpSchema = z.object({
   userName: z
      .string()
      .min(3, "Minimum 3 characters")
      .max(40, "Maximum 40 characters are allowed")
      .nonempty({ error: "User name is required" }),
   email: z
      .email({
         error: "Invalid email address",
      })
      .nonempty({ error: "Email is required" }),
   password: z
      .string()
      .min(8, "Minimum 8 characters")
      .max(20, "Maximum 20 characters are allowed")
      .nonempty({ error: "Password is required" }),
   avatar: z
      .custom<Express.Multer.File>()
      .refine((file) => !!file, "Avatar is required")
      .refine((file) => file?.mimetype.startsWith("image/"), {
         error: "Avatar must be an image",
      })
      .refine((file) => file?.size <= 2 * 1024 * 1024, {
         error: "Max file size is 2MB",
      }),
});

export const loginSchema = z.object({
   identifier: z.string().nonempty({ error: "Username OR email is required" }),
   password: z.string().nonempty({ error: "Password is required" }),
});

export const updateSchema = z.object({
   userName: z.string().max(40, "Maximum 40 characters are allowed").optional(),
   avatar: z
      .custom<Express.Multer.File>()
      .refine((file) => file?.mimetype.startsWith("image/"), {
         error: "Avatar must be an image",
      })
      .refine((file) => file?.size <= 2 * 1024 * 1024, {
         error: "Max file size is 2MB",
      })
      .optional(),
});

export const updateUserPasswordSchema = z
   .object({
      oldPassword: z.string().nonempty("Old password is required"),
      newPassword: z.string().nonempty("New password is required"),
      confirmNewPassword: z.string().nonempty("Confirm password is required"),
   })
   .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "Password does not match",
      path: ["confirmNewPassword"],
   });
