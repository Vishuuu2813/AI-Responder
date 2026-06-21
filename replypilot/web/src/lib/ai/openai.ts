import OpenAI from "openai";
import connectDB from "@/lib/db/connect";
import { Settings } from "@/models/Settings";
import { SystemSettings } from "@/models/SystemSettings";

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

  const sysSettings = await SystemSettings.findOne();

  // If user is using the system-wide key, we take the admin's key override (if set) or fallback to env.
  // We also decide the model: if using system key, use admin's defaultModel. If using user key, use user settings model.
  const apiKey = settings.ai.useSystemKey
    ? (sysSettings?.systemApiKey || process.env.OPENAI_API_KEY)
    : settings.ai.userApiKey;

  const modelToUse = settings.ai.useSystemKey
    ? (sysSettings?.defaultModel || "gpt-4o-mini")
    : (settings.ai.model || "gpt-4o-mini");

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
    model: modelToUse,
    messages,
    temperature: settings.ai.temperature,
    max_tokens: settings.ai.maxTokens,
  });

  const reply = completion.choices[0]?.message?.content || "";
  const tokensUsed = completion.usage?.total_tokens || 0;

  return {
    reply,
    tokensUsed,
    model: modelToUse,
  };
}

function buildSystemPrompt(
  aiSettings: any,
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  // Pick random scanner from scanners list if present, otherwise fall back to scannerUrl
  let chosenScanner = "";
  if (aiSettings.scanners && aiSettings.scanners.length > 0) {
    const randIdx = Math.floor(Math.random() * aiSettings.scanners.length);
    chosenScanner = aiSettings.scanners[randIdx];
  } else {
    chosenScanner = aiSettings.scannerUrl || "";
  }
  const fullScannerUrl = chosenScanner
    ? (chosenScanner.startsWith("http") ? chosenScanner : `${baseUrl}${chosenScanner}`)
    : "";

  const greetingMsg = (aiSettings.greetingTemplate || "Hello {first_name}, welcome to Main Mumbai Support! How can I help you?")
    .replace("{first_name}", contactName);

  const parts = [
    `You are the official AI support assistant for "Main Mumbai" Satta Matka platform.`,
    `You are replying to a message from ${contactName}.`,
    toneMap[aiSettings.tone] || toneMap.friendly,
    lengthMap[aiSettings.replyLength] || lengthMap.medium,
    languageMap[aiSettings.language] || languageMap.auto,
    "Do not mention that you are an AI unless specifically asked.",
    "Keep replies natural and human-like.",
    "\n## GREETING & LANGUAGE FLOW",
    `1. If the user's message is a greeting (e.g. "hi", "hello", "hey", "namaste", "hlo") OR if it is their very first message:
       - Respond with: "${greetingMsg}"
       - Ask them to choose their preferred language:
         "Please choose your preferred language / कृपया अपनी पसंदीदा भाषा चुनें:
         🇬🇧 English
         🇮🇳 Hindi / Hinglish
         🌐 Tamil / Telugu / Kannada"
       - Wait for their selection. Do not offer download links or other features in this first message.`,
    `2. If the user sends a preset message like: "Hello Main Mumbai, my name is [Name]. My phone number is [Phone]. My account is in [NEW/old] app.":
       - Extract the [Name] and respond: "Hello [Name]! Welcome to Main Mumbai Support. How can I help you today?"
       - Then prompt for language: "Which language do you prefer? / आप किस भाषा में बात करना पसंद करेंगे? (English, Hindi, Hinglish, Tamil, Telugu, Kannada)"`,
    `3. Once the user selects or starts speaking in a language, LOCK into that language and reply only in it.`,
    "\n## APP INFORMATION & LINKS",
    `- Website Link: ${aiSettings.websiteLink || "https://www.mainmumbaistarline.com/"}`,
    `- New App Download Link: ${aiSettings.newAppLink || "https://mainmumbaisattamatkadpboss.in/"}`,
    `- Old App Download Link: ${aiSettings.oldAppLink || "https://mainmumbaisattamatkadpboss.in/"}`,
    `- Support WhatsApp Number: +${aiSettings.whatsappSupport || "917339987622"}`,
    `- Minimum Deposit: ₹${aiSettings.minDeposit || 100}`,
    `- Minimum Withdrawal: ₹${aiSettings.minWithdraw || 200}`,
    `- Maximum Withdrawal: ₹${aiSettings.maxWithdraw || 50000}`,
    `- Withdrawal Hours: ${aiSettings.withdrawOpenTime || "10:00 AM"} to ${aiSettings.withdrawCloseTime || "04:00 PM"} (Monday to Saturday)`,
    `- Payment Scanner QR Code Link: ${fullScannerUrl || "Link not uploaded yet"}`,
    "\n## LIVE GAME CHARTS DIRECTORY",
    "Here is the database of direct Jodi and Panel chart links for all our games. If a user asks for a chart or link, refer directly to this list and output only the relevant URL:",
    "- **KALYAN**: Jodi: https://mainmumbaistarline.com/chart/jodi/kalyan | Panel: https://mainmumbaistarline.com/chart/panel/kalyan",
    "- **MAIN BAZAR**: Jodi: https://mainmumbaistarline.com/chart/jodi/main-bazar | Panel: https://mainmumbaistarline.com/chart/panel/main-bazar",
    "- **MAIN MUMBAI**: Jodi: https://mainmumbaistarline.com/chart/jodi/main-mumbai | Panel: https://mainmumbaistarline.com/chart/panel/main-mumbai",
    "- **TIME BAZAR**: Jodi: https://mainmumbaistarline.com/chart/jodi/time-bazar | Panel: https://mainmumbaistarline.com/chart/panel/time-bazar",
    "- **MILAN DAY**: Jodi: https://mainmumbaistarline.com/chart/jodi/milan-day | Panel: https://mainmumbaistarline.com/chart/panel/milan-day",
    "- **MILAN NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/milan-night | Panel: https://mainmumbaistarline.com/chart/panel/milan-night",
    "- **RAJDHANI DAY**: Jodi: https://mainmumbaistarline.com/chart/jodi/rajdhani-day | Panel: https://mainmumbaistarline.com/chart/panel/rajdhani-day",
    "- **RAJDHANI NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/rajdhani-night | Panel: https://mainmumbaistarline.com/chart/panel/rajdhani-night",
    "- **SRIDEVI**: Jodi: https://mainmumbaistarline.com/chart/jodi/sridevi | Panel: https://mainmumbaistarline.com/chart/panel/sridevi",
    "- **SRIDEVI NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/sridevi-night | Panel: https://mainmumbaistarline.com/chart/panel/sridevi-night",
    "- **KALAYAN NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/kalayan-night | Panel: https://mainmumbaistarline.com/chart/panel/kalayan-night",
    "- **CENTRAL MUMBAI**: Jodi: https://mainmumbaistarline.com/chart/jodi/central-mumbai | Panel: https://mainmumbaistarline.com/chart/panel/central-mumbai",
    "- **CENTRAL MUMBAI NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/central-mumbai-night | Panel: https://mainmumbaistarline.com/chart/panel/central-mumbai-night",
    "- **R.S MUMBAI DAY**: Jodi: https://mainmumbaistarline.com/chart/jodi/r-s-mumbai-day | Panel: https://mainmumbaistarline.com/chart/panel/r-s-mumbai-day",
    "- **R.S MUMBAI NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/r-s-mumbai-night | Panel: https://mainmumbaistarline.com/chart/panel/r-s-mumbai-night",
    "- **KAALA BAZAR**: Jodi: https://mainmumbaistarline.com/chart/jodi/kaala-bazar | Panel: https://mainmumbaistarline.com/chart/panel/kaala-bazar",
    "- **MUMBAI SUPER DAY**: Jodi: https://mainmumbaistarline.com/chart/jodi/mumbai-super-day | Panel: https://mainmumbaistarline.com/chart/panel/mumbai-super-day",
    "- **MUMBAI SUPER NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/mumbai-super-night | Panel: https://mainmumbaistarline.com/chart/panel/mumbai-super-night",
    "- **BLACK MONEY**: Jodi: https://mainmumbaistarline.com/chart/jodi/black-money | Panel: https://mainmumbaistarline.com/chart/panel/black-money",
    "- **BLACK MONEY NIGHT**: Jodi: https://mainmumbaistarline.com/chart/jodi/black-money-night | Panel: https://mainmumbaistarline.com/chart/panel/black-money-night",
    "\n## REPLIES RULES",
    `- If the user asks for a download link, app link, or installation file:
       - **CRITICAL**: Do NOT send the link directly. You must first ask the user which version they want:
         "Which app link do you need? / आपको कौन सा ऐप लिंक चाहिए?
         1️⃣ New App Link (नया ऐप लिंक)
         2️⃣ Old App Link (पुराना ऐप लिंक)"
       - If they explicitly reply that they want the NEW app, then provide the New App Download Link.
       - If they explicitly reply that they want the OLD app, then provide the Old App Download Link.`,
    `- If the user asks about depositing, adding money, or adding points ("paisa add karna", "points add", "recharge"):
       - You must inform them that they can scan our QR Code Scanner to make the payment: "आप हमारे क्यूआर कोड स्कैनर को स्कैन करके भी पेमेंट कर सकते हैं।"
       - Show them their clickable Payment Scanner QR Code Link: ${fullScannerUrl || "No Scanner QR uploaded yet. Please ask support."}
       - Provide the deposit rules: Minimum deposit is ₹${aiSettings.minDeposit || 100}. Once done, send a screenshot to support.`,
    `- If the user asks for the website, give the Website Link.`,
    `- If the user asks for a chart or chart link (e.g. "Kalyan chart", "Milan chart", "chart link", "chart chahiye"):
       - **CRITICAL**: Do NOT send the market timings, open times, close times, or game rates.
       - ONLY send the direct Chart Link for that market (if they specified a market) or the Website Link (${aiSettings.websiteLink || "https://www.mainmumbaistarline.com/"}) where they can view the live charts.`,
    `- Do NOT answer questions unrelated to the app. Politely tell them: "I can only assist you with Main Mumbai application queries."`,
    `- Do NOT show a numbered menu (like "1. Deposit, 2. Withdrawal"). Reply naturally.`,
  ];

  if (aiSettings.customInstructions) {
    parts.push(`\n## CUSTOM INSTRUCTIONS:\n${aiSettings.customInstructions}`);
  }

  return parts.join("\n");
}
