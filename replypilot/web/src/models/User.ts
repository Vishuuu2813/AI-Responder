import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  emailVerified?: Date;
  role: "user" | "admin";
  isActive: boolean;
  apiKey?: string;
  subscription?: mongoose.Types.ObjectId;
  settings?: mongoose.Types.ObjectId;
  onboardingCompleted: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false },
    image: { type: String },
    emailVerified: { type: Date },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    apiKey: { type: String, unique: true, sparse: true },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    settings: { type: Schema.Types.ObjectId, ref: "Settings" },
    onboardingCompleted: { type: Boolean, default: false },
    lastSeen: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ apiKey: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
