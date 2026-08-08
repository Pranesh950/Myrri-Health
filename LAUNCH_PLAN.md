# Launch Plan & Predictions

**Product:** Free, open-source AI health coach — real wearable data (Health Connect / HealthKit), habit tracking, goal-based coaching plans, local-first AI (on-device or bring-your-own-key), no paywall, no account required for core features.

**Launch window:** 30 days from announcement. Numbers below are realistic ranges for an indie open-source app with *zero paid marketing* — just community posts + a store listing. Base case = middle of each range.

---

## Per-platform predictions (first 30 days)

| Platform | How you'll probably do | Metric | Notes |
|---|---|---|---|
| **Hacker News** (Show HN) | Best single source. A free, open-source health app that "doesn't sell your data" does well there. 100–400 points if it trends on the front page. | 150–600 GitHub stars, 300–1,200 downloads | Post at ~7–9am ET Tue–Thu. Must have: GIFs/screenshots, "no subscription, no account" in the title, honest reply to comments. |
| **Product Hunt** | Solid but crowded category. Top-10 finish is realistic with a good maker story; #1 is unlikely day one. | 150–400 upvotes → 200–800 downloads | Launch Tue–Thu morning. Hunters' biggest objection: "why not a web demo?" Have one (expo web export) or a video walkthrough. |
| **Reddit** (r/QuantifiedSelf, r/Biohackers, r/Fitness, r/selfhosted, r/OpenSource) | r/QuantifiedSelf + r/Biohackers are the sweet spot — they *want* this exact thing (local-first, data-driven, free). Posting rules vary; r/Fitness bans self-promo, skip it. | 200–1,000 downloads across 3–5 posts | One post per sub, spaced out, framed as "I built X, AMA" not an ad. Expect 1–2 posts to take off, rest to flop. |
| **GitHub** (repo quality → trending) | Trending on GitHub is realistic if HN hits; ~200 stars is the usual trending threshold in the health space. | 100–400 stars from GitHub alone | README with screenshots + demo GIF, architecture diagram, clear "what's free" section, LICENSE (you have MIT). |
| **App Store / Google Play** | Low organic — health storefronts are saturated. ASO on "AI health coach" / "free health tracker" helps a little. | 100–500 installs organic | Release builds via EAS. Reviews from launch users matter more than rankings early on. |
| **X / Twitter** (+ indie hacker accounts) | Near-zero unless someone big shares it. Post anyway for the archive. | 0–200 downloads | Tag @levelsio-style indie accounts; a single retweet can beat all your own posts. |
| **Newsletters / podcasts** (Indie Hackers, Open Source Weekly, health-tech) | Small but high-quality traffic. | 50–300 downloads | Pitch 2–3 with a "no revenue, privacy-first" angle. |

**Total, 30-day base case:** **~2,000 downloads** (range 1,000–5,000) and **~500 GitHub stars** (range 300–1,000).

---

## Cumulative forecast

| Milestone | Downloads | GitHub stars |
|---|---|---|
| Launch day 1–3 | 300–1,000 | 50–200 |
| End of week 1 | 700–2,000 | 150–400 |
| End of month 1 | **1,000–5,000** | **300–1,000** |
| End of month 3 (compounding) | 3,000–15,000 | 800–2,500 |

## What moves these numbers (in order of impact)

1. **A web demo.** HN/PH/Reddit audiences install native apps reluctantly. `npx expo start --web` export with the chat + one dashboard view could 3–5x conversion from all platforms.
2. **A killer demo GIF/video** showing the coaching loop: sleep dial → morning brief notification → goal plan → habit check-in. This is the "wow" that gets shared.
3. **Release builds in TestFlight + Play internal track** *before* posting. Every upvote that can't install is a lost user.
4. **A 1-page site** (healthcoach.app style) with store links + GitHub link — one destination for all posts.
5. **Cross-post timing:** all platforms in the same 48h window so the graphs look alive everywhere at once.

## Honest caveats

- 70%+ of installed users churn in 90 days (normal for health apps). Month-1 downloads ≈ 5–10× the active daily users you'll actually have. Retention (morning brief, habit streaks, weekly insight emails) is the real product work.
- Numbers assume the native rebuild is done, notifications work on device, and there are no launch-day crashes. A crash on launch day cuts everything in half.
- If a post flops, the floor is ~500 downloads / ~150 stars. The ceiling (5k / 1k) requires HN front page + one Reddit post taking off + PH top-10.
