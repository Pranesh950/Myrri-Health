# Project Specification: Local Physiological Optimization Dashboard

## Objective
Build a lightweight, on-device health and performance dashboard focused on parsing physiological metrics into actionable daily readiness and load scores. Avoid external cloud APIs, AI coaching modules, or calorie/macronutrient logging. All data must reside and calculate locally on-device.

## UI/UX & Thoughtful Design Philosophy
The interface must feel like a premium, distraction-free utility. Avoid heavy, cartoonish styles. Follow these strict design tokens and rules:

### 1. Visual Theme & Color System
*   **Palette:** True dark mode background (`#0A0A0A` or absolute black) to save battery life during night use. Use monochromatic slate tints (`#1A1A1A` for cards, `#2E2E2E` for borders) to establish clear layout depth.
*   **Accents:** Use exactly four precise accent colors to signify states. Good health/recovery uses an organic, muted sage green. High stress/strain uses a clean amber/orange. Avoid neon gradients.
*   **Typography:** Strict sans-serif system font scale (SF Pro on iOS, Roboto/Inter on Android). Use explicit semantic font weights (Bold for metrics, Medium for labels, Regular for descriptions). Never use more than two font sizes on a single card component.

### 2. Micro-Interactions & Motion
*   **Feedback:** Every touch target must provide instant, low-latency haptic feedback (light taps for selections, distinct double-tap pulses for finishing workouts).
*   **Transitions:** Use fluid, linear interpolations for tab switching. When expanding a metrics card, the container should smoothly scale in place rather than cutting to a new screen.
*   **Progress Indicators:** Charts must draw with a subtle, split-second fade-in animation upon opening a tab to feel responsive, not jarring.

### 3. Progressive Disclosure & Context
*   **Initial View:** Keep the primary dashboard screen completely clean. Display only the macro scores (e.g., "78% Recovery") and a minimal trend arrow.
*   **Secondary View:** Hide deep technical data (like individual rMSSD raw data points, sleep stage segment calculations, or historic volume charts) inside an explicit "Tap to Expand" or sheet presentation layout. This prevents data overload.

## Core Interface Structure (4 Main Tabs)

### 1. Readiness Dashboard (Tab 1: Recovery)
*   **Purpose:** Calculate a morning readiness score (0% to 100%) indicating the body's capacity to take on physical or mental stress.
*   **Data Inputs:** Heart Rate Variability (HRV rMSSD), Resting Heart Rate (RHR), and Sleep Quality metrics from the local database.
*   **Logic:** Establish a 21-day rolling baseline for HRV and RHR. Score the current day based on deviations from this personal baseline (higher HRV + lower RHR = higher score).
*   **UI Layout:** A bold, centered numerical score with a subtle, solid-colored accent perimeter ring. Directly below, show a 3-word design summary sentence (e.g., "System is primed").

### 2. Exertion Meter (Tab 2: Cardio Strain)
*   **Purpose:** Track real-time and cumulative cardiovascular load throughout a 24-hour cycle.
*   **Data Inputs:** Real-time heart rate, max heart rate, and custom heart rate zones (Zones 1-5).
*   **Logic:** Compute a daily logarithmic cardio load index (e.g., scale of 0 to 21) derived from time spent in elevated heart rate zones relative to the user's maximum heart rate capacity.
*   **UI Layout:** Use an elegant, horizontal stacked bar chart showing time spent across the 5 heart rate zones. Overlay a clean vertical marker indicator to denote the current day's cumulative load relative to the recommended target.

### 3. Sleep Analysis (Tab 3: Sleep & Circadian Rhythms)
*   **Purpose:** Provide deep context into sleep efficiency, latency, and biological clock alignment.
*   **Data Inputs:** Sleep stages (REM, Deep, Light, Awake Times), Respiratory Rate, and Skin Temperature tracking.
*   **Logic:** Compute a composite Sleep Quality score out of 100 based on total duration, time spent in restorative deep/REM stages, and consistency of sleep schedules.
*   **UI Layout:** A clean, horizontal timeline bar broken into solid, color-coded blocks for each sleep stage. Tapping any block opens a small tooltip showing the exact duration of that specific phase.

### 4. Resistance Tracker (Tab 4: Muscular Volume & Strength Builder)
*   **Purpose:** A localized training module for tracking muscular volume, sets, repetitions, and progression metrics over time.
*   **Data Inputs:** User-logged weight, structural exercise catalog selections, set counts, and repetitions.
*   **Logic:** Calculate Total Training Volume (Sets × Reps × Weight) per individual exercise and muscle group. Aggregate these metrics locally to generate progressive overload charts.
*   **UI Layout:** A dual-column layout with an uncluttered exercise dictionary on the left and a dedicated log panel on the right. Input fields must feature large, easily accessible plus/minus adjustments optimized for sweaty fingers mid-workout.

## Technical Constraints for Agent Loop
*   **No AI / No Cloud LLMs:** Do not write any code connecting to conversational text engines or remote analytics networks.
*   **No Food/Calorie Engines:** Omit all nutritional macro trackers, photo-based meal analyzers, or calorie logs.
*   **Local UI Unique Identity:** Rely heavily on asymmetrical grid structures, minimalist spacing, and micro-typography. Avoid multi-layered circular gradient ring designs or floating bubbles that look too identical to cloud-centric competitors.
*   **Tech Stack:** [Insert your stack here, e.g., React Native with SQLite / Swift with HealthKit / Flutter].
