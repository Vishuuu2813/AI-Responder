import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISwitchCase {
  keyword: string;
  reply: string;
  isActive: boolean;
}

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  apiKey: string;
  isEnabled: boolean;
  replyMode: "ai" | "manual" | "hybrid";
  whatsappSource: "whatsapp" | "whatsapp_business" | "both";
  
  // AI Settings specific to this Profile (trained agent)
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
    scannerUrl: string;
    scanners: string[];
    
    // Payment verification
    paymentRecipientNames: string[];
    paymentVerificationEnabled: boolean;
  };

  // Custom Quick Replies / Switch-Case menu options
  switchCases: ISwitchCase[];

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

const SwitchCaseSchema = new Schema<ISwitchCase>({
  keyword: { type: String, required: true },
  reply: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

const ProfileSchema = new Schema<IProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true },
    isEnabled: { type: Boolean, default: true },
    replyMode: { type: String, enum: ["ai", "manual", "hybrid"], default: "ai" },
    whatsappSource: { type: String, enum: ["whatsapp", "whatsapp_business", "both"], default: "both" },
    ai: {
      useSystemKey: { type: Boolean, default: true },
      userApiKey: { type: String, default: "" },
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
      newAppLink: { type: String, default: "" },
      oldAppLink: { type: String, default: "" },
      websiteLink: { type: String, default: "" },
      whatsappSupport: { type: String, default: "" },
      minDeposit: { type: Number, default: 100 },
      minWithdraw: { type: Number, default: 200 },
      maxWithdraw: { type: Number, default: 50000 },
      withdrawOpenTime: { type: String, default: "10:00 AM" },
      withdrawCloseTime: { type: String, default: "04:00 PM" },
      scannerUrl: { type: String, default: "" },
      scanners: { type: [String], default: [] },
      paymentRecipientNames: { type: [String], default: [] },
      paymentVerificationEnabled: { type: Boolean, default: false }
    },
    switchCases: { type: [SwitchCaseSchema], default: [] },
    delay: {
      type: { type: String, enum: ["instant", "fixed", "random"], default: "instant" },
      fixedSeconds: { type: Number, default: 1 },
      randomMin: { type: Number, default: 1 },
      randomMax: { type: Number, default: 5 }
    },
    ignoreGroups: { type: Boolean, default: true },
    replyInGroups: { type: Boolean, default: false },
    selectedGroupsOnly: { type: Boolean, default: false }
  },
  { timestamps: true }
);

ProfileSchema.index({ user: 1 });
ProfileSchema.index({ apiKey: 1 });

export const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>("Profile", ProfileSchema);
