import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContact extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  type: "vip" | "normal" | "blocked" | "selected";
  source: "whatsapp" | "whatsapp_business" | "both";
  notes?: string;
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    type: { type: String, enum: ["vip", "normal", "blocked", "selected"], default: "normal" },
    source: { type: String, enum: ["whatsapp", "whatsapp_business", "both"], default: "both" },
    notes: { type: String },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

ContactSchema.index({ user: 1, phone: 1 }, { unique: true });

export const Contact: Model<IContact> =
  mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);
