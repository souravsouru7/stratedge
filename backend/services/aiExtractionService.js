/**
 * AI fallback for Indian trade extraction when regex parsing fails.
 * Requires OPENAI_API_KEY in env. Gracefully no-ops if key missing or API fails.
 */

async function extractIndianTradeWithAI(extractedText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !extractedText || extractedText.trim().length < 10) {
    return null;
  }

  const prompt = `Extract Indian options/F&O trade data from this OCR text. Return ONLY valid JSON, no markdown.
Fields: pair (e.g. "NIFTY 26000 PE"), profit (number), quantity (lots, number), strikePrice (number), optionType ("CE" or "PE"), underlying (e.g. "NIFTY").

OCR text:
${extractedText.slice(0, 4000)}

JSON format: {"pair": "...", "profit": 0, "quantity": 0, "strikePrice": 0, "optionType": "CE|PE", "underlying": "..."}
Use null for missing values.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[AI extraction] API error:", res.status, err);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Strip markdown code blocks if present
    let jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      pair: parsed.pair && typeof parsed.pair === "string" ? parsed.pair.trim() : null,
      profit: typeof parsed.profit === "number" ? parsed.profit : null,
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : null,
      strikePrice: typeof parsed.strikePrice === "number" ? parsed.strikePrice : null,
      optionType: parsed.optionType === "PE" || parsed.optionType === "CE" ? parsed.optionType : null,
      underlying: parsed.underlying && typeof parsed.underlying === "string" ? parsed.underlying.trim() : null,
    };
  } catch (err) {
    console.warn("[AI extraction] Error:", err.message);
    return null;
  }
}

module.exports = { extractIndianTradeWithAI };
