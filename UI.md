# UI Screenshot Audit — Fitness/Health Tracking App
For each screenshot below, every component is broken into: **Position** (where it sits on screen), **Shape/Form** (its exact geometry), and **What It Actually Is** (its real function/meaning — not just its appearance).

---

## General Design System (applies to all 4 screens)

- **Typeface:** Rounded geometric sans-serif (visually consistent with SF Pro Rounded). Titles/numbers = heavy/bold weight. Secondary labels = regular weight, gray.
- **Background:** Off-white/light-gray canvas (#F2F2F3-ish); Screen 1 additionally has a pastel gradient wash (blue→cream) behind the hero metric.
- **Cards:** White, fully rounded corners (~20–24px radius), stacked vertically with small gaps — each card is a self-contained data module, not a single continuous page.
- **Placeholder convention:** An em-dash "—" or "-" in place of a number always means that metric has not yet been recorded/synced for the current period, not that the value is literally zero.
- **Bottom navigation bar:** Fixed strip at the very bottom of every screen. Five elements in a horizontal row:
  1. House icon = "Home" tab
  2. Lined-notebook icon = "Journal" tab
  3. Running-figure icon = "Fitness" tab
  4. Heart icon = "Biology" tab
  5. A separate circular "+" button, visually detached from the other four — this is a global quick-add action (log a workout/journal entry/biometric on demand), not a 5th tab
  Whichever of the four tab icons corresponds to the current screen is enclosed in a gray stadium-shaped pill highlight and rendered in solid black — this is the active-tab indicator.

---

## Image 1 — "Biology" Tab: Biological Age Screen

- **Status bar** — *Position:* very top edge. *Shape:* standard iOS bar. *What it is:* system clock (3:27), cellular/Wi-Fi/battery (59%) indicators — not part of the app itself.

- **"•••" button** — *Position:* top-right corner, just under the status bar. *Shape:* solid white circle containing a black horizontal three-dot ellipsis. *What it is:* the page-level overflow menu for this specific screen (e.g., share this metric, customize which biomarkers show).

- **Gradient wash** — *Position:* fills the upper ~40% of the screen, behind the title and gauge. *Shape:* soft, cloud-like mesh blend, no hard edges. *What it is:* purely decorative background treatment; its job is to visually spotlight the hero metric (Biological Age) the way a stage light frames a subject — it is not a data element.

- **"Biological Age"** — *Position:* horizontally centered, directly below the status bar. *Shape:* single line of large, heavy-weight black text. *What it is:* the title identifying the metric on screen — the app's estimate of the user's physiological (not calendar) age.

- **"As of July 13"** — *Position:* centered, directly beneath the title. *Shape:* single line of small gray text. *What it is:* a timestamp telling the user how recent this calculation is — i.e., it was last computed 2 days before the "today" shown elsewhere in the app (July 15), signaling the metric updates periodically rather than in real time.

- **Scattered dot cluster** — *Position:* floating in the empty space directly above the gauge arc, roughly centered. *Shape:* an irregular, loose grouping of small white circles of varying sizes, like a confetti burst or sparkle cloud. *What it is:* a purely ornamental flourish/texture — likely a stock "celebration" or "premium aura" graphic the app places behind locked or headline metrics; it carries no data.

- **Semi-circular gauge (dial)** — *Position:* centered, spanning nearly the full screen width, in the middle third of the screen. *Shape:* an arc shaped like an upside-down U (a speedometer opened toward the bottom), lined with fine perpendicular tick marks along its curve. Rendered in flat light gray (desaturated to signal it's locked). *What it is:* a range scale — it visually plots where the user's biological age falls between a calculated healthy-low and healthy-high bound for their demographic.
  - **"39.5" label** — *Position:* bottom-left terminus of the arc. *What it is:* the lower bound of that range.
  - **"49.5" label** — *Position:* bottom-right terminus of the arc. *What it is:* the upper bound of that range.
  - **Gray filled dot on the arc** — *Position:* sits directly on the curve, left-of-center. *Shape:* small solid circle. *What it is:* the pointer/needle marking exactly where the user's own score (44.5) lands within the 39.5–49.5 range.
  - **"44.5"** — *Position:* centered, directly below the arc. *Shape:* very large bold black numerals. *What it is:* the actual computed biological age, in years — the headline number of the entire screen.

- **"Unlock with Pro" button** — *Position:* centered inside the open space the arc curves around (vertically between the arc and the "44.5" number). *Shape:* white stadium/pill-shaped button with a black padlock glyph to the left of the text. *What it is:* a paywall CTA — tapping it presumably opens a subscription upsell; its presence indicates that while the headline score (44.5) is visible for free, the underlying range/context/trend data is a paid Pro-tier feature.

- **"Other Biomarkers" / "Edit" row** — *Position:* full-width row directly below the gauge. *Shape:* plain text row, no card background. *What it is:* "Other Biomarkers" (bold black, left) is a section label grouping the list below as supporting health metrics distinct from Biological Age; "Edit" (underlined gray, right) is a tappable text-link that opens a screen for adding/removing/reordering which biomarkers appear in that list.

- **Biomarker list — 5 stacked white rounded cards, each following the same left/right layout** (icon+label+status on the left, a mini-visualization on the right):
  1. **Weight** — *Left:* gray circled-X icon, gray "Weight" label, smaller gray "No trends available • — lbs." *Right:* a thin horizontal gray line with a solid dot fixed at its right end and a dashed segment. *What the right element actually is:* an empty trend-graph placeholder — it is standing in for a sparkline chart that would normally plot weight over time, rendered as a flat "nothing recorded yet" track rather than real data.
  2. **HRV Baselines** — same left/right structure as Weight; "No trends available • — ms." *What it is:* placeholder for a heart-rate-variability trend chart, not yet populated.
  3. **RHR Baselines** — *Difference from the others:* rendered in full black/color, not grayed out. *Left:* "No range • 59.7 bpm." *Right:* a small black jagged line ending in a filled dot. *What it actually is:* this is the one card with real data — the jagged line is a genuine miniature sparkline of recent resting-heart-rate readings, and 59.7 bpm is the most recent logged value (not a placeholder).
  4. **Body Fat Percentage** — grayed out, "No trends available • — %," same empty-track placeholder as Weight.
  5. **Lean Body Mass** — grayed out, "No trends available • — lbs," same empty-track placeholder as Weight.

- **Bottom nav** — *Position:* fixed bottom strip. *Active indicator:* the heart icon + "Biology" label sits inside the gray pill and is solid black — confirming this screen belongs to the Biology tab.

---

## Image 2 — "Journal" Tab

- **Status bar** — *Position:* top edge. Carrier name is covered by a solid black redaction bar (user privacy edit, not an app element); cellular/Wi-Fi/battery icons visible as normal.

- **"Insights" button** — *Position:* top-right area, left of the "•••" button. *Shape:* white stadium/pill button containing a small 4-point sparkle glyph followed by bold black text "Insights." *What it is:* a button that triggers an AI-generated summary of the user's journal patterns/correlations — the sparkle icon is the app's visual shorthand for "AI-generated content."

- **"•••" button** — *Position:* top-right corner, right of "Insights." *Shape:* solid white circle, black ellipsis. *What it is:* page-level overflow menu (export journal, edit tracked items, etc.).

- **"Journal"** — *Position:* left-aligned, below the header buttons. *Shape:* large bold black text. *What it is:* the tab title.

- **"Jul 2026"** — *Position:* left-aligned, directly below "Journal." *Shape:* smaller gray text. *What it is:* indicates which month the week-strip below is currently drawing its dates from.

- **Week calendar strip** — *Position:* full-width row below the month label. *Shape:* 7 vertical columns, one per weekday (Sun–Sat), each with a day number and a circular indicator beneath it.
  - **Gold filled circle + white checkmark** (under dates 12, 13, 14, 15) — *What it is:* marks that day's journal as fully completed — every tracked item for that day was logged.
  - **White rounded-rectangle outline around date 15, with the "15" in blue** — *What it is:* this is the "currently viewed day" selector highlight — distinct from the gold completion marker; it shows which single day's entries are displayed in the list beneath, not just that the day is complete.
  - **Empty gray-outlined circles** (under dates 16, 17, 18) — *What it is:* future days with no journal state yet, since they haven't occurred — the app can't mark them complete or incomplete.
  - **Overall function:** this strip is a horizontal date-picker for navigating between days' journal logs, not a passive calendar display.

- **"Yesterday's Entries"** — *Position:* left-aligned section header below the calendar strip. *What it is:* labels the entry list below as belonging to July 14 (the day before the "today" shown elsewhere), likely because the user is reviewing/finalizing the previous day's log the next morning.

- **"Daytime"** — *Position:* small gray label directly under the section header. *What it is:* groups the rows immediately below it into a "things tracked during waking hours" category.

- **Entry rows — white rounded cards, one per tracked habit, each with an emoji icon on the left and a control on the right:**
  - **🍬 Added sugar** — *Right element:* a single pill divided into three equal tap-zones: ✕ / — / ✓. *What it actually is:* a tri-state daily logger (No / Skipped-Unsure / Yes) for whether the user consumed added sugar that day — not a slider or numeric input.
  - **🍷 Alcohol** — *Right element:* gray "– drinks" text next to a small rounded-square button with a right-facing arrow. *What it is:* tapping the arrow opens a separate input screen to record a specific drink count; the dash confirms nothing has been entered yet.
  - **☕ Caffeine** — same arrow-button pattern, "– mg" — opens a screen to log caffeine intake in milligrams.
  - **😊 Daily mood** — same arrow-button pattern, "-" — opens a mood self-rating screen.
  - **💧 Hydration** — same arrow-button pattern, "– fl oz" — opens a water-intake logging screen.
  - **🥑 Keto diet** — ✕/—/✓ tri-state control — logs whether the day's eating followed a ketogenic pattern.
  - **🥖 Low carbs** — ✕/—/✓ tri-state control — logs whether the day was low-carb.

- **"Nighttime" / "Jul 15 - Jul 16"** — *Position:* section header row; "Nighttime" left-aligned, the date range right-aligned on the same line. *What it is:* groups the row below into overnight tracking, and the date range clarifies that "overnight" is being counted from bedtime on the 15th through waking on the 16th (a sleep period spans two calendar dates).

- **📱 Device in bed** — *Right element:* ✕/—/✓ tri-state control (row is visually clipped by the nav bar in this screenshot). *What it is:* a sleep-hygiene logger for whether the phone was kept in the bed/nightstand overnight.

- **Bottom nav** — notebook icon + "Journal" label sits in the gray pill (active state).

---

## Image 3 — "Home" Tab

- **Status bar** — top edge, unredacted, standard icons.

- **Share button** — *Position:* top-right, left of the avatar. *Shape:* white circular button with a black "box + upward arrow" glyph. *What it is:* exports/shares the current day's dashboard (e.g., as an image) outside the app.

- **Profile avatar** — *Position:* top-right corner, rightmost element in the header. *Shape:* solid circle, pale blue fill, black capital letter "P" centered inside — an initial-based placeholder avatar (no photo set). *Small red dot on its edge:* *What it is:* an unread-notification badge, indicating there's a pending alert/message for the user to view, unrelated to the avatar image itself.

- **"Today, July 15 ⌄"** — *Position:* left-aligned, top of the main content area. *Shape:* large bold text with a small downward chevron glyph attached. *What it is:* the chevron makes this a dropdown control — tapping it lets the user switch which day's dashboard is being viewed, not just a static date label.

- **"Active / Until changed" pill** — *Position:* left side, below the date row. *Shape:* stadium pill containing a small solid green circle with a white running-figure silhouette, plus two lines of text stacked (bold "Active" over gray "Until changed"). *What it is:* shows the user's manually-selected activity mode is currently set to "Active" and will remain so until they manually change it — this is a user-set state, not an automatically detected one.

- **"—°F / No location" pill** — *Position:* right side, same row as the Active pill. *Shape:* stadium pill with a gray location-arrow/compass glyph, two lines of gray text. *What it is:* would display local weather temperature, but is showing placeholders because location permissions/services are off — "No location" explains why "—°F" has no value, rather than the temperature being unavailable for another reason.

- **Three-ring card** — *Position:* one wide white card, split into 3 equal vertical sections by thin divider lines.
  - **Strain ring** — *Shape:* circular ring gauge, mostly gray/unfilled with a short orange-yellow arc segment filled at the very top. *Center text:* bold "5%". *What it actually is:* percentage of the user's daily cardiovascular-exertion target reached so far (WHOOP-style Strain is normally scored 0–21, but here re-expressed as % of goal) — 5% signals the day is just beginning activity-wise.
  - **Recovery ring** — *Shape:* fully empty/gray ring, no colored arc at all. *Center text:* gray "-%" placeholder. *What it actually is:* meant to show how prepared the body is for exertion today (0–100%); it's blank here because it likely requires an overnight sleep/HRV sync that hasn't completed yet.
  - **Sleep ring** — *Shape:* ring filled about 60% of the way around its circumference with a blue gradient stroke. *Center text:* bold "60%". *What it actually is:* the percentage of the user's personal sleep-need (not a fixed 8 hours, but their individualized target) that last night's sleep fulfilled.

- **"Stress & Energy" header** — plain bold section label, no card background.

- **Stress card** — *Position:* white card below the header.
  - **Green dot next to "Today's stress"** — *What it is:* a status-color code; green here signals the day's stress level currently reads as low/calm (the dot's color would shift toward yellow/red at higher stress).
  - **"Last updated at 3:27 PM"** — gray subtext showing when the stress reading was last refreshed (matches the phone's current time, implying live/frequent updates).
  - **Chevron top-right** — small gray arrow-in-square; navigates to a detailed stress history screen.
  - **Multi-color ring dial** — *Shape:* circular gauge with its stroke gradient-colored green→yellow→orange→red around the circumference. *What it actually is:* a scale from low to high stress (the color itself encodes the scale, like a thermometer bent into a ring); the gray dash in the center means no single "current" point has been plotted yet.
  - **"Highest / Lowest / Average" row** — three stat slots, each currently a gray dash placeholder; these would show the day's peak, trough, and mean stress scores once data exists.

- **Energy card** — *Position:* separate white card directly below the stress card. *Shape:* green lightning-bolt icon on the left, a horizontal bar made of many thin vertical segments in the middle (green-filled for the first ~75% of segments, plain gray for the rest), bold "75%" text on the right. *What it actually is:* a battery-style meter for the user's current predicted energy level — the segmented-bar style (rather than a smooth fill) mimics a physical battery gauge.

- **"Nutrition" header** — plain bold section label.

- **Foods card** — *Shape:* white card, "Today's foods" bold label with a chevron top-right (opens the full food log).
  - **Locked ring** — *Position:* left side of the card. *Shape:* circular ring gauge rendered entirely in gray with a black padlock icon centered inside. *What it actually is:* this would normally be a macro-completion ring (like the three metric rings above), but it's gated behind a paid tier — the lock icon, not the ring's fill level, is the signal that this is inaccessible rather than simply "0%."
  - **Three macro stats** — *Position:* right side of the card, three vertical groups. *Icons:* a fork/utensil glyph, a wheat-stalk glyph, and a drumstick glyph. *What they actually are:* protein, carbohydrate, and fat gram totals for the day respectively (each reading "0g" because nothing has been logged), each sitting above its own thin dotted circular progress ring (also empty).

- **Blood glucose row** — *Position:* standalone row below the Foods card, not inside its own card. *Shape:* small gray dot icon + label + right-aligned value. *What it is:* a manual or connected glucose-monitor reading slot; "— mg/dl" shows no reading has been recorded/synced.

- **Bottom nav** — house icon + "Home" label sits in the gray pill (active state).

---

## Image 4 — "Fitness" Tab

- **Status bar** — standard, top edge.

- **"+" button** — *Position:* top-right corner, alone (no other header icons on this screen). *Shape:* white circle, black plus sign. *What it is:* opens a manual workout/activity-logging flow specific to the Fitness tab.

- **"Fitness"** — large bold title, left-aligned.

- **"Last 30 days"** — gray subtext directly beneath the title. *What it is:* explicitly scopes every chart and stat on this screen to a rolling 30-day window, not lifetime or calendar-month totals.

- **Calendar heatmap card** — *Position:* white card near the top of the content area.
  - **"Jun 2026" / "Jul 2026" labels with S M T W T F S columns** — *Shape:* two side-by-side mini-calendars, each 7 columns wide. *What it is:* splits the 30-day window across the two months it spans, rather than showing one continuous unbroken grid.
  - **Colored grid cells** — *Shape:* small rounded rectangles, one per calendar day. *Color coding is the actual data:* gray = zero logged activities that day; light green = exactly 1 activity; medium/darker green = 2 activities; blue = 3 or more activities in a single day. The color is standing in for a count, not a category.
  - **Blue outline + dot on one cell (July 15)** — *What it is:* marks "today" specifically, layered on top of whatever activity-count color that cell already has — it's a "which day am I on" marker, separate from the activity data itself.
  - **Legend row** — three dot-and-label pairs ("1 activity," "2 activities," "3+ activities") — the key that defines what each grid color count means.

- **Activity Summary card**:
  - **Icon + "Activity Summary" + chevron** — header row; chevron opens a detailed activity-by-activity log.
  - **"22h 48m"** — *What it is:* total accumulated exercise/active duration summed across all logged activities in the 30-day window — a single aggregate stat, not a daily average.
  - **"Jun 15 – Jul 15, 2026"** — gray subtext confirming the exact 30-day date range being summed.
  - **"↑ 8h 0m"** — *Position:* small stat in the top-right of the card. *What it actually is:* the change versus the prior 30-day period — meaning the user logged 8 hours more active time than in the previous comparable window, not an absolute value.
  - **Dual-line chart** — *Shape:* two overlapping line plots on one set of axes.
    - **Orange-to-red gradient line, ending in a glowing highlighted dot** — *What it actually is:* the running cumulative total of active minutes for the current 30-day period, plotted day by day, which is why it climbs steadily left to right; the glow marks today's cumulative value (22h 48m).
    - **Plain gray line beneath it** — *What it actually is:* the same cumulative-total curve for the previous 30-day period, plotted for direct visual comparison against the current one — this is what the "↑8h 0m" figure is measuring the gap between.
    - **Y-axis "27" / "0"** — the chart's scale ceiling and floor, in hours.
    - **X-axis "Jun 15 / Jun 30 / Jul 15"** — three evenly-spaced date reference points across the window.

- **Strain Performance card**:
  - **Icon + "Strain Performance" + chevron** — header row.
  - **"-59%"** — *Shape:* large bold numerals in blue/purple. *What it actually is:* the user's most recent strain reading expressed as a percentage difference from their target strain — a negative value means they trained less intensely than intended, not that strain itself is negative.
  - **"Below target"** — blue subtext explicitly stating the direction of that gap (as opposed to "above" or "on" target).
  - **Zigzag gradient sparkline** — *Shape:* one continuous jagged line, color-shifting between orange (at its peaks), green (mid-line), and blue/purple (at its valleys) as it moves left to right. *What it actually is:* day-by-day strain performance over recent history, where the color itself encodes whether that day's strain was above, within, or below the target zone — it is not a flat color choice, it's data-driven color mapping.
  - **Shaded light-green horizontal band** — *Position:* runs behind the line, roughly through its middle. *What it is:* visually marks the "on target" strain zone — days whose line passes through this band hit their goal; days whose line dips or spikes outside it (orange peaks, blue valleys) missed it in either direction.
  - **Glowing blue dot at the line's end** — marks today's value, sitting below the green band, visually confirming the "-59% / Below target" stat above it.

- **"Cardio" header** — plain bold section label, marks a new metric category beginning.

- **Cardio Load card** — *Position:* card begins directly below the header; body is cut off by the bottom nav overlay in this screenshot. *Visible elements:* a mountain-range/terrain-line icon and the label "Cardio Load" with a chevron. *What it is (based on visible portion):* a cumulative cardiovascular training-load metric, in the same family as Strain but focused specifically on cardio-type sessions rather than overall exertion.

- **Bottom nav** — running-figure icon + "Fitness" label sits in the gray pill (active state).