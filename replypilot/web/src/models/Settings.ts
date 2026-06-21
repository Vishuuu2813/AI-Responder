import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  user: mongoose.Types.ObjectId;
  // Auto Reply
  isEnabled: boolean;
  replyMode: "ai" | "manual" | "hybrid";
  whatsappSource: "whatsapp" | "whatsapp_business" | "both";
  // AI Settings
  ai: {
    useSystemKey: boolean;
    userApiKey?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    language: "english" | "hindi" | "hinglish" | "auto";
    tone: "professional" | "friendly" | "formal" | "sales" | "support";
    replyLength: "short" | "medium" | "long";
    personality: string;
    customInstructions: string;
    memoryType: "short" | "long" | "none";
    memoryMessageCount: number;
    // Training configurations
    greetingTemplate: string;
    newAppLink: string;
    oldAppLink: string;
    websiteLink: string;
    whatsappSupport: string;
    minDeposit: number;
    minWithdraw: number;
    maxWithdraw: number;
    withdrawOpenTime: string;
    withdrawCloseTime: string;
  };
  // Business Hours
  businessHours: {
    enabled: boolean;
    timezone: string;
    awayMessage: string;
    schedule: {
      day: number;
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    }[];
  };
  // Reply Delay
  delay: {
    type: "instant" | "fixed" | "random";
    fixedSeconds: number;
    randomMin: number;
    randomMax: number;
  };
  // Filters
  ignoreGroups: boolean;
  replyInGroups: boolean;
  selectedGroupsOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    isEnabled: { type: Boolean, default: false },
    replyMode: { type: String, enum: ["ai", "manual", "hybrid"], default: "ai" },
    whatsappSource: { type: String, enum: ["whatsapp", "whatsapp_business", "both"], default: "both" },
    ai: {
      useSystemKey: { type: Boolean, default: true },
      userApiKey: { type: String },
      model: { type: String, default: "gpt-4o-mini" },
      temperature: { type: Number, default: 0.7, min: 0, max: 2 },
      maxTokens: { type: Number, default: 500, min: 50, max: 4000 },
      language: { type: String, enum: ["english", "hindi", "hinglish", "auto"], default: "auto" },
      tone: { type: String, enum: ["professional", "friendly", "formal", "sales", "support"], default: "friendly" },
      replyLength: { type: String, enum: ["short", "medium", "long"], default: "medium" },
      personality: { type: String, default: "helpful assistant" },
      customInstructions: { type: String, default: "" },
      memoryType: { type: String, enum: ["short", "long", "none"], default: "short" },
      memoryMessageCount: { type: Number, default: 5 },
      // Satta Matka training defaults
      greetingTemplate: { type: String, default: "Hello {first_name}, welcome to Main Mumbai Support! How can I help you?" },
      newAppLink: { type: String, default: "https://mainmumbaisattamatkadpboss.in/" },
      oldAppLink: { type: String, default: "https://mainmumbaisattamatkadpboss.in/" },
      websiteLink: { type: String, default: "https://www.mainmumbaistarline.com/" },
      whatsappSupport: { type: String, default: "917339987622" },
      minDeposit: { type: Number, default: 100 },
      minWithdraw: { type: Number, default: 200 },
      maxWithdraw: { type: Number, default: 50000 },
      withdrawOpenTime: { type: String, default: "10:00 AM" },
      withdrawCloseTime: { type: String, default: "04:00 PM" },
    },
    businessHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: "Asia/Kolkata" },
      awayMessage: { type: String, default: "We will get back to you soon." },
      schedule: [
        {
          day: { type: Number },
          isOpen: { type: Boolean, default: true },
          openTime: { type: String, default: "09:00" },
          closeTime: { type: String, default: "18:00" },
        },
      ],
    },
    delay: {
      type: { type: String, enum: ["instant", "fixed", "random"], default: "instant" },
      fixedSeconds: { type: Number, default: 1 },
      randomMin: { type: Number, default: 1 },
      randomMax: { type: Number, default: 5 },
    },
    ignoreGroups: { type: Boolean, default: true },
    replyInGroups: { type: Boolean, default: false },
    selectedGroupsOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
