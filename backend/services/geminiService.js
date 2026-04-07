const { GoogleGenerativeAI } = require("@google/generative-ai");
const { appConfig } = require("../config");

function getGeminiClient() {
  const apiKey = appConfig.ai.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

function extractJsonObject(text) {
  if (!text) return null;
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) return null;
  return match[0];
}

function parseFeedbackFromRaw(rawText) {
  const text = String(rawText || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const candidate = extractJsonObject(text);
    if (!candidate) return null;
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

function buildFallbackFeedback(snapshot, weekLabel) {
  const totalTrades = snapshot?.counts?.totalTrades ?? 0;
  const winRate = snapshot?.rates?.winRatePct ?? 0;
  const profitFactor = snapshot?.rates?.profitFactor ?? 0;
  const net = snapshot?.pnl?.net ?? 0;
  const bestTrade = snapshot?.tradeSamples?.bestTrades?.[0];
  const worstTrade = snapshot?.tradeSamples?.worstTrades?.[0];
  const psychology = snapshot?.psychology || null;

  const summaryLines = [
    `Week: ${weekLabel}`,
    `Results: ${totalTrades} trades, ${Number(winRate).toFixed(1)}% win rate, net P&L ${Number(net).toFixed(2)}, profit factor ${profitFactor}.`,
  ];
  if (bestTrade) summaryLines.push(`Best trade: ${Number(bestTrade.profit || 0).toFixed(2)} on ${bestTrade.pair || "N/A"} (${bestTrade.session || "session not tagged"}).`);
  if (worstTrade) summaryLines.push(`Worst trade: ${Number(worstTrade.profit || 0).toFixed(2)} on ${worstTrade.pair || "N/A"} (${worstTrade.session || "session not tagged"}).`);

  let psychologyFeedback = "";
  if (psychology && psychology.totalTrackedTrades > 0) {
    const topTag = psychology.topEmotionalTags?.[0];
    const topConf = psychology.topConfidence?.[0];
    psychologyFeedback = [
      `Your psychology score is ${psychology.psychologyScore}/100 across ${psychology.totalTrackedTrades} tracked trades.`,
      `Plan adherence is ${psychology.scoreBreakdown?.planAdherencePct ?? 0}%, calm/focused trading is ${psychology.scoreBreakdown?.calmTradingPct ?? 0}%, and no-revenge rate is ${psychology.scoreBreakdown?.noRevengePct ?? 0}%.`,
      topTag ? `Most frequent emotional tag is "${topTag.tag}" (${topTag.count} trades).` : "",
      topConf ? `Most frequent confidence state is "${topConf.label}" (${topConf.count} trades).` : "",
      "Focus next week: only take planned setups, and pause trading after two emotional losses in a row.",
    ].filter(Boolean).join(" ");
  }

  return {
    week: weekLabel,
    summary: summaryLines.join("\n\n"),
    psychologyFeedback,
    mistakes: [],
    improvements: [
      {
        title: "Improve setup quality and selection",
        why: "Recent performance indicates weak edge concentration and inconsistent process execution.",
        how: "Trade only your top setup criteria, reduce low-conviction entries, and review every loss with one concrete rule correction.",
      },
    ],
    nextWeekChecklist: [
      "Trade only pre-defined setups",
      "Stop for the day after 2 consecutive losses",
      "Log mood and confidence before every entry",
      "Tag the primary mistake for every losing trade",
      "Review top 3 losses at end of day",
      "Reduce size on low-confidence setups",
    ],
  };
}

async function generateWeeklyFeedback({ snapshot, weekLabel }) {
  const genAI = getGeminiClient();
  // Use a stable default Gemini model name; can be overridden via GEMINI_MODEL.
  const modelName = appConfig.ai.geminiModel;
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `You are a trading journal coach. You are given a JSON snapshot of ONE user's last 7 days of journaled trades.
Your job: produce very detailed, process-focused feedback. Do NOT give buy/sell signals or price predictions. Do NOT give financial advice.
Only use the provided data. If a claim cannot be supported by the snapshot, do not claim it. Refer directly to numbers in the snapshot (win rate, net PnL, profit factor, strategy/session breakdowns, discipline metrics, best/worst trades, etc.).
If a "psychology" object is present in the snapshot, use it to give a SEPARATE section of mindset feedback (mood, confidence, emotional tags, revenge trading, plan adherence).

The user wants COMPLETE, DETAILED FEEDBACK, not generic one-liners. Make every field below information-dense and concrete.

Return ONLY valid JSON (no markdown, no backticks) matching this schema:
{
  "week": string,
  "summary": string, // 2–4 short paragraphs. Include: overall PnL, win rate, profit factor, best/worst days or trades, and high‑level themes.
  "psychologyFeedback": string, // 1–3 short paragraphs. If psychology data is present, MUST NOT be empty.
  "mistakes": [
    {
      "title": string,   // Short, punchy label like "Revenge trading after losses".
      "evidence": string, // 2–4 sentences. Quote specific numbers from the snapshot (e.g. win rate in a bad session, negative net PnL for a strategy, repeated rule breaks, worst trades, etc.).
      "fix": string      // 2–4 sentences. Very concrete process change for next week (e.g. pre‑trade checklist, max trades after 2 losses, time filters, etc.).
    }
  ],
  "improvements": [
    {
      "title": string, // A specific edge or discipline improvement (e.g. "Lean into London session breakout trades").
      "why": string,   // 2–3 sentences. Explain WHY this is an edge, using snapshot numbers where possible.
      "how": string    // 2–4 sentences. Step‑by‑step process for how to apply this in the next 7 days.
    }
  ],
  "nextWeekChecklist": [
    string // 8–12 very short, atomic checklist items written as commands (e.g. "Risk ≤1% per trade", "Stop trading for the day after 2 consecutive losses", "Tag every trade with the correct mistake label").
  ]
}

Week: ${weekLabel}
Snapshot JSON:
${JSON.stringify(snapshot)}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    // Prefer candidates/parts if available, fallback to .text()
    let text = "";
    const cand = result?.response?.candidates?.[0];
    if (cand?.content?.parts) {
      text = cand.content.parts.map((p) => p.text || "").join("");
    } else {
      text = result?.response?.text?.() || "";
    }

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = parseFeedbackFromRaw(cleaned) || buildFallbackFeedback(snapshot, weekLabel);

    // Normalize required fields
    parsed.week = parsed.week || weekLabel;
    parsed.summary = typeof parsed.summary === "string" ? parsed.summary : "";
    parsed.psychologyFeedback = typeof parsed.psychologyFeedback === "string" ? parsed.psychologyFeedback : "";
    parsed.mistakes = Array.isArray(parsed.mistakes) ? parsed.mistakes : [];
    parsed.improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];
    parsed.nextWeekChecklist = Array.isArray(parsed.nextWeekChecklist) ? parsed.nextWeekChecklist : [];

    return {
      model: modelName,
      feedback: parsed,
      raw: cleaned,
    };
  } catch (err) {
    const message = err?.message || String(err);
    throw new Error(`[Gemini] Failed to generate weekly feedback: ${message}`);
  }
}

module.exports = { generateWeeklyFeedback };

