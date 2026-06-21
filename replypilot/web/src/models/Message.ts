import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  user: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  contactName: string;
  contactPhone: string;
  direction: "incoming" | "outgoing";
  content: string;
  replyContent?: string;
  replyMode: "ai" | "manual" | "hybrid" | "none";
  replyStatus: "pending" | "sent" | "failed" | "skipped";
  aiTokensUsed?: number;
  ruleId?: mongoose.Types.ObjectId;
  isGroupMessage: boolean;
  groupName?: string;
  source: "whatsapp" | "whatsapp_business";
  metadata?: Record<string, unknown>;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation" },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    direction: { type: String, enum: ["incoming", "outgoing"], required: true },
    content: { type: String, required: true },
    replyContent: { type: String },
    replyMode: { type: String, enum: ["ai", "manual", "hybrid", "none"], default: "none" },
    replyStatus: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    aiTokensUsed: { type: Number, default: 0 },
    ruleId: { type: Schema.Types.ObjectId, ref: "Rule" },
    isGroupMessage: { type: Boolean, default: false },
    groupName: { type: String },
    source: { type: String, enum: ["whatsapp", "whatsapp_business"], required: true },
    metadata: { type: Schema.Types.Mixed },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ user: 1, createdAt: -1 });
MessageSchema.index({ user: 1, contactPhone: 1 });
MessageSchema.index({ conversation: 1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
