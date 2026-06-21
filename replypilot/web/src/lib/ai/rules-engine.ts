import connectDB from "@/lib/db/connect";
import { Rule } from "@/models/Rule";

interface MatchRuleResult {
  matched: boolean;
  reply?: string;
  ruleId?: string;
}

export async function matchManualRule(
  userId: string,
  message: string
): Promise<MatchRuleResult> {
  await connectDB();

  const rules = await Rule.find({
    user: userId,
    isActive: true,
  }).sort({ priority: -1 });

  for (const rule of rules) {
    let isMatch = false;

    if (rule.isRegex) {
      try {
        const flags = rule.caseSensitive ? "" : "i";
        const regex = new RegExp(rule.keyword, flags);
        isMatch = regex.test(message);
      } catch {
        continue;
      }
    } else {
      const keyword = rule.caseSensitive
        ? rule.keyword
        : rule.keyword.toLowerCase();
      const msg = rule.caseSensitive ? message : message.toLowerCase();
      isMatch = msg.includes(keyword);
    }

    if (isMatch) {
      // Increment match count
      await Rule.updateOne({ _id: rule._id }, { $inc: { matchCount: 1 } });

      return {
        matched: true,
        reply: rule.reply,
        ruleId: rule._id.toString(),
      };
    }
  }

  return { matched: false };
}
