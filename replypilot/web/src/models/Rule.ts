import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRule extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  keyword: string;
  isRegex: boolean;
  caseSensitive: boolean;
  reply: string;
  isActive: boolean;
  priority: number;
  matchCount: number;
  source: "whatsapp" | "whatsapp_business" | "both";
  createdAt: Date;
  updatedAt: Date;
}

const RuleSchema = new Schema<IRule>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    keyword: { type: String, required: true },
    isRegex: { type: Boolean, default: false },
    caseSensitive: { type: Boolean, default: false },
    reply: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    matchCount: { type: Number, default: 0 },
    source: { type: String, enum: ["whatsapp", "whatsapp_business", "both"], default: "both" },
  },
  { timestamps: true }
);

RuleSchema.index({ user: 1, isActive: 1, priority: -1 });

export const Rule: Model<IRule> =
  mongoose.models.Rule || mongoose.model<IRule>("Rule", RuleSchema);
