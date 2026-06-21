import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSettings extends Document {
  defaultModel: string;
  systemApiKey?: string;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    defaultModel: { type: String, default: "gpt-4o-mini" },
    systemApiKey: { type: String, default: "" },
  },
  { timestamps: true }
);

export const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings || mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);
