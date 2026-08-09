<div align="center">

<img src="assets/icon.png" alt="Myrri logo" width="112" height="112" style="border-radius: 24px;" />

# 🧬 Myrri

### Your <span style="color:#E56F63">private</span> AI health coach — free forever, no subscription, no account, no data-selling.

**Myrri turns your Apple Health / Google Health Connect data into a personal coach: a daily morning brief, WHOOP-style strain & readiness scores, a biological-age estimate, habit tracking, AI food logging with barcode scanning, and a chat coach that actually knows your body.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](package.json)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](app.json)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-5c5c5c)](https://play.google.com/store/apps/details?id=com.myrri.app)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#contributing)

[![Get the beta on Android](https://img.shields.io/badge/Get%20the%20beta%20on%20Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=com.myrri.app)
[![Star on GitHub](https://img.shields.io/github/stars/Pranesh950/health-app?style=for-the-badge&logo=github&logoColor=white&color=gold)](https://github.com/Pranesh950/health-app)

**🍎 iOS (TestFlight) is in development — the Android beta is live today.**

*Myrri is a wellness tracker, not a medical device — it doesn't diagnose, treat, or cure anything.*

</div>

<!-- App preview mockup, drawn with the app's real palette (cream · ink · coral). -->
<p align="center">
<svg viewBox="0 0 340 660" width="300" height="583" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Myrri app preview showing readiness, strain and sleep scores">
  <defs>
    <linearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3A3C44"/>
      <stop offset="100%" stop-color="#202126"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#202126" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect x="20" y="20" width="300" height="620" rx="44" fill="url(#bezel)" filter="url(#soft)"/>
  <rect x="14" y="150" width="6" height="34" rx="3" fill="#202126"/>
  <rect x="32" y="32" width="276" height="596" rx="34" fill="#F7F7F9"/>
  <rect x="140" y="46" width="60" height="16" rx="8" fill="#202126"/>
  <text x="52" y="64" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#202126">9:41</text>
  <circle cx="278" cy="60" r="4" fill="#E56F63"/>
  <rect x="264" y="56" width="10" height="8" rx="2" fill="#E7E8EC"/>
  <text x="52" y="112" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#202126">Good morning</text>
  <text x="52" y="134" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#9698A1">Tuesday, July 15 · 07:00</text>
  <rect x="44" y="156" width="248" height="124" rx="18" fill="#FFFFFF" stroke="#E7E8EC" stroke-width="1"/>
  <text x="60" y="184" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#9698A1">READINESS</text>
  <circle cx="104" cy="228" r="38" fill="none" stroke="#F0F1F4" stroke-width="9"/>
  <circle cx="104" cy="228" r="38" fill="none" stroke="#E56F63" stroke-width="9" stroke-linecap="round" stroke-dasharray="214 239" transform="rotate(-90 104 228)"/>
  <text x="104" y="235" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="#202126">87</text>
  <text x="160" y="218" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="700" fill="#202126">Excellent</text>
  <text x="160" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#9698A1">Recovery on track</text>
  <rect x="44" y="292" width="248" height="92" rx="18" fill="#FFFFFF" stroke="#E7E8EC" stroke-width="1"/>
  <text x="60" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#9698A1">STRAIN</text>
  <text x="60" y="350" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#202126">14.2</text>
  <text x="278" y="350" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#9698A1">goal 12.0</text>
  <rect x="60" y="362" width="216" height="8" rx="4" fill="#F0F1F4"/>
  <rect x="60" y="362" width="168" height="8" rx="4" fill="#C96D63"/>
  <rect x="44" y="396" width="248" height="92" rx="18" fill="#FFFFFF" stroke="#E7E8EC" stroke-width="1"/>
  <text x="60" y="424" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#9698A1">SLEEP</text>
  <text x="60" y="454" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#202126">7h 42m</text>
  <text x="278" y="454" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#9698A1">deep 1h 24m</text>
  <rect x="60" y="466" width="216" height="8" rx="4" fill="#F0F1F4"/>
  <rect x="60" y="466" width="188" height="8" rx="4" fill="#6B83A5"/>
  <rect x="44" y="500" width="248" height="104" rx="18" fill="#202126"/>
  <text x="60" y="526" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#F7F7F9">☀️ Morning brief</text>
  <text x="60" y="550" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#A9ABB5">✓ 8,412 steps yesterday</text>
  <text x="60" y="570" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#A9ABB5">✓ Protein goal hit</text>
  <text x="60" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#E8C66A">→ Hydrate before 10am</text>
  <rect x="130" y="606" width="80" height="5" rx="2.5" fill="#D9DAE0"/>
</svg>
</p>

<div align="center">
  <span style="display:inline-block; background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 16px; margin: 4px; font-size: 14px;">🔥 <b>300,000+</b> foods offline</span>
  <span style="display:inline-block; background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 16px; margin: 4px; font-size: 14px;">📸 <b>300,000+</b> barcodes</span>
  <span style="display:inline-block; background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 16px; margin: 4px; font-size: 14px;">✅ <b>40+</b> habits</span>
  <span style="display:inline-block; background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 16px; margin: 4px; font-size: 14px;">📊 <b>21-day</b> baselines</span>
  <span style="display:inline-block; background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 16px; margin: 4px; font-size: 14px;">💰 <b>$0</b> forever</span>
</div>

<br/>

<p align="center">
<a href="#why-myrri-exists">Why</a> · <a href="#what-makes-myrri-different">Compare</a> · <a href="#features">Features</a> · <a href="#how-it-works">How it works</a> · <a href="#supported-wearables">Wearables</a> · <a href="#try-myrri-today">Try it</a> · <a href="#quickstart">Quickstart</a> · <a href="#privacy">Privacy</a> · <a href="#roadmap">Roadmap</a> · <a href="#contributing">Contributing</a>
</p>

---

## Why Myrri exists

Health apps often have a broken business model: many **sell or monetize your data**, lock advanced metrics behind **monthly subscription paywalls**, and push everything through **clouds you don't control**. Fitness wearables frequently hand you a Whoop/Ōura subscription to tell you what your sleep already told you for free.

So I built the opposite:

> **A real AI health coach that is free forever, keeps your data on your phone, needs no account, and works with the wearable you already own.**

Every core feature — readiness, strain, biological age, journaling, food logging, the morning brief — works **completely offline and without paying anything**. AI is optional, and when you use it you choose exactly how it runs.

---

## What makes Myrri different

| | Myrri | Whoop / Ōura | MyFitnessPal / Noom |
|---|---|---|---|
| **Price** | ✅ Free — no subscription | Whoop ~$25–40 / mo billed monthly · Ōura ~$6 / mo³ | MFP ~$7–25 / mo · Noom ~$17–70 / mo³ |
| **No account required** | ✅ | ❌ | ❌ |
| **Phone-sensor tracking, no wearable needed** | ✅ Phone sensors + manual logs | ❌ Band / ring required | ❌ Manual entry only |
| **Data stays on your device** | ✅ SQLite, local-first¹ | ❌ Cloud | ❌ Cloud |
| **AI coach — on-device option included** | ✅ Optional on-device models² | ⚠️ Cloud AI, subscription | ⚠️ Cloud AI (Noom) / none (MFP) |
| **Open source** | ✅ GPLv3 | ❌ | ❌ |

<sub>¹ Core health data and journal entries stay in on-device SQLite/AsyncStorage. Optional cloud AI (bring-your-own-key) sends only scrubbed chat context to the provider you choose — see the [Privacy Policy](PRIVACY_POLICY.md).</sub>

<sub>² On-device models (Llama, Gemini Nano, Apple) run with no network and no account; a bring-your-own-key cloud option is also available.</sub>

<sub>³ Subscription prices verified August 2026 from public listings and change frequently — re-check before publishing. Whoop membership ~$25–40/mo by tier (annual ~$199–399/yr); Ōura membership $5.99/mo (US). MFP Premium $19.99/mo or ~$6.67/mo billed annually (Premium+ higher); Noom $70/mo or ~$17/mo billed annually (Noom Med higher).</sub>

<sub>WHOOP is a trademark of Whoop, Inc.; Ōura of Ōura Health Oy; MyFitnessPal of MyFitnessPal, Inc.; Noom of Noom, Inc. Myrri is an independent project and is not affiliated with, endorsed by, or sponsored by any of these companies. Product and pricing details are provided for comparison based on public information as of the date above.</sub>

---

## ✨ Features

<table style="border-collapse: separate; border-spacing: 12px;">
  <tr>
    <td width="50%" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 24px; vertical-align: top;">
      <h4 style="margin: 0 0 8px;">🤖 AI Coach that knows you</h4>
      A real chat coach with a <b>tool-calling loop</b> — it reads your journal and health data, logs meals, searches the food database, and updates your plan. Not a canned chatbot.
      <ul>
        <li>Runs on-device (Llama, Gemini Nano, Apple) — prompts <b>never leave the phone</b></li>
        <li>Or bring your own key: OpenAI, Anthropic, Gemini, OpenRouter — stored encrypted</li>
        <li>Or no AI at all — everything else works fully offline</li>
        <li>Prompts are privacy-scrubbed before any cloud round-trip</li>
      </ul>
    </td>
    <td width="50%" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 24px; vertical-align: top;">
      <h4 style="margin: 0 0 8px;">🩺 Readiness & Strain</h4>
      WHOOP-style scores built from <b>your own numbers</b>, not population guesses.
      <ul>
        <li><b>Readiness</b> from a rolling 21-day HRV / resting-HR / sleep baseline</li>
        <li><b>Strain</b> tracked against a personal target, with a 30-day cumulative curve</li>
        <li>📬 <b>Morning brief</b> — a daily notification recap of yesterday and today's plan, generated on-device with no AI and no cloud</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 24px; vertical-align: top;">
      <h4 style="margin: 0 0 8px;">🧬 Biological Age</h4>
      A wellness-oriented age index from VO₂ max, HRV, resting HR, sleep, movement, body composition, and blood pressure.
      <ul>
        <li>Anchored on published ACSM/FRIEND cardiorespiratory reference tables</li>
        <li>Confidence dampening so sparse data can't fake a dramatic result</li>
        <li>Honest by design — labeled a heuristic index, with confidence shown in the UI</li>
      </ul>
    </td>
    <td width="50%" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 24px; vertical-align: top;">
      <h4 style="margin: 0 0 8px;">📓 Journal & Habits</h4>
      Build streaks and spot what actually moves your readiness.
      <ul>
        <li><b>40+ habits</b> in one tap — sugar, alcohol, caffeine, mood, hydration, workouts, sunlight, meditation, gratitude, early bedtime…</li>
        <li>Binary ✓/✗, counters, and measured inputs (weight, waist)</li>
        <li>Weekly completion calendar, streaks, and <b>Insights</b> correlating habits with readiness</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 24px; vertical-align: top;">
      <h4 style="margin: 0 0 8px;">🍎 Food Logging</h4>
      Logging meals should take seconds, not spreadsheets.
      <ul>
        <li><b>300,000+ foods</b> (USDA/OpenNutrition) bundled as SQLite — works offline</li>
        <li>📷 <b>Barcode scanning</b> — 300,000+ EAN-13 / UPC codes from the camera</li>
        <li>🤖 <b>AI food chat</b> — "two eggs, toast, coffee" → logged with macros</li>
        <li>Smart servings, full calorie/protein/carbs/fat/fiber breakdown, daily nutrition goals</li>
      </ul>
    </td>
    <td width="50%" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 24px; vertical-align: top;">
      <h4 style="margin: 0 0 8px;">⌚ Your Wearable, Our Engine</h4>
      Reads whatever your device syncs to Apple Health / Google Health Connect.
      <ul>
        <li>Steps, heart rate, <b>RHR, HRV, respiratory rate, SpO₂</b>, sleep, calories, VO₂ max, body fat, blood pressure, temperature</li>
        <li>Guided setup for Apple Watch, Galaxy, Pixel, Garmin, Fitbit, Xiaomi, Amazfit, Huawei, Oura, WHOOP</li>
        <li><b>No wearable? No problem</b> — full manual mode, phone sensors, everything offline</li>
      </ul>
    </td>
  </tr>
</table>

---

## How it works

<table style="border-collapse: separate; border-spacing: 12px;">
  <tr>
    <td width="33%" align="center" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 16px;">
      <div style="font-size: 28px;">📲</div>
      <h4 style="margin: 8px 0;">Install & connect</h4>
      Grant Health Connect / HealthKit access — or pick <b>No Device</b> and track manually.
    </td>
    <td width="33%" align="center" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 16px;">
      <div style="font-size: 28px;">📊</div>
      <h4 style="margin: 8px 0;">See your numbers</h4>
      Readiness, strain, and biological age computed <b>on-device</b> from your own baselines.
    </td>
    <td width="33%" align="center" style="border: 1px solid var(--color-border-default); border-radius: 16px; padding: 20px 16px;">
      <div style="font-size: 28px;">💬</div>
      <h4 style="margin: 8px 0;">Chat with Coach</h4>
      Log meals, plan your day, ask anything. On-device AI, your own key, or none.
    </td>
  </tr>
</table>

---

## Supported Wearables

Myrri doesn't talk to your wearable directly — it reads the data your wearable's companion app writes to **Apple Health** (iOS) or **Google Health Connect** (Android). If your device can sync to one of those, it works with Myrri. The following brands have a guided in-app setup flow:

| Wearable | Syncs via | Platform |
|---|---|---|
| **Apple Watch** | Apple Health | iOS |
| **Samsung Galaxy Watch** | Samsung Health → Health Connect | Android |
| **Pixel Watch** | Google Fit → Health Connect | Android |
| **Garmin** | Garmin Connect → Health Connect / Apple Health | Android · iOS |
| **Fitbit** | Fitbit app → Health Connect / Apple Health | Android · iOS |
| **Xiaomi (Mi Band & more)** | Mi Fitness → Health Connect / Apple Health | Android · iOS |
| **Amazfit** | Zepp → Health Connect / Apple Health | Android · iOS |
| **Huawei** | HUAWEI Health → Health Connect / Apple Health | Android · iOS |
| **Oura Ring** | Oura → Health Connect / Apple Health | Android · iOS |
| **WHOOP** | WHOOP → Health Connect / Apple Health | Android · iOS |

**Also recognized:** data synced from **Honor**, **Polar**, and **Withings** devices is detected and attributed correctly when it flows through Health Connect / Apple Health, even though those brands don't have a dedicated onboarding walkthrough yet.

> ⚠️ Data availability varies by device and by what your vendor writes to the health store. Myrri shows whatever your companion app syncs; trend lines are more meaningful than single readings.

<sub>Apple, Apple Watch, and Apple Health are trademarks of Apple Inc. Samsung is a trademark of Samsung Electronics Co., Ltd. Google, Pixel, Google Fit, and Health Connect are trademarks of Google LLC. Garmin is a trademark of Garmin Ltd. Fitbit is a trademark of Google LLC. Xiaomi and Mi Fitness are trademarks of Xiaomi Inc. Amazfit and Zepp are trademarks of Zepp Health. Huawei and HUAWEI Health are trademarks of Huawei Technologies Co., Ltd. Oura is a trademark of Ōura Health Oy. WHOOP is a trademark of Whoop, Inc. Honor is a trademark of Honor Device Co., Ltd. Polar is a trademark of Polar Electro Oy. Withings is a trademark of Withings SAS. Myrri is independent and not affiliated with, endorsed by, or sponsored by any of these companies.</sub>

<!-- 📸 Screenshots gallery — drop real app captures here; they convert better than any copy. -->

---

## 📲 Try Myrri today

Myrri is in **closed beta** on Google Play — free, no subscription, no account to sign up for. Getting in takes two steps:

1. **Join the tester group** — request access to the [Myrri Google Group](https://groups.google.com/u/3/g/myrri). Anyone not on the list is locked out of the beta.
2. **Accept the invite & install** — open the beta with the **same Google account**:
   - **From Android:** open [Myrri on Google Play](https://play.google.com/store/apps/details?id=com.myrri.app) → tap **Become a tester**.
   - **From the web:** open [the opt-in page](https://play.google.com/apps/testing/com.myrri.app) → sign in and tap **Become a tester**.

[![Get the beta on Google Play](https://img.shields.io/badge/Get%20the%20beta-Google%20Play-3DDC84?style=for-the-badge&logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.myrri.app)
[![Star on GitHub](https://img.shields.io/github/stars/Pranesh950/health-app?style=social)](https://github.com/Pranesh950/health-app)

> 💡 Use the **same Google account** for the group, the opt-in link, and the Play Store install. When the app asks, grant **Health Connect** permission to see your readiness, strain, and sleep scores.

> ⚠️ **Testers needed:** Play requires **12 opted-in testers for 14 consecutive days** before Myrri can apply for production. Your beta participation is what makes the public release possible — stick around!

**🍎 Apple users:** iOS is in development — [star the repo](https://github.com/Pranesh950/health-app) to hear when TestFlight opens.

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

## 🚀 Quickstart

> **Prereqs:** Node 20+, an Expo dev-client setup, and (for native features) Xcode / Android Studio.

```bash
# 1. Clone & install
git clone https://github.com/Pranesh950/health-app.git && cd health-app
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
- [ ] App Store + Play Store production releases (TestFlight / closed → open beta)
- [ ] i18n (first: Spanish, German, Japanese)

*Want something on the roadmap? [Open an issue](https://github.com/Pranesh950/health-app/issues) — or better, a PR.*

---

## 🤝 Contributing

Myrri is **free software** under the [GNU General Public License v3](LICENSE). You're welcome to read the code, learn from it, fork it, and build on it under the terms of that license.

- **Report a bug or request a feature:** [GitHub Issues](https://github.com/Pranesh950/health-app/issues)
- **Ideas & feedback:** open a [GitHub Discussion](https://github.com/Pranesh950/health-app/discussions) or open an issue above

Contributions — code, design, docs, translations, and nutrition-data fixes — all welcome. Open a PR and we'll review it.

<p align="center">
<img src="https://api.star-history.com/svg?repos=Pranesh950/health-app&type=Date" alt="Myrri star history" width="560"/>
</p>

---

## ⚠️ Honest caveats

- **Biological age** is a wellness heuristic, not a clinical diagnosis — it's clearly labeled in-app.
- **On-device AI** needs a recent high-end phone and a few hundred MB of free storage; it's the "most private" but slowest option.
- **Barcode coverage** (~300k bundled codes) won't have every product — unknown barcodes fall back to manual/AI search.
- Health metrics vary by device; trend lines are more meaningful than single readings.
- This is not medical advice. Myrri is a wellness tracker, not a doctor.

---

## 📄 License

Myrri is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License**, version 3 (or, at your option, any later version), as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](LICENSE) for details. You should have received a copy of the GNU General Public License along with this program; if not, see <https://www.gnu.org/licenses/>.

Every source file in `app/` and `src/` carries the GPLv3 notice in its header.

---

<div align="center">

**Myrri is free forever.** If you like it, ⭐ [the repo](https://github.com/Pranesh950/health-app) and tell a friend — every star helps more people find a health app that doesn't treat them as the product.

[![Star on GitHub](https://img.shields.io/github/stars/Pranesh950/health-app?style=for-the-badge&logo=github&logoColor=white&color=gold)](https://github.com/Pranesh950/health-app)

<sub>Made with ❤️ and an unhealthy amount of HRV data.</sub>

</div>
