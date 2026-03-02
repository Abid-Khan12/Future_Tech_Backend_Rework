import { Schema, model, Types } from "mongoose";

export interface IToken {
   userId: Types.ObjectId;
   token: string;
}

const tokenSchema = new Schema<IToken>(
   {
      userId: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      token: {
         type: String,
         required: true,
      },
   },
   {
      timestamps: true,
   },
);

export default model<IToken>("Token", tokenSchema);
