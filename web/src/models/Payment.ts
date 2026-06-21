import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  subscription?: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  amount: number;
  currency: "INR" | "USD";
  status: "pending" | "completed" | "failed" | "refunded";
  gateway: "razorpay" | "stripe";
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  billingCycle: "monthly" | "yearly";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    status: { type: String, enum: ["pending", "completed", "failed", "refunded"], default: "pending" },
    gateway: { type: String, enum: ["razorpay", "stripe"], required: true },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    gatewaySignature: { type: String },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ gatewayPaymentId: 1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
