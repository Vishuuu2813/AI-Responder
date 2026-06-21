import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlan extends Document {
  name: string;
  slug: string;
  description: string;
  price: {
    monthly: { inr: number; usd: number };
    yearly: { inr: number; usd: number };
  };
  features: {
    messagesPerMonth: number;
    aiReplies: boolean;
    manualRules: number;
    contacts: number;
    analytics: "basic" | "standard" | "advanced" | "custom";
    prioritySupport: boolean;
    customAIInstructions: boolean;
    conversationMemory: boolean;
    businessHours: boolean;
    groupFiltering: boolean;
    contactFiltering: boolean;
  };
  razorpayPlanId?: string;
  stripePriceId?: { monthly: string; yearly: string };
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    price: {
      monthly: { inr: { type: Number, default: 0 }, usd: { type: Number, default: 0 } },
      yearly: { inr: { type: Number, default: 0 }, usd: { type: Number, default: 0 } },
    },
    features: {
      messagesPerMonth: { type: Number, default: 100 },
      aiReplies: { type: Boolean, default: false },
      manualRules: { type: Number, default: 5 },
      contacts: { type: Number, default: 10 },
      analytics: { type: String, enum: ["basic", "standard", "advanced", "custom"], default: "basic" },
      prioritySupport: { type: Boolean, default: false },
      customAIInstructions: { type: Boolean, default: false },
      conversationMemory: { type: Boolean, default: false },
      businessHours: { type: Boolean, default: false },
      groupFiltering: { type: Boolean, default: false },
      contactFiltering: { type: Boolean, default: false },
    },
    razorpayPlanId: { type: String },
    stripePriceId: {
      monthly: { type: String },
      yearly: { type: String },
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);
