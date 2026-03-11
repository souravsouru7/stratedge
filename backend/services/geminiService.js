const { GoogleGenerativeAI } = require("@google/generative-ai");

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

async function generateWeeklyFeedback({ snapshot, weekLabel }) {
  const genAI = getGeminiClient();
  // Use a stable default Gemini model name; can be overridden via GEMINI_MODEL.
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `You are a trading journal coach. You are given a JSON snapshot of ONE user's last 7 days of journaled trades.
Your job: produce very detailed, process-focused feedback. Do NOT give buy/sell signals or price predictions. Do NOT give financial advice.
Only use the provided data. If a claim cannot be supported by the snapshot, do not claim it. Refer directly to numbers in the snapshot (win rate, net PnL, profit factor, strategy/session breakdowns, discipline metrics, best/worst trades, etc.).

The user wants COMPLETE, DETAILED FEEDBACK, not generic one-liners. Make every field below information-dense and concrete.

Return ONLY valid JSON (no markdown, no backticks) matching this schema:
{
  "week": string,
  "summary": string, // 2–4 short paragraphs. Include: overall PnL, win rate, profit factor, best/worst days or trades, and psychological themes you infer from the data.
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
        maxOutputTokens: 1600,
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

    let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      // First attempt: direct parse
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      try {
        // Second attempt: extract first JSON block
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) {
          throw parseErr;
        }
        const jsonCandidate = match[0];
        parsed = JSON.parse(jsonCandidate);
        cleaned = jsonCandidate;
      } catch {
        // Final fallback: do NOT throw – just wrap the raw text into a safe, useful structure
        parsed = {
          week: weekLabel,
          summary: cleaned || "AI feedback could not be parsed as JSON, but your trades are logged. Use this week to focus on consistent journaling and one or two clear process goals.",
          mistakes: [],
          improvements: [
            {
              title: "Keep journaling every trade",
              why: "Your weekly AI feedback and your own review both depend entirely on accurate, complete trade logs.",
              how: "For the next 7 days, immediately log entry, exit, size, reason for entry, and emotion for every single trade before you close your platform."
            }
          ],
          nextWeekChecklist: [
            "Log every trade on the same day you take it",
            "Write a one‑sentence reason for entry before clicking buy or sell",
            "Tag each losing trade with the main mistake that caused it",
            "Stop trading for the day after 2 consecutive losses",
            "Review today’s trades for 10 minutes before bed",
            "Re‑read this week’s AI feedback once before the next session",
            "Avoid changing position size mid‑week without a clear rule",
            "Capture a screenshot of every worst trade and save it to your journal"
          ],
        };
      }
    }

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

