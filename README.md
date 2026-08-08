<div align="center">

# 🧬 Myrri

### Your private AI health coach — free forever, runs on your phone, no subscription, no account, no data-selling.

**Myrri turns your Apple Health / Google Health Connect data into a personal coach: a daily morning brief, WHOOP-style strain & readiness scores, a biological-age estimate, habit tracking, AI food logging with barcode scanning, and a chat coach that actually knows your body.**

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-blueviolet)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](package.json)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](app.json)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-5c5c5c)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#contributing)

**[✨ Product Hunt](#) · [💬 Discord](#) · [🐦 X / Twitter](#) · [📱 TestFlight](#) · [🤖 Android build](#)**

*Shields and links above are placeholders — add your launch links before posting.*

<p><em>📸 Screenshots coming soon — real Myrri screens are being captured before launch.</em></p>

</div>

<p align="center">
<a href="#why-myrri-exists">Why</a> · <a href="#features">Features</a> · <a href="#how-its-built">Tech</a> · <a href="#getting-started">Quickstart</a> · <a href="#privacy">Privacy</a> · <a href="#roadmap">Roadmap</a> · <a href="#contributing">Contributing</a>
</p>

---

## Why Myrri exists

Health apps have a broken business model: they **sell your data**, lock your metrics behind **$10–30/month subscriptions**, and push everything through **clouds you don't control**. Fitness wearables hand you a Whoop/Ōura subscription to tell you what your sleep already told you for free.

So I built the opposite:

> **A real AI health coach that is free forever, keeps your data on your phone, needs no account, and works with the wearable you already own.**

Every core feature — readiness, strain, biological age, journaling, food logging, the morning brief — works **completely offline and without paying anything**. AI is optional, and when you use it you choose exactly how it runs.

---

## What makes Myrri different

| | Myrri | Whoop / Ōura | MyFitnessPal / Noom |
|---|---|---|---|
| **Price** | Free forever | $10–30 / month | $10–50 / month |
| **Account required** | ❌ No | ✅ Yes | ✅ Yes |
| **Wearable needed** | ❌ Works with phone sensors & manual logs | ✅ Required | ❌ (but data sold) |
| **Data stays on device** | ✅ SQLite, local-first | ❌ Cloud | ❌ Cloud |
| **Sells/ads your data** | ❌ Never | ❌ | ⚠️ |
| **AI coach** | ✅ Free, on-device option | ❌ | ❌ |
| **Source available** | ✅ Free for noncommercial use | ❌ | ❌ |

---

## ✨ Features

### 🤖 Coach — your AI health assistant
A real chat coach with a **tool-calling loop**: it reads your journal and health data, logs meals, searches the food database, and updates your plan — not a canned chatbot.

- **Runs where you choose** — pick your AI at onboarding and switch anytime:
  - **Bring your own key (BYOK)** — recommended. OpenAI, Anthropic, Google Gemini, or OpenRouter. Keys are stored **encrypted** in secure storage and sent only to the provider you pick.
  - **On-device** — Llama (downloadable, via `llama.rn`), Apple's built-in LLM, or Google **Gemini Nano**. Your prompts **never leave the phone**.
  - **No AI** — everything else (readiness, strain, journal, food, barcode scanning) works fully offline.
- **Best-effort privacy scrubbing** — before anything goes to a cloud model, emails, phone numbers, addresses, links, and IDs are stripped.
- We make **zero money** from any AI choice — no commission, no referral fees.

### 🩺 Readiness & Strain (WHOOP-style, without the subscription)
- **Readiness score** built from a rolling **21-day HRV / resting-HR / sleep baseline** — your own numbers, not population guesses.
- **Strain** tracked against a personal target, with a cumulative activity curve comparing the last 30 days to the previous 30.
- **Morning brief** 📬 — a scheduled notification each morning: *yesterday's* recap (goals hit, steps, sleep, calories, protein) and *today's* reminders. Generated deterministically — works with **no AI and no cloud**.

### 🧬 Biological Age
- A **wellness-oriented age index** from VO₂ max, HRV, resting HR, sleep, movement, body composition, and blood pressure — anchored on published cardiorespiratory reference tables (ACSM/FRIEND) with confidence dampening so sparse data can't fake a dramatic result.
- **Honest by design:** it's labeled as a heuristic index, not a clinical aging clock — and the UI shows a confidence level alongside the number.

### 📓 Journal & Habit Tracking
- **40+ habits** in one tap: added sugar, alcohol, caffeine, mood, hydration, keto/low-carb, protein & veggie servings, water, walks, gym, stretching, sunlight, meditation, journaling, reading, social connection, weight & waist, meal prep, mindful eating, morning routine, gratitude, no-devices-in-bed, early bedtime… each with binary ✓/✗, counter, or measured inputs.
- Weekly completion calendar, streaks, and **Insights** that correlate your habits with your readiness (14-day window).

### 🍎 Food Logging
- **Offline nutrition database** — **300,000+ foods** (USDA/OpenNutrition) bundled as SQLite. Works with **no internet**.
- **📷 Barcode scanning** — **300,000+ EAN-13 / UPC barcodes** in the offline DB; point your camera at any product for instant logging.
- **🤖 AI food chat** — describe a meal in plain words ("two eggs, toast, coffee") and Coach logs it with macros.
- **Smart servings** — grams, cups, "1 egg", "0.5 serving" — with a full calorie/protein/carbs/fat/fiber breakdown and per-day nutrition goals.

### ⌚ Wearable & Platform Data
- **Android:** Health Connect — steps, distance, heart rate, **RHR, HRV, respiratory rate, SpO₂**, sleep, active calories, VO₂ max, body fat, lean mass, blood pressure, temperature, weight, height.
- **iOS:** HealthKit via `react-native-health`.
- Everything degrades gracefully — the app works with zero wearable data through manual journaling.

---

## 🧱 How it's built

**Stack:** Expo SDK 54 · React Native 0.81 · TypeScript · expo-router · expo-sqlite · react-native-svg · llama.rn · expo-camera · expo-notifications · expo-secure-store · Health Connect (expo-health-connect) · HealthKit (react-native-health)

- **Local-first architecture** — AsyncStorage + SQLite on device; no backend, no server, no telemetry.
- **Provider-agnostic LLM layer** (`src/services/localLLM.ts`) — one chat API, four interchangeable providers, each with `isAvailable()/init()/chat()`.
- **Deterministic fallbacks everywhere** — the coach plan, readiness, biological age, and morning brief all have no-AI code paths so the core app never depends on a model or network.
- **Pluggable health services** — `HealthService` abstracts Health Connect / HealthKit behind one API.

```
app/                  # expo-router screens (tabs, onboarding, chat, food, details)
src/services/         # health, readiness, biology, journal, food, coach plan, LLM layer
src/services/providers/ # llama · gemini-nano · apple-builtin · byok
src/components/       # charts (SVG), gauges, chat bubbles, habit rows
modules/              # native modules (Gemini Nano, Apple LLM)
scripts/              # OpenNutrition database build pipeline
```

---

## 🚀 Getting started

> **Prereqs:** Node 20+, an Expo dev-client setup, and (for native features) Xcode / Android Studio.

```bash
# 1. Clone & install
git clone <your-repo-url> && cd <repo>
npm install

# 2. Run with the dev client (Health Connect / HealthKit need native modules)
npx expo start --tunnel

# 3. Or build a native dev client
npx expo prebuild --clean
eas build --profile development --platform android   # then install the APK
```

> 🎯 **Native-only app** — install the dev-client build to see Health Connect / HealthKit data on your own phone.

> 🎯 **Heads-up for reviewers:** the health screens light up once you grant Health Connect / HealthKit permission — the app works fine without it.

---

## 🔒 Privacy

- **No account. No signup. No servers. No analytics. No ads.**
- All health data, journal entries, meals, and plans live in **local SQLite/AsyncStorage** on your device.
- Cloud AI is **optional** and clearly labeled; prompts are scrubbed before leaving the phone, and a **fully on-device AI** mode exists.
- Bring-your-own-key is encrypted at rest in secure storage and paid **directly to your provider** — the app never sees or monetizes it.

---

## 🗺️ Roadmap

- [ ] Health Connect **write** support (auto-log workouts & biometrics)
- [ ] Push **weekly insight digest** (habits → readiness correlations)
- [ ] More on-device models (Phi, Qwen) + model switching UI
- [ ] App Store + Play Store releases (TestFlight / internal track)
- [ ] i18n (first: Spanish, German, Japanese)

*Want something on the roadmap? Open an issue — or better, a PR.*

---

## 🤝 Contributing

This project is **look-only unless you join the team**. You're welcome to read the code, learn from it, and suggest ideas — but please don't clone it, fork it, or ship it anywhere.

- **Want to contribute?** Join the team instead of forking — reach out on [Discord](#) and we'll add you to the repo.
- **Good first issues:** [GitHub Issues](#)
- **Ideas & feedback:** [Discord](#) · [Discussions](#)

Contributions happen **inside the team repo** — code, design, docs, translations, and nutrition-data fixes all welcome.

---

## ⚠️ Honest caveats

- **Biological age** is a wellness heuristic, not a clinical diagnosis — it's clearly labeled in-app.
- **On-device AI** needs a recent high-end phone and a few hundred MB of free storage; it's the "most private" but slowest option.
- **Barcode coverage** (~300k bundled codes) won't have every product — unknown barcodes fall back to manual/AI search.
- Health metrics vary by device; trend lines are more meaningful than single readings.
- This is not medical advice. Myrri is a wellness tracker, not a doctor.

---

## 📄 License

**Read-only, look-only access.** This repository is open to read — the code is public so anyone can see how it works — but you are **not licensed to clone, copy, download, modify, redistribute, or build on it in any way**, and it may **never be used for commercial purposes** or any other use beyond looking at it. You may **not** present, publish, or claim it (or anything derived from it) as your own, and you may **not** attribute your own work to the Myrri team.

If you want to build on Myrri — improve it, translate it, fix bugs, or take it further — **join the team**. Contributions happen inside the repo; outside collaborators are added by the maintainers.

> For any other use, contact the author for a separate license.

---

<div align="center">

**Myrri is free forever.** If you like it, ⭐ the repo, tell a friend, and help us build the health app that doesn't treat you as the product.

<sub>Made with ❤️ and an unhealthy amount of HRV data.</sub>

</div>
