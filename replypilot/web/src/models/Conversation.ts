import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversation extends Document {
  user: mongoose.Types.ObjectId;
  profile?: mongoose.Types.ObjectId;
  contactName: string;
  contactPhone: string;
  source: "whatsapp" | "whatsapp_business";
  isGroup: boolean;
  groupName?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  messageCount: number;
  replyCount: number;
  isActive: boolean;
  context: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profile: { type: Schema.Types.ObjectId, ref: "Profile" },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    source: { type: String, enum: ["whatsapp", "whatsapp_business"], required: true },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    messageCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    context: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ConversationSchema.index({ user: 1, profile: 1, contactPhone: 1, source: 1 }, { unique: true });
ConversationSchema.index({ user: 1, lastMessageAt: -1 });
ConversationSchema.index({ profile: 1, lastMessageAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);
