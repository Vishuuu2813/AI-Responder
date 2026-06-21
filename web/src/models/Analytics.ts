import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnalytics extends Document {
  user: mongoose.Types.ObjectId;
  date: Date;
  totalMessages: number;
  totalReplies: number;
  aiReplies: number;
  manualReplies: number;
  failedReplies: number;
  skippedMessages: number;
  aiTokensUsed: number;
  activeContacts: number;
  uniqueContacts: string[];
  successRate: number;
  avgResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    totalMessages: { type: Number, default: 0 },
    totalReplies: { type: Number, default: 0 },
    aiReplies: { type: Number, default: 0 },
    manualReplies: { type: Number, default: 0 },
    failedReplies: { type: Number, default: 0 },
    skippedMessages: { type: Number, default: 0 },
    aiTokensUsed: { type: Number, default: 0 },
    activeContacts: { type: Number, default: 0 },
    uniqueContacts: [{ type: String }],
    successRate: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AnalyticsSchema.index({ user: 1, date: -1 }, { unique: true });

export const Analytics: Model<IAnalytics> =
  mongoose.models.Analytics ||
  mongoose.model<IAnalytics>("Analytics", AnalyticsSchema);
