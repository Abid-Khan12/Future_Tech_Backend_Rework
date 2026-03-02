import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser {
   userName: string;
   email: string;
   password: string;
   avatar: {
      public_id: string;
      url: string;
   };
   comparePassword: (userPass: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>(
   {
      userName: {
         type: String,
         required: true,
         toLowerCase: true,
         unique: true,
         trim: true,
      },
      email: {
         type: String,
         required: true,
         unique: true,
      },
      password: {
         type: String,
         required: true,
         select: false,
      },
      avatar: {
         public_id: {
            type: String,
            required: true,
         },
         url: {
            type: String,
            required: true,
         },
      },
   },
   {
      timestamps: true,
   },
);

userSchema.pre("save", async function () {
   if (!this.isModified("password")) {
      return;
   }
   this.password = await bcrypt.hash(this.password, 10);
});

export default model<IUser>("User", userSchema);
