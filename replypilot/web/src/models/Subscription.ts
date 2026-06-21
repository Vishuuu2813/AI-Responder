import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "cancelled" | "expired" | "trial";
  billingCycle: "monthly" | "yearly";
  currency: "INR" | "USD";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  razorpaySubscriptionId?: string;
  stripeSubscriptionId?: string;
  messagesUsed: number;
  messagesLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled", "expired", "trial"],
      default: "active",
    },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    currency: { type: String, enum: ["INR", "USD"], default: "INR" },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    trialEnd: { type: Date },
    cancelledAt: { type: Date },
    razorpaySubscriptionId: { type: String },
    stripeSubscriptionId: { type: String },
    messagesUsed: { type: Number, default: 0 },
    messagesLimit: { type: Number, required: true },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ user: 1 });
SubscriptionSchema.index({ status: 1 });

export const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
