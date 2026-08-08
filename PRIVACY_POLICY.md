# Myrri Privacy Policy

**Last updated:** August 8, 2026

This Privacy Policy explains what information the Myrri app ("Myrri", "we", "our", or "the app") collects, how it is used and stored, and the choices you have. Myrri is a wellness app that turns your Apple Health / Google Health Connect data into readiness, strain, and biological-age insights, habit tracking, food logging, and an optional AI coach.

**The short version:** Myrri is designed to be **local-first and private by default**. There is no account, no signup, no backend server, and no analytics or advertising SDKs. Your health data, journal, meals, and plans are stored on your own device. The only time information leaves your device is when you *choose* to use a cloud AI provider, or when the app downloads an on-device AI model.

---

## 1. No account. No servers. No analytics.

- **No account is required.** Myrri does not create user accounts, profiles on a server, or identifiers that link you to a cloud service.
- **No servers, no backend.** All of your data lives in local storage on your device.
- **No analytics, no telemetry, no crash reporting to third parties.** The app contains no analytics, advertising, or ad-ID SDKs and does not track your behavior across apps.
- **No data selling.** We never sell, rent, or trade your personal or health information. We have no commercial interest in your data whatsoever.

---

## 2. Information we process

### 2.1 Information you provide directly

- **Profile information** you enter during onboarding (e.g., age, sex, height, weight, activity goals).
- **Journal and habit entries** — mood, meals, water, workouts, sleep notes, and the 40+ optional habits you choose to track.
- **Food logs** — meals you log manually, by barcode, or with the AI food chat.
- **Coach plan preferences** and goals.

### 2.2 Health and fitness data (with your permission)

If you choose to connect a wearable or health platform, Myrri reads health data **directly on your device** through your operating system's health framework:

- **On iOS:** Apple HealthKit — steps, heart rate, resting heart rate, heart-rate variability, respiratory rate, sleep analysis, active energy, distance, weight, height, blood pressure, blood oxygen, body temperature, VO₂ max, body fat, lean body mass, and workouts.
- **On Android:** Google Health Connect — steps, heart rate, resting heart rate, HRV (RMSSD), respiratory rate, sleep sessions and stages, active calories, distance, weight, height, blood pressure, oxygen saturation, body temperature, VO₂ max, body fat, lean body mass, and exercise sessions.

Myrri **reads** this data only — it does not currently write to HealthKit or Health Connect. Every metric is requested with an explicit, granular permission prompt from your operating system, and you can grant or revoke each one at any time in your device's Health / Health Connect settings.

### 2.3 AI coach conversations

The AI coach is **entirely optional** and off by default until you enable it. When enabled, you choose exactly how it runs (see Section 4). Chat messages may include health or food context so the coach can answer accurately.

### 2.4 Camera

The camera is used **only** for scanning food barcodes while the barcode screen is open. Barcode decoding happens on-device; the camera feed is never recorded, stored, or transmitted, and no images leave your device.

### 2.5 Notifications

If you enable the morning brief, Myrri schedules **local notifications** on your device. Notification content is generated from your own data and is never sent to any server.

### 2.6 Nutrition database

Myrri bundles an offline nutrition database (USDA/OpenNutrition, 300,000+ foods and barcodes) into the app as a local SQLite file. Looking up foods and scanning barcodes works entirely offline.

---

## 3. Where your data lives

All data is stored **on your device** in one of the following places:

| Storage | What it holds |
|---|---|
| **AsyncStorage** (local app storage) | Profile, journal & habit entries, meals, coach plan, readiness/insights history, settings, unit preferences |
| **SQLite (local database)** | Your meal/journal records and the bundled offline nutrition database |
| **Secure storage (Keychain / Android Keystore)** | Bring-your-own-key (BYOK) API keys — encrypted at rest, readable only on this device while it is unlocked, and never migrated to another device |
| **App documents folder** | Downloaded on-device AI models (see Section 4.2) |

There is **no cloud copy** of any of this data. Deleting the app from your device deletes its local data.

---

## 4. AI features and when data leaves your device

Myrri offers several AI options, and you choose which one (if any) to use. Data leaves your device **only** in the cases described below.

### 4.1 Bring Your Own Key (BYOK) — cloud AI

If you enable BYOK, you connect **your own** API key from a provider you choose: **OpenAI, Anthropic (Claude), Google Gemini, or OpenRouter**.

