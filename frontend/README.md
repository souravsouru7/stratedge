This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
High‑impact analytics ideas for your journal
Here are concise, “impressive but useful” analytics you can add on top of what you already have:

Behavior & discipline

Rule vs Emotion score: % of trades tagged Plan vs Emotion/Impulsive, plus P&L per category.
Plan adherence timeline: small chart showing how often they follow plan over weeks.
Revenge trading detector: highlight sequences where user increases size right after a loss.
Risk & sizing

Risk per trade heatmap: actual (R) risked per trade vs target (e.g. 0.5R–2R); flag oversizing.
Position size consistency: variance of lot size or ₹ risk; show “Stable / Swingy” risk behavior.
Max risk exposure per day: sum of risk in open trades vs account size.
Session & time behavior (now using user session)

Session edge card: for each session (Asia/London/NY), show WR, avg R, and “Green/Red” tag.
Energy curve: profit by hour of day (local time); mark “focus hours” vs “danger hours”.
Psychological patterns

After-win / after-loss behavior: WR and avg R:R for trades taken immediately after a big win or big loss.
Tilt alert: detect days where 3+ losing trades in a row with increasing size.
Strategy performance

League table of strategies: WR, avg R, profit, and trade count per strategy, ranked.
Strategy stability: rolling 10‑trade WR per strategy to show which edges are degrading.
Consistency & quality scores

Weekly consistency index: combines number of trades, adherence, and variance of P&L to rate each week.
Execution quality score per trade: simple 0–100 combining: had SL, had TP, RR ≥ target, followed session/strategy rules.
Narrative insights

Plain‑language weekly review: “This week you followed your plan on 70% of trades, made most of your profit in New York, and lost mainly when trading outside your focus hours.”
Next‑week checklist: 3 auto‑generated, specific action items (e.g. “Avoid new trades after 3 consecutive losses”, “Trade only New York session for EURUSD”).
.
Backend (saved with each trade)

Extended the Trade model with:
setupRules: [{ label: String, followed: Boolean }]
setupScore: Number (0–100, percent of rules followed)
When you save a trade from the Upload Trade page, the app now:
Takes all non-empty rules,
Counts how many are ticked,
Computes setupScore = (followed / total) * 100,
Sends both setupRules and setupScore to the backend.
Frontend – checklist in upload/add trade (Forex + Indian single trade)

On upload-trade page, inside the single trade form (the big “Trade Details” card), I added a “SETUP CHECKLIST” block above Notes:
Shows a list of rules with:
A tick box (you click to mark followed / not followed),
An editable text input for the rule text (you can fully customize).
Default rules I added (you can edit them per trade):
Only trade during my session window
RR at least 1:2 or better
Entered on clear confirmation candle
Stop placed at invalidation level (not random)
Sizing matched pre-defined risk per trade
Controls:
CLEAR TICKS button: unchecks all rules for that trade.
+ ADD RULE: adds a new empty rule row you can type into.
So now, for every trade you log via the Upload Trade screen, you can define your setup rules, tick what you actually followed, and the platform stores both the checklist and a numeric accuracy score for later analytics.

On the Upload Trade page, the Strategy field shows all available setups. When I select a setup, it should display the corresponding checklist.