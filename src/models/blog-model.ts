import { Schema, Types, model } from "mongoose";
import { required } from "zod/v4/core/util.cjs";

export interface IBlog {
   title: string;
   content: string;
   slug: string;
   bannerImage: {
      public_id: string;
      url: string;
      width: number;
      height: number;
   };
   author: Types.ObjectId;
   likes: Types.ObjectId[];
   likesCount: number;
   status: "draft" | "published";
}

const blogSchema = new Schema<IBlog>(
   {
      title: {
         type: String,
         required: true,
         trim: true,
      },
      content: {
         type: String,
         required: true,
         trim: true,
      },
      slug: {
         type: String,
         required: true,
         unique: true,
      },
      author: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      bannerImage: {
         public_id: {
            type: String,
            required: true,
         },
         url: {
            type: String,
            required: true,
         },
         width: {
            type: Number,
            required: true,
         },
         height: {
            type: Number,
            required: true,
         },
      },
      likes: [
         {
            type: Schema.Types.ObjectId,
            ref: "User",
            select: false,
         },
      ],
      likesCount: {
         type: Number,
         default: 0,
      },

      status: {
         type: String,
         enum: ["draft", "published"],
         default: "draft",
      },
   },
   {
      timestamps: true,
   },
);

export default model<IBlog>("Blog", blogSchema);
