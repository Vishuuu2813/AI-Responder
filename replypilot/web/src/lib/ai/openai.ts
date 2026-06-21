import OpenAI from "openai";
import connectDB from "@/lib/db/connect";
import { Settings } from "@/models/Settings";

interface GenerateReplyOptions {
  userId: string;
  message: string;
  contactName: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface GenerateReplyResult {
  reply: string;
  tokensUsed: number;
  model: string;
}

export async function generateAIReply(
  options: GenerateReplyOptions
): Promise<GenerateReplyResult> {
  await connectDB();

  const settings = await Settings.findOne({ user: options.userId });

  if (!settings) {
    throw new Error("User settings not found");
  }

  const apiKey = settings.ai.useSystemKey
    ? process.env.OPENAI_API_KEY
    : settings.ai.userApiKey;

  if (!apiKey) {
    throw new Error("No OpenAI API key configured");
  }

  const openai = new OpenAI({ apiKey });

  // Build system prompt
  const systemPrompt = buildSystemPrompt(settings.ai, options.contactName);

  // Build messages
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  if (options.conversationHistory && options.conversationHistory.length > 0) {
    const historyLimit =
      settings.ai.memoryType === "long"
        ? 20
        : settings.ai.memoryType === "short"
        ? settings.ai.memoryMessageCount
        : 0;

    const history = options.conversationHistory.slice(-historyLimit);
    messages.push(...history);
  }

  // Add current message
  messages.push({ role: "user", content: options.message });

  const completion = await openai.chat.completions.create({
    model: settings.ai.model || "gpt-4o-mini",
    messages,
    temperature: settings.ai.temperature,
    max_tokens: settings.ai.maxTokens,
  });

  const reply = completion.choices[0]?.message?.content || "";
  const tokensUsed = completion.usage?.total_tokens || 0;

  return {
    reply,
    tokensUsed,
    model: settings.ai.model,
  };
}

function buildSystemPrompt(
  aiSettings: {
    language: string;
    tone: string;
    replyLength: string;
    personality: string;
    customInstructions: string;
  },
  contactName: string
): string {
  const toneMap: Record<string, string> = {
    professional: "Be professional and courteous",
    friendly: "Be warm, friendly and approachable",
    formal: "Be formal and structured",
    sales: "Be persuasive and sales-oriented, highlight benefits",
    support: "Be empathetic and solution-focused for customer support",
  };

  const lengthMap: Record<string, string> = {
    short: "Keep replies very brief, 1-2 sentences maximum",
    medium: "Keep replies concise, 2-4 sentences",
    long: "Provide detailed, comprehensive replies",
  };

  const languageMap: Record<string, string> = {
    english: "Reply only in English",
    hindi: "Reply only in Hindi (हिंदी में जवाब दें)",
    hinglish: "Reply in Hinglish (mix of Hindi and English naturally)",
    auto: "Detect the language of the incoming message and reply in the same language",
  };

  const parts = [
    `You are a WhatsApp auto-reply assistant with personality: ${aiSettings.personality}.`,
    `You are replying to a message from ${contactName}.`,
    toneMap[aiSettings.tone] || toneMap.friendly,
    lengthMap[aiSettings.replyLength] || lengthMap.medium,
    languageMap[aiSettings.language] || languageMap.auto,
    "Do not mention that you are an AI unless specifically asked.",
    "Keep replies natural and human-like.",
  ];

  if (aiSettings.customInstructions) {
    parts.push(`\nCustom Instructions:\n${aiSettings.customInstructions}`);
  }

  return parts.join(". ");
}
