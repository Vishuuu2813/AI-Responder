import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentRecord extends Document {
  user: mongoose.Types.ObjectId;
  profile?: mongoose.Types.ObjectId;
  contactPhone: string;
  contactName: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;      // PhonePe, GPay, Paytm, Bank Transfer etc.
  recipientName: string;      // Name on whose account payment was received
  paymentDate: string;        // Date/time from screenshot
  status: "verified" | "wrong_recipient" | "duplicate" | "incomplete";
  rawExtractedData: string;   // Full JSON extracted by GPT-4o vision
  createdAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profile: { type: Schema.Types.ObjectId, ref: "Profile" },
    contactPhone: { type: String, required: true },
    contactName: { type: String, default: "" },
    transactionId: { type: String, required: true },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    recipientName: { type: String, default: "" },
    paymentDate: { type: String, default: "" },
    status: {
      type: String,
      enum: ["verified", "wrong_recipient", "duplicate", "incomplete"],
      default: "verified",
    },
    rawExtractedData: { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for fast duplicate checks
PaymentRecordSchema.index({ user: 1, transactionId: 1 }, { unique: true });
PaymentRecordSchema.index({ profile: 1 });

export const PaymentRecord: Model<IPaymentRecord> =
  mongoose.models.PaymentRecord ||
  mongoose.model<IPaymentRecord>("PaymentRecord", PaymentRecordSchema);
