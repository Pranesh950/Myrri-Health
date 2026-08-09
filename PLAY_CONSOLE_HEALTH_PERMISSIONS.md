# Health Connect Permission Declarations

Answers for the Google Play Console **Health data permissions** form (Step 2 of 3).
Myrri only **reads** health data — it never writes to Health Connect. All processing happens locally on-device; no health data is uploaded, sold, or shared.

---

## Activity

### Active calories
Used to compute the daily **strain score** (0–100) shown on the home screen and in the Strain detail, and to display today's active-calorie totals and 30-day cumulative trends in the Activity tab. Calories are aggregated on-device from the wearable the user selected during onboarding.

### Distance
Used as an activity metric in the Activity tab (daily and 30-day cumulative distance) and as part of the strain-score calculation when heart-rate data isn't available. Distance is read on-device and shown as trends in the user's preferred unit (km or mi).

### Exercise
Used to show the user's **workout history** (type, duration, calories, distance) in the Activity tab — e.g. which workouts they did and on which days. Workout sessions are read on-device and displayed back to the user as a summary list and daily workout counts.

### Steps
Used to show the daily step count on the home screen and Activity tab, to calculate the **strain score**, and to feed readiness and morning-brief summaries. Step totals are aggregated on-device, preferring the wearable the user chose during onboarding.

### Respiratory rate
Used as an input to the **biological age** estimation and shown alongside other vitals on the home screen and sleep detail screen. The latest reading is read on-device and used in a local, deterministic wellness calculation.

---

## Body measurement

### Body fat
Used as an input to the **biological age** estimation (body-composition component) shown in the Biology tab. Read on-device; only the most recent value is used in a local calculation.

### Height
Used as an input to the **biological age** estimation (body-composition calculations) and can be shown in the user's profile. Read on-device.

### Lean body mass
Used as an input to the **biological age** estimation (body-composition component) shown in the Biology tab. Read on-device; only the most recent value is used in a local calculation.

### Weight
Used as an input to the **biological age** estimation and body-composition trends shown in the Biology tab. Read on-device; the latest value is used in a local calculation.

---

## Sleep

### Sleep
Used to compute the **sleep score** (duration, fragmentation, deep/REM/light stage balance) and the daily **readiness** score, and to show sleep totals and trends on the Sleep detail screen and in the morning brief. Sleep sessions and stage segments are read on-device and scored locally.

---

## Vitals

### VO2 max
Used as a cardiorespiratory input to the **biological age** estimation shown in the Biology tab. Read on-device; the most recent value is used in a local calculation.

### Blood pressure
Used as an input to the **biological age** estimation (cardiovascular component) and displayed in the Biology tab. Read on-device; the most recent reading is used in a local calculation.

### Body temperature
Used as an input to the **biological age** estimation and shown alongside other vitals on the home screen and sleep detail screen. Read on-device; the most recent value is used in a local calculation.

### Heart rate
Used to calculate the **strain score** (elevated-heart-rate component), as a fallback source for estimating heart-rate variability when the wearable writes no dedicated HRV records, and as context for the optional AI coach. Heart-rate samples are read on-device.

### Heart rate variability
Used as a primary input to the daily **readiness** score and the **biological age** estimation shown in the Biology tab. Read on-device; if no HRV records exist, a clearly-labelled estimate is derived locally from heart-rate samples.

### Oxygen saturation
Used as an input to the **biological age** estimation (respiratory component) and shown alongside other vitals on the home screen and sleep detail screen. Read on-device; the most recent value is used in a local calculation.

### Resting heart rate
Used as a primary input to the daily **readiness** score and the **biological age** estimation shown in the Biology tab. Read on-device; the most recent value is used in a local calculation.

---

## Summary

- **Purpose:** wellness insights (readiness, strain, sleep, biological age) from the user's own wearable data.
- **Data flow:** read on-device → processed by local deterministic calculations → displayed to the user. No cloud, no account, no analytics, no selling.
- **Optional AI coach:** when enabled with a cloud provider, only scrubbed chat context (which may include metric values) is sent to the provider the user chose; with on-device AI or AI off, nothing leaves the device.