- **Your API key** is stored encrypted in your device's secure storage (Keychain / Android Keystore), is used only to talk to the provider you chose, and is never transmitted anywhere else. We cannot see, store, or monetize it, and we earn no commission from any provider.
- **Your chat messages and context** are sent **directly from your device to that provider's API** to get a response. This is a third-party data transfer — please review the privacy policies of your chosen provider (see Section 7).
- **Best-effort scrubbing:** before messages are sent to a cloud provider, Myrri attempts to strip common direct identifiers — email addresses, phone numbers, street addresses, URLs, IP addresses, and ID-like strings. This scrubbing is **best-effort and not a guarantee of anonymity**; it cannot detect every possible identifier, so please do not share sensitive personal information in chat.
- Messages are **not stored** by Myrri after the conversation; each request is sent to the provider and its response is displayed locally.

### 4.2 On-device AI (no data leaves the phone)

Myrri supports fully on-device AI:

- **Llama (via llama.rn):** a small language model that you can download (from Hugging Face) and run entirely on your phone. The download is a static model file (~400–700 MB); the model *itself* is public software, and your prompts and data never leave your device during use.
- **Gemini Nano (Android):** Google's on-device model, running locally on supported devices.
- **Apple Foundation Model (iOS):** Apple's built-in on-device model.

With on-device AI, **your prompts never leave the phone.** No network connection is required for inference.

### 4.3 No AI

Every other feature — readiness, strain, biological age, journaling, habit tracking, food logging, barcode scanning, and the morning brief — works **completely offline with no AI and no network**, using deterministic calculations on your device.

---

## 5. Data retention and your choices

- **Local retention:** Data is kept on your device until you delete it or uninstall the app. You can delete individual journal entries, meals, and logs from within the app at any time.
- **Deleting the app** removes all locally stored data (including any downloaded AI models and your BYOK key). Data in HealthKit / Health Connect remains under your control in your operating system's health settings.
- **Revoking health access:** You can stop Myrri from reading any health metric at any time in Apple Health (iOS) or the Health Connect app (Android). Myrri respects these settings on every read.
- **Turning off AI:** You can switch AI off (or switch between cloud and on-device modes) at any time in Settings; with AI off, nothing is sent to any provider.
- **Deleting your BYOK key:** Removing your API key in Settings deletes it from secure storage.

---

## 6. Security

- **Encryption at rest for secrets:** BYOK API keys are stored with your operating system's encrypted secure storage and are tied to this device (and, on iOS, to the unlocked state of this device).
- **OS sandboxing:** The rest of your data is stored in the app's private, OS-sandboxed storage area, which other apps cannot access.
- **Transport security:** Any data sent to a cloud AI provider travels over encrypted HTTPS.
- **No cloud infrastructure:** Because there is no backend, there is no server-side database to be breached, and no server logs that could contain your data.

---

## 7. Third-party services

Myrri itself has no analytics, advertising, or data brokers. The only third-party services involved are ones you opt into or that your operating system provides:

| Service | Purpose | Data shared |
|---|---|---|
| **Apple HealthKit** (iOS) | Read your health data on-device | Health metrics you authorize |
| **Google Health Connect** (Android) | Read your health data on-device | Health metrics you authorize |
| **OpenAI / Anthropic / Google Gemini / OpenRouter** (only if you enable BYOK) | Answer your AI coach questions | Your (scrubbed) chat messages, to the provider you choose |
| **Hugging Face** (only if you download a Llama model) | Download an on-device AI model file | The model file is public; no personal data |
| **Apple / Google app stores** | App distribution | As governed by each store's policies |

Each cloud AI provider has its own privacy policy, and when you use BYOK you are directing your data to that provider under its terms. We recommend reviewing the provider's policy before enabling BYOK.

---

## 8. Children's privacy

Myrri is not directed to children under 13 (or the applicable minimum age in your jurisdiction), and we do not knowingly collect personal information from children. If you believe a child has provided personal data through the app, contact us and we will help you remove it.

---

## 9. Health disclaimer

Myrri is a wellness tracker, not a medical device or a provider of medical advice. Readiness, strain, and biological-age scores are heuristic estimates for informational purposes only and are not diagnoses.

---

## 10. Changes to this policy

We may update this Privacy Policy as the app evolves (for example, if Myrri ever adds cloud sync or Health Connect write support, this policy will be updated before any such feature ships, and significant changes will be highlighted in the app). The "Last updated" date at the top reflects the most recent revision.

---

## 11. Contact

If you have questions about this Privacy Policy or your data, contact us at:

- **Email:** [pranesh.shivaraj.k@gmail.com](mailto:pranesh.shivaraj.k@gmail.com)

---

*This policy reflects how Myrri actually works today: local-first storage, no servers, no analytics, no ads, and AI that runs where you choose. We build privacy into the product rather than bolt it on.*
