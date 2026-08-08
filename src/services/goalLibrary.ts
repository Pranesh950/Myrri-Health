/**
 * Goal knowledge base — the internal "document system" that powers the AI
 * coach. Each goal is a document split into small retrievable chunks so the
 * LLM only ever sees the sections it asks for (basic RAG), instead of being
 * handed the whole library at once.
 *
 * Content is evidence-informed wellness guidance, deliberately non-prescriptive
 * and never a substitute for medical advice. Every chunk keeps that framing.
 */

export interface GoalSection {
  id: string;
  title: string;
  content: string;
  /** Keywords used by the local retrieval scorer. */
  keywords: string[];
}

export interface GoalDoc {
  id: string;
  label: string;
  emoji: string;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  tagline: string;
  /** 2–3 sentence summary used in plan generation and chat. */
  summary: string;
  sections: GoalSection[];
  /** Recommended habits from the journal HABIT_LIBRARY. */
  habits: string[];
  /** Recommended sleep target in hours. */
  sleepHours: number;
  /** Recommended daily step target. */
  stepsPerDay: number;
}

export const GOAL_DOCS: GoalDoc[] = [
  {
    id: "weight_loss",
    label: "Weight loss",
    emoji: "🔥",
    icon: "fire",
    tagline: "Lose fat sustainably without crashing",
    summary:
      "A modest calorie deficit (300–500 kcal below maintenance), high protein, daily movement, and strength work to hold onto muscle. Expect ~0.5–1% of body weight per week; plateaus are normal.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["deficit", "calories", "principle", "sustainable", "plateau", "consistency"],
        content:
          "Weight loss happens from a sustained calorie deficit, but how you create it matters. Aim for a modest deficit of 300–500 kcal below maintenance so you can stick with it and preserve muscle. Prioritise protein at every meal, keep most of your diet to minimally processed foods, and treat activity as a lever you can add on hard days. Progress is not linear — water, hormones, and digestion cause daily noise. Judge trends over 2–4 weeks, not single weigh-ins. The best plan is the one you can follow for months, not the fastest one you can endure for two weeks.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "protein", "calories", "deficit", "steps", "rate"],
        content:
          "Deficit: 300–500 kcal/day below maintenance. Protein: 1.6–2.2 g per kg of body weight per day. Steps: 8,000–10,000/day. Resistance training: 2–3 sessions/week. Sleep: 7.5–8.5 h/night. Sustainable rate: ~0.5–1% of body weight per week (e.g. ~0.5–1 kg/week at 80 kg). Weigh yourself in the morning, same conditions, and watch the weekly average rather than the daily number.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "protein", "fiber", "volume", "food", "diet"],
        content:
          "Protein first: 1.6–2.2 g/kg keeps you full and protects lean mass in a deficit. Fill meals with high-volume, low-calorie foods — vegetables, lean protein, whole fruit — so you eat a satisfying amount of food. Fibre (25–35 g/day) and water help satiety and digestion. You do not need to cut entire food groups; a flexible approach with an 80/20 split between whole foods and treats is far more sustainable than rigid rules. If you log food, aim for a weekly calorie average at your target rather than perfect days.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "resistance", "cardio", "strength", "workout", "steps"],
        content:
          "Resistance training 2–3 times per week is the best insurance against losing muscle while losing weight — prioritise it over extra cardio. Keep reps challenging but leave 1–2 in reserve so you can recover between sessions. Add daily steps (8–10k) as low-stress calorie burn; walking burns fat, spares recovery, and is far easier to sustain than extra hard sessions. One or two cardio sessions a week are a bonus, not a requirement. If you train hard, keep protein high and sleep consistent, or recovery and muscle will suffer.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "stress", "cortisol", "rest"],
        content:
          "Poor sleep undermines weight loss: it raises hunger hormones, increases cravings, and lowers the energy you have to move. Protect 7.5–8.5 h of sleep and a consistent schedule. Chronic stress does the same via cortisol, so build in at least one genuine rest day per week. Cutting calories is itself a stressor — the harder you cut, the more recovery and sleep matter. If energy and mood drop sharply or sleep worsens, loosen the deficit for a week before pushing again.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "tracking", "behavior", "routine"],
        content:
          "Track the behaviours, not just the scale: protein servings, vegetables, water, steps, and processed-food days are all stronger signals than daily weigh-ins. Choose habits you can automate — pre-packed protein, a lunch walk, an evening cut-off for food. Logging food for a week or two is a great audit tool even if you do not log forever. Remember the habit library's goal is completion and streaks; a missed day is data, not failure.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "week", "month"],
        content:
          "Weeks 1–2: a fast initial drop (mostly water) — do not mistake it for the real rate. Weeks 3–8: steady loss at roughly the predicted rate; this is where habit consistency earns results. Months 2–4: losses slow as you get lighter; re-calculate your deficit or add steps rather than cutting food further. Expect plateaus of 2–3 weeks; they are normal and usually followed by another drop. If you have lost 5–10% of your starting weight, reassess — the same deficit is no longer correct.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "medical", "disorder", "pregnant"],
        content:
          "This is general wellness guidance, not medical advice. Very low-calorie diets, rapid loss, or obsessive tracking can be harmful — if eating feels stressful or compulsive, step back and talk to a professional. Women who are pregnant or breastfeeding, people with diabetes or other conditions, and anyone with a history of disordered eating should get individual guidance before changing intake. A safe floor is roughly 1,200 kcal/day for most women and 1,500 for most men; below that, seek supervision.",
      },
    ],
    habits: ["sugar", "veggies", "protein_goal", "water_goal", "walk", "no_processed", "home_cooked", "no_late_food", "meal_prep", "slow_meal", "protein_breakfast", "food_log", "weight_kg"],
    sleepHours: 8,
    stepsPerDay: 10000,
  },
  {
    id: "muscle_gain",
    label: "Muscle gain",
    emoji: "💪",
    icon: "arm-flex",
    tagline: "Add lean size with training + surplus",
    summary:
      "A small calorie surplus, 1.6–2.2 g/kg protein, and progressive overload 3–4 days a week. Expect slow, steady gains; beginners can gain muscle faster than experienced lifters.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["surplus", "progressive", "overload", "principle", "size"],
        content:
          "Muscle growth needs three things: a training stimulus that progresses over time, enough protein, and enough total energy. Eat a modest surplus of 200–300 kcal above maintenance so you gain muscle without excessive fat. Train each muscle group 2–3 times per week with sets taken close to failure (1–3 reps in reserve). Add weight or reps over weeks — progressive overload is the engine of size. Consistency beats intensity: 3 solid sessions a week for a year will outperform a perfect 6-week program.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "protein", "surplus", "calories", "volume"],
        content:
          "Surplus: 200–300 kcal/day above maintenance. Protein: 1.6–2.2 g per kg of body weight per day. Training: 3–4 sessions/week, each muscle group 2–3 times. Volume: 10–20 working sets per muscle group per week. Sleep: 8 h/night — growth hormone and recovery peak in deep sleep. Rate: beginners can gain 1–2 kg of muscle per month; experienced lifters gain a fraction of that.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "protein", "carbs", "surplus", "food"],
        content:
          "Protein is the priority: spread 1.6–2.2 g/kg across 3–5 meals so each meal carries 30–50 g. Carbohydrates fuel training and recovery — around 3–5 g/kg is a reasonable starting point; adjust by how your sessions feel. Fat keeps hormones healthy (0.5–1 g/kg). You do not need protein shakes or supplements to gain muscle; whole foods cover it. The surplus should come mostly from extra meals or shakes around training, not junk — quality calories make it easier to stay lean while bulking.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "progressive", "overload", "sets", "reps", "compound"],
        content:
          "Build around compound lifts (squat, hinge, press, pull) and add isolation for lagging muscles. Use rep ranges 6–12 for most work and take most sets to within 1–3 reps of failure — leaving too much in the tank and going to absolute failure every set are both mistakes. Progress by adding weight, reps, or sets over time. Track your lifts; what gets measured gets loaded. Deload (a lighter week) every 6–10 weeks when fatigue accumulates.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "rest", "growth", "hrv"],
        content:
          "You grow in recovery, not in the gym. Sleep is the single highest-leverage variable for muscle gain — 8 hours is the target, and even one bad night measurably blunts performance and hormone balance. Space sessions so each muscle group rests 48+ hours. Watch for accumulating fatigue: if lifts stall and sleep worsens, add a deload week rather than grinding. Stress management counts too — chronic stress raises cortisol, which competes with the anabolic environment you are trying to create.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "tracking", "protein", "routine"],
        content:
          "Track protein servings and gym sessions — those two habits drive most results. Build a consistent pre-workout routine (water, food, warm-up) and a wind-down routine so training and sleep become automatic. Stretching or mobility work 2–3 times a week protects the joints you are loading. Morning sunlight and daily movement support the recovery environment. The journal's protein, gym, water, and nighttime habits map directly to this goal.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "beginner", "gains"],
        content:
          "Weeks 1–6: rapid strength and skill gains — mostly neural adaptation, not yet visible size. Months 2–6: visible muscle and steady strength progression; the scale moves up, and some fat comes with it (that is normal). Month 6+: gains slow; expect a few kg per year as an experienced lifter. If the scale does not move for 3–4 weeks, add ~200 kcal. If you are gaining more than ~1 kg/month of mostly fat, trim the surplus slightly.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "injury", "medical"],
        content:
          "Progressive overload means loading your body — form matters more than the number on the bar. Learn the movement patterns with light weights before pushing. If a joint hurts sharply or pain lingers after sessions, back off and seek advice; muscle soreness is expected, joint pain is not. If you have a medical condition, are over 40 with risk factors, or have a history of injury, get medical clearance before starting a serious lifting program.",
      },
    ],
    habits: ["protein_goal", "gym", "stretch", "water_goal", "sunlight", "early_bed", "device_bed", "read_book", "protein_breakfast", "weight_kg"],
    sleepHours: 8,
    stepsPerDay: 8000,
  },
  {
    id: "body_recomp",
    label: "Body recomp",
    emoji: "⚖️",
    icon: "scale-balance",
    tagline: "Lose fat and build muscle at once",
    summary:
      "High protein, a slight deficit or maintenance, and consistent resistance training. Results are slower than pure cut or bulk — judge by measurements and photos, not the scale.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["recomp", "maintenance", "protein", "principle", "body"],
        content:
          "Body recomposition — losing fat while gaining muscle — is real but slow, and it works best for beginners, returning lifters, and people with more body fat to lose. Eat at maintenance or a very small deficit (0–300 kcal below), keep protein high (2.0–2.4 g/kg), and train with progressive overload 3–4 days a week. Because the scale often does not move, track waist measurements, photos, and how clothes fit instead. Patience is the entire game: recomp shows results over months, not weeks.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "protein", "calories", "maintenance", "measure"],
        content:
          "Intake: maintenance to a 300 kcal deficit. Protein: 2.0–2.4 g per kg of body weight. Training: 3–4 sessions/week, full-body or split, each muscle group 2–3 times. Steps: 8,000–10,000/day. Sleep: 7.5–8.5 h. Measure monthly: waist circumference, a few key lifts, progress photos. The scale is the least useful metric for this goal — monthly tape-measure change is the truth.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "protein", "food", "deficit", "macros"],
        content:
          "Protein is non-negotiable at 2.0–2.4 g/kg to support muscle synthesis while in a deficit. Distribute it across meals, 30–50 g each. Keep carbohydrates moderate (2–4 g/kg) to fuel training; they matter more on training days. Structure the small deficit around whole, high-volume foods. If you are very lean already, recomp is inefficient — a dedicated surplus or deficit phase will serve you better. A few weeks of logging confirms you are actually near maintenance.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "resistance", "progressive", "overload", "volume"],
        content:
          "Resistance training does the actual recomposition; cardio is secondary. Prioritise 3–4 weekly sessions of compound-focused lifting with progressive overload — sets within 1–3 reps of failure. Higher volume (12–18 working sets per muscle group per week) tends to support recomp better than minimal volume. Keep cardio to steps plus 1–2 easy sessions so it does not cut into recovery. Track your main lifts so you know muscle is being added even when the mirror is slow to agree.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "stress", "rest"],
        content:
          "Recomp asks your body to do two contradictory things, so recovery is load-bearing. Prioritise 7.5–8.5 h of sleep — muscle preservation and fat loss both depend on it. Manage stress deliberately; cortisol pushes the body toward fat storage and muscle breakdown. Take at least one full rest day weekly. Because the calorie situation is tight, small recovery slips cost more than they would in a surplus — treat sleep like part of the program, not optional.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "tracking", "measure", "routine"],
        content:
          "Measure monthly, weigh weekly, and log training every session — those three habits keep recomp honest. Anchor daily habits: protein servings, water, steps, and a wind-down routine. Strength-training days should be non-negotiable in your calendar. Because results are slow, habit streaks and training logs are your motivation fuel; the journal habits (protein, gym, water, walk, sleep hygiene) map directly to this goal.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "month", "waist"],
        content:
          "Months 1–2: little visible change; strength improves and waist may inch down. Months 3–6: the key window — clothes fit differently and lifts climb while weight stays similar. Month 6+: you may need to pick a direction (lean bulk or cut) as recomp efficiency drops the leaner you get. If nothing changes after 8 weeks, reduce the deficit slightly, raise protein, or add training volume. If you are losing weight fast (more than 1%/week), you are recomping less and cutting more.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "medical", "disordered"],
        content:
          "Recomp is a slow process and can be frustrating; guard against obsessive weighing or body checking. If body image or eating becomes stressful, pause tracking and talk to someone. Individuals who are underweight, pregnant, or managing medical conditions should not self-prescribe body-composition goals. This guidance is general wellness information, not a treatment plan.",
      },
    ],
    habits: ["protein_goal", "gym", "food_log", "stretch", "water_goal", "walk", "sunlight", "early_bed", "device_bed", "weight_kg", "waist_cm", "slow_meal"],
    sleepHours: 8,
    stepsPerDay: 9000,
  },
  {
    id: "strength",
    label: "Strength",
    emoji: "🏋️",
    icon: "dumbbell",
    tagline: "Get stronger on the big lifts",
    summary:
      "Heavy compound lifting with progressive overload, 3–4 focused sessions a week, enough protein, and sleep. Form and recovery are what let strength keep climbing.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["strength", "progressive", "overload", "compound", "principle"],
        content:
          "Strength is a skill plus a physical capacity: you improve by repeatedly lifting heavy-ish weights with good form and adding load over time. Focus on the compound patterns — squat, hinge (deadlift), horizontal press, vertical press, and pull — because they transfer everywhere. Train 3–4 sessions per week, keep intensity high (mostly 3–6 reps at 75–90% of your max), and manage fatigue with adequate rest between hard sets (2–5 minutes). Technique is the ceiling: learn the patterns, then chase the numbers.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "reps", "sets", "intensity", "frequency"],
        content:
          "Frequency: 3–4 sessions/week. Intensity: 75–90% of your 1-rep max for main lifts. Reps: 3–6 for strength, with some 6–10 work for volume. Sets per muscle group: 8–12/week. Rest: 2–5 minutes between heavy sets. Protein: 1.6–2.2 g/kg. Sleep: 7.5–9 h. Rate: beginners can add meaningful weight weekly; intermediate lifters progress monthly. Warm up thoroughly — a specific warm-up is part of the program, not optional.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "protein", "fuel", "energy", "carbs"],
        content:
          "Strength training is fuelled by carbohydrate and built with protein. Aim for 1.6–2.2 g/kg protein daily, with a portion shortly after training optional but not magic. Carbs (3–5 g/kg) ensure you can actually perform — a depleted lifter cannot express strength. Eat at maintenance or a small surplus; cutting calories while chasing new PRs is working against yourself. Caffeine before training helps performance but keep it out of the evening. Hydration matters more than most supplements; a 2% bodyweight fluid loss measurably drops strength.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "program", "volume", "deload", "progression"],
        content:
          "Follow a structured program with a clear progression scheme — linear progression if you are newer, periodised blocks if you are not. Main lifts first (heaviest), accessories after. Push heavy sets close to failure but rarely to absolute failure on big lifts. Track every session so progression is deliberate. Deload — a week at ~60–70% volume and intensity — every 6–10 weeks keeps you on the road. If your form breaks down, that is your signal to stop the set, not grind it.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "rest", "joint", "hrv"],
        content:
          "Heavy training is a stressor that needs repayment. Sleep 7.5–9 h — deep sleep is when strength adaptations consolidate. Space heavy sessions so each muscle group gets 48+ hours. Joints are the usual failure point: if joints hurt (not muscles), modify range or load. Manage total stress; a hard week at work plus a hard week in the gym is a recipe for regression. Use readiness (HRV, sleep) as a guide — some days require a lighter session, and that is programming, not weakness.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "tracking", "routine", "mobility"],
        content:
          "Log every workout — the training log is the single most valuable habit for strength. Show up on schedule even when motivation dips; motivation follows action. Add mobility/stretching 2–3 times a week for the hips, shoulders, and ankles you are loading. Sleep hygiene habits (wind-down, no devices in bed, consistent bedtime) pay off directly in the gym. Protein servings and water round out the set of habits that make strength training sustainable.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "pr", "beginner", "intermediate"],
        content:
          "Weeks 1–8: fast strength jumps as skill improves (neural gains) — not yet much size. Months 2–6: steady PRs; intermediate lifters add smaller increments. After ~6–12 months, gains slow to a crawl — that is normal and where programming matters most. Plateaus are part of the process: add a deload, fix a weak point, or eat/sleep more before changing the program drastically. Enjoy the process — the pursuit of strength is a long game.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "injury", "form", "medical"],
        content:
          "Lifting heavy carries injury risk, and ego is the most common cause. Never sacrifice form to move more weight; stop the set at breakdown. Warm up properly and build volume gradually. If you are new, get coached — in person or via reputable video — on the big lifts. Anyone with back, joint, or cardiovascular conditions should get medical clearance first. Acute sharp pain, numbness, or pain that lingers days after a session means stop and consult a professional.",
      },
    ],
    habits: ["gym", "stretch", "protein_goal", "water_goal", "early_bed", "device_bed", "sunlight", "read_book"],
    sleepHours: 8,
    stepsPerDay: 8000,
  },
  {
    id: "faster_running",
    label: "Faster running",
    emoji: "🏃",
    icon: "run",
    tagline: "Run faster with smarter training",
    summary:
      "Consistent weekly mileage, mostly easy (80/20 rule), with 1–2 quality sessions: tempo, intervals, strides. Strength work and sleep prevent the injuries that stall progress.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["running", "80/20", "easy", "tempo", "interval", "principle"],
        content:
          "Faster running is built mostly on easy running. The 80/20 rule — about 80% of weekly mileage easy, 20% hard — lets you accumulate volume without breaking down. Run consistently 3–4 days a week; consistency beats heroic single sessions. Add speed through a weekly quality session (tempo or intervals) once you have a mileage base. Form follows effort: stay relaxed, keep cadence quick, and let speed come from volume plus targeted sessions rather than hard efforts every day.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "mileage", "volume", "pace", "tempo"],
        content:
          "Frequency: 3–4 runs/week. Easy pace: conversational (Zone 2). One quality session/week: tempo (20–40 min at threshold) or intervals (e.g. 6×3 min at 5K pace). Weekly mileage: increase no more than ~10% per week. Strides: 4–6 × 20 s after easy runs, 2–3×/week. Strength: 2 short sessions/week. Sleep: 7.5–9 h. Rate: expect noticeable pace gains in 6–12 weeks when volume is consistent.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "fuel", "carbs", "iron", "hydration"],
        content:
          "Run on fuel: carbohydrates are the primary fuel for quality sessions — a carb-based meal 2–3 h before hard workouts and carbs after to replenish. Daily carbs 3–5 g/kg, more on heavy training days. Protein 1.6 g/kg for repair. Iron deserves attention for runners, especially women — if you feel chronically heavy-legged or tired, a blood test with a doctor beats self-supplementing. Hydration before, during, and after; longer sessions may need electrolytes.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "tempo", "intervals", "long run", "easy"],
        content:
          "Structure: one long easy run, one tempo or threshold session, one interval session, and easy days in between. Do not do two hard sessions back to back. The long run builds endurance; the tempo raises your lactate threshold; intervals raise VO2 max; strides sharpen turnover. On easy days, run slow enough to talk — most runners run their easy days too fast, which is the #1 mistake. Strength work (2×/week: squats, lunges, calf work, core) prevents injuries and directly improves run economy.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "injury", "rest", "shin"],
        content:
          "Running is high-impact and repetitive — recovery is what prevents the injury cycle. Sleep 7.5–9 h; runners need more sleep than they think, and it is where adaptations land. Take full rest days and easy weeks (every 3–4 weeks, cut volume by ~20–30%). Watch early warning signs: shin pain, heel pain, knee niggles — address them immediately with load reduction, not mileage increases. Warming up (easy jog + drills) and cooling down reduce injury odds meaningfully.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "routine", "tracking", "strength"],
        content:
          "Anchor the non-negotiables: scheduled runs, a pre-run routine (warm-up drills), and a post-run stretch or mobility session. Track mileage and easy-pace honesty in your log. Make strength sessions a fixed habit — they are the insurance policy for running. Sleep hygiene habits (consistent bedtime, no devices in bed) protect the recovery that running depends on. Hydration and a post-run protein/carb snack close the daily loop.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "pace", "timeline", "race"],
        content:
          "Weeks 1–4: mileage feels heavy; easy pace may feel embarrassingly slow — that is correct. Weeks 5–12: aerobic base builds; the same easy pace starts feeling easier, and race pace drops. Months 3–6: quality sessions pay off — tempo and interval paces improve measurably. Beyond: gains require structured blocks (base → build → peak) and careful recovery. If progress stalls, the usual culprits are easy days too fast, missing strength work, or insufficient sleep.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "injury", "medical", "overuse"],
        content:
          "Running injuries are almost always overuse — respect the 10% mileage rule and stop at sharp pain. Chest pain, dizziness, or fainting during running requires stopping and medical attention immediately. Anyone with heart conditions, or who is new to exercise after a long layoff, should check with a doctor first. Shoe wear, surface changes, and rapid mileage jumps are common injury triggers. This guidance is general wellness information, not coaching for a diagnosed condition.",
      },
    ],
    habits: ["walk", "run_km", "zone2", "gym", "stretch", "water_goal", "sunlight", "early_bed", "device_bed", "no_late_food"],
    sleepHours: 8.5,
    stepsPerDay: 10000,
  },
  {
    id: "endurance",
    label: "Endurance",
    emoji: "🚴",
    icon: "bike-fast",
    tagline: "Go further and last longer",
    summary:
      "Build an aerobic base with lots of easy (Zone 2) volume, increase weekly load gradually, fuel properly, and recover hard. Consistency across weeks beats intensity spikes.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["endurance", "zone 2", "base", "volume", "aerobic", "principle"],
        content:
          "Endurance is built on aerobic base: large volumes of easy work at a conversational intensity (Zone 2) that trains your body to burn fat and clear waste efficiently. The majority of your weekly volume should feel easy; the magic is in the accumulated hours, not the intensity. Add a modest amount of tempo/threshold work once your base is established. Consistency is everything — 4–5 easy sessions a week for months will transform your capacity, while sporadic hard sessions will not.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "volume", "zone", "frequency", "hours"],
        content:
          "Frequency: 4–5 sessions/week. Intensity: 70–80% of weekly volume in Zone 2 (conversational). One weekly threshold/tempo session. Weekly volume increase: ~10% or less. Long session: one per week, gradually extended. Sleep: 8–9 h. Fuel: carbs before long sessions (2–4 g/kg) and after. Rate: aerobic capacity improves over 8–16 weeks of consistent volume; heart rate at the same pace should drop over time.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "fuel", "carbs", "hydration", "electrolyte"],
        content:
          "Carbs are the performance fuel for endurance: aim 3–6 g/kg daily with more on heavy days, and a carb-rich meal before long sessions. During sessions over ~90 minutes, practice fueling (30–60 g carbs/hour) — the gut trains too. After long sessions, eat within the recovery window: carbs plus protein (about 3:1). Hydration with electrolytes matters for sessions over an hour, especially in heat. Practice your race-day nutrition during training; never experiment on the day.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "long", "threshold", "base", "structure"],
        content:
          "Structure the week around one progressively longer session plus a few easy days and one quality day. Keep the long session easy — the temptation to push it is the classic error; the point is time on your feet/at your pace. The quality day can be threshold intervals once a base exists (e.g. 3×10 min at comfortably hard). Every 3–4 weeks, cut volume ~20–30% for an easy week. If your easy pace heart rate creeps up over consecutive sessions, you are under-recovered.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "rest", "hrv", "overtraining"],
        content:
          "Endurance athletes chronically under-sleep, and it is the most common limiter. Sleep 8–9 h — cardiovascular adaptations consolidate overnight. Take the easy days seriously easy; they are recovery, not filler. Watch readiness signals (HRV, resting heart rate, mood): a rising resting HR with falling HRV across days is a warning to back off. Full rest weeks every 4–6 weeks prevent the chronic fatigue spiral. Heat and hard weeks raise recovery needs — plan for them.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "routine", "tracking", "mobility"],
        content:
          "Consistency habits matter most: scheduled sessions, gear ready the night before, and a post-session refuel routine. Track weekly volume so increases stay controlled and visible. Add 10–15 minutes of mobility or stretching most days — volume magnifies imbalances. Sleep hygiene habits protect the recovery your volume depends on. A daily walk or low-intensity movement on off days aids circulation without costing recovery.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "heart rate", "pace"],
        content:
          "Weeks 1–4: the base feels easy and boring; resist the urge to speed up. Weeks 5–12: the same pace produces a lower heart rate, and recovery between sessions improves. Months 3–6: long sessions get genuinely comfortable and threshold pace rises. Month 6+: structured blocks (base, build, peak) replace constant accumulation. The classic mistake is adding intensity before the base is real — when in doubt, do another easy week.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "overtraining", "medical", "heart"],
        content:
          "Volume-based training makes overuse injuries and overtraining the main risks. Ramp volume gradually, keep easy days easy, and rest when readiness drops. Chest pain, unexplained breathlessness, or fainting requires stopping and urgent medical attention. People with heart conditions or who are restarting after long inactivity should get medical clearance. This is general wellness guidance — not a substitute for coaching or medical care.",
      },
    ],
    habits: ["walk", "run_km", "zone2", "gym", "stretch", "water_goal", "sunlight", "early_bed", "device_bed", "no_late_food"],
    sleepHours: 8.5,
    stepsPerDay: 10000,
  },
  {
    id: "injury_recovery",
    label: "Injury recovery",
    emoji: "🩹",
    icon: "medical-bag",
    tagline: "Return stronger, safely",
    summary:
      "Follow your clinician's plan, protect pain-free movement, prioritise sleep and nutrition, and return to activity gradually. The app supports recovery — it does not diagnose or treat injuries.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["recovery", "principles", "pain-free", "relative rest", "injury"],
        content:
          "The first rule of injury recovery: follow the plan set by your doctor, physio, or other clinician — this app supports recovery, it does not diagnose or treat. Work within a pain-free range: movement that does not worsen pain promotes healing, while full rest can delay it. Reduce the irritating activity to a tolerable level rather than eliminating movement entirely. Progress by small, graded steps — if pain increases meaningfully after an activity, scale back. Recovery is rarely linear; expect good weeks and bad weeks.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "sleep", "protein", "mobility", "gradual"],
        content:
          "Sleep: 8–9 h — the #1 healing lever, actively prioritise it. Protein: 1.6–2.0 g/kg to support tissue repair. Daily pain-free movement: short walks, gentle mobility, as tolerated. Rehab: follow your clinician's prescribed exercises exactly and consistently. Return to sport: gradual — e.g. 50% volume and intensity in week one of return, building over 2–4 weeks. Caffeine and alcohol: keep low; they interfere with sleep and repair.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "protein", "anti-inflammatory", "repair", "omega"],
        content:
          "Tissue repair runs on protein and micronutrients: aim 1.6–2.0 g/kg daily, spread across meals. Whole foods with plenty of vegetables, fruit, and omega-3s (fish, flax, walnuts) support an appropriate inflammatory response. Stay well hydrated. Avoid crash dieting during recovery — an energy deficit slows healing. If appetite is suppressed, prioritise protein and calorie-dense whole foods. Supplements (vitamin D, creatine) may help some people but are no substitute for food, sleep, and your clinician's plan.",
      },
      {
        id: "training",
        title: "Training guidance",
        keywords: ["training", "rehab", "mobility", "return", "gradual"],
        content:
          "Treat your rehab exercises as training — they are the most important sessions in your week. Do them consistently, at the prescribed frequency, and log them. Cross-train what you can without aggravating the injury: swimming, cycling, or upper-body work can maintain fitness while the injured area heals. When cleared to return, ramp gradually: start at reduced volume and intensity, monitor for 24–48 h after each increase, and only then progress. Pain that worsens, swells, or persists overnight is a signal to stop and consult.",
      },
      {
        id: "recovery",
        title: "Sleep & recovery",
        keywords: ["sleep", "recovery", "stress", "healing", "rest"],
        content:
          "Sleep is the most powerful recovery tool you have — growth hormone and tissue repair peak in deep sleep. Protect 8–9 h and a consistent schedule even if you are less active. Manage stress: high stress slows healing through elevated cortisol. Keep alcohol minimal — it fragments sleep and suppresses repair. Hydration supports joint health and recovery. Remember that healing takes time: tendons and ligaments heal in weeks to months, and the mental game of recovery is part of the process.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "rehab", "tracking", "routine", "sleep hygiene"],
        content:
          "Build a daily rehab habit — same time, logged, non-negotiable. Anchor sleep hygiene: consistent bedtime, wind-down routine, no devices in bed, cool room. Track pain on a simple 0–10 scale alongside activity so you can spot patterns and bring data to your clinician. Hydration and protein servings are supportive habits. Meditation or breathwork helps with the frustration and stress that accompany injury. The journal's nighttime and stretching habits map directly to recovery.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "healing", "return"],
        content:
          "Healing timelines vary widely by tissue and severity — muscle strains measure in weeks, tendons and bone in months. Expect a non-linear path: improvement, plateaus, occasional setbacks. Early phase: pain reduction and restored range of motion. Middle: strength rebuilding under the clinician's guidance. Later: return-to-sport with gradual loading. If progress stalls for several weeks, revisit your clinician — 'just give it time' has limits. Celebrate functional milestones (pain-free stairs, a full night's sleep) as much as medical ones.",
      },
      {
        id: "cautions",
        title: "Caution — please read",
        keywords: ["caution", "safety", "medical", "emergency", "diagnosis"],
        content:
          "This content is not medical advice and does not diagnose, treat, or replace your clinician. Seek urgent care for: severe pain, deformity, numbness, inability to bear weight, chest pain, or shortness of breath. Do not ignore pain that wakes you at night or persists beyond expectations. Never push through sharp or worsening pain in the belief it will 'strengthen' the area. If you have not been assessed, get assessed before following any exercise guidance. Your coach's role is encouragement and habit support, not diagnosis.",
      },
    ],
    habits: ["stretch", "rehab", "breathwork", "sleep_routine", "early_bed", "device_bed", "water_goal", "meditate", "read_book", "cool_room"],
    sleepHours: 8.5,
    stepsPerDay: 6000,
  },
  {
    id: "better_sleep",
    label: "Better sleep",
    emoji: "😴",
    icon: "weather-night",
    tagline: "Fall asleep faster, wake up rested",
    summary:
      "Consistent schedule, a wind-down routine, a cool dark room, caffeine cut-off, and morning light. Sleep is the foundation — everything else in the app improves when sleep does.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["sleep", "schedule", "routine", "principle", "consistency"],
        content:
          "The single most effective change for better sleep is a consistent sleep schedule — same bedtime and wake time every day, including weekends. Your body clock anchors to the wake time more than the bedtime, so a fixed wake time is the keystone. Pair that with a 30–60 minute wind-down routine that signals 'downshifting': dim lights, screens off or filtered, quiet activity. Sleep quality is built all day: morning light, daytime movement, and caffeine timing matter as much as what you do at night.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "hours", "bedtime", "caffeine", "routine"],
        content:
          "Duration: 7–9 h/night for adults (target by age and feel). Consistent schedule: same wake time ±30 min daily. Caffeine cut-off: 8–10 h before bedtime (e.g. none after ~2 pm). Wind-down: 30–60 min before bed. Bedroom: cool (16–19°C), dark, quiet. Devices: out of the bedroom or in night mode. Morning light: 10–30 min outdoors within an hour of waking. Alcohol: avoid within 3 h of bed — it fragments sleep.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "caffeine", "alcohol", "food", "meal timing"],
        content:
          "Caffeine is the biggest dietary sleep disruptor — it has a half-life of ~5–6 hours, so a 4 pm coffee still affects midnight sleep for many people. Set a personal cut-off 8–10 h before bed. Alcohol helps you fall asleep but fragments the second half of the night — limit it and avoid it within 3 h of bed. Avoid large meals within 2–3 h of bed; a light, protein-rich snack is fine if hungry. Magnesium-rich foods and herbal teas are mild supports, not cures. Hydrate during the day but taper in the evening.",
      },
      {
        id: "training",
        title: "Movement & daytime",
        keywords: ["training", "exercise", "movement", "light", "nap"],
        content:
          "Regular daytime movement — especially morning outdoor light and daily exercise — is one of the strongest sleep promoters. Exercise improves sleep depth and onset, but intense workouts within ~2 h of bed can be stimulating for some people; find your window. Morning sunlight (10–30 min within an hour of waking) sets your circadian clock and improves both sleep onset and mood. Keep naps short (≤20–30 min) and before mid-afternoon so they do not steal night-time sleep pressure.",
      },
      {
        id: "recovery",
        title: "Sleep environment & stress",
        keywords: ["sleep", "environment", "stress", "breathing", "room"],
        content:
          "Make the bedroom a sleep-only zone: cool (16–19°C), dark (blackout curtains or an eye mask), and quiet (earplugs or white noise if needed). A good mattress and pillow do real work. If your mind races at night, offload thoughts with a brief 'brain dump' on paper an hour before bed, or try slow breathing (e.g. 4-7-8 or physiological sighs). If you cannot fall asleep after ~20–30 minutes, get up and do something calm in dim light rather than lying there frustrated.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "routine", "tracking", "wind-down", "devices"],
        content:
          "Stack the proven habits: a fixed wake time, a consistent bedtime, a 30-minute wind-down, no devices in bed, a cool dark room, and a caffeine cut-off. Build them one at a time — trying to change everything at once fails. Track sleep alongside the habits in your journal to see what actually moves your numbers. Evening routines (shower, reading, stretching) become cues your body learns. Morning light anchors the whole system.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "insomnia", "weeks"],
        content:
          "The first 3–7 days: falling asleep and waking times shift toward your new schedule. Weeks 2–4: sleep quality metrics (deep sleep, fewer wake-ups, morning restedness) typically improve if caffeine and wind-down habits hold. Months 1–3: the schedule becomes automatic and recovery scores across the app rise. Some nights will still be poor — one bad night is normal and does not undo the trend. If severe insomnia persists beyond a few weeks, see a clinician; sleep issues are treatable, and the app is not a replacement for care.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "medical", "insomnia", "apnea"],
        content:
          "Persistent insomnia, loud snoring with gasping, or excessive daytime sleepiness may indicate a treatable condition (e.g. sleep apnea) — see a clinician rather than self-managing indefinitely. Do not combine sleep aids with alcohol. This guidance is general wellness information, not a treatment plan. If you work shifts, apply the core habits (fixed wake time, light, caffeine cut-off) as best you can around your schedule and consider consulting a sleep specialist.",
      },
    ],
    habits: ["early_bed", "device_bed", "no_caffeine_pm", "sleep_routine", "cool_room", "blue_blockers", "sunlight", "meditate", "brain_dump", "sleep_hours", "digital_sunset", "consistent_wake", "no_snooze"],
    sleepHours: 8,
    stepsPerDay: 7000,
  },
  {
    id: "stress_hrv",
    label: "Stress & HRV",
    emoji: "🧘",
    icon: "heart-pulse",
    tagline: "Calm the nervous system, raise HRV",
    summary:
      "HRV rises with consistent recovery habits: breathwork and meditation daily, easy cardio, morning light, less alcohol, and solid sleep. Judge by trends over weeks, not single readings.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["hrv", "stress", "nervous system", "principle", "trend"],
        content:
          "Heart rate variability (HRV) reflects how quickly your nervous system can switch between stress and recovery states — higher is generally better, and trends matter far more than single readings. HRV improves with consistent, boring habits rather than dramatic fixes: daily breathwork or meditation, easy aerobic movement, morning light, good sleep, and less alcohol. Judge your HRV over 7–30 day rolling averages; day-to-day spikes and dips are noise. The goal is a calmer baseline and faster recovery after stress, not chasing a number.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "breathwork", "meditation", "zone 2", "alcohol"],
        content:
          "Breathwork/meditation: 5–15 min daily (e.g. physiological sighs, 4-7-8, or a guided session). Zone 2 cardio: 3×30–45 min/week. Morning light: 10–30 min within an hour of waking. Alcohol: the least, the better — even one drink lowers HRV overnight for many people. Caffeine: moderate, none after early afternoon. Sleep: 7.5–8.5 h. Rate: expect HRV trend improvement over 2–6 weeks of consistency. Single-day dips after hard training or stress are normal.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "alcohol", "caffeine", "hydrate", "food"],
        content:
          "Alcohol is the most consistent acute HRV suppressor — it raises resting heart rate and fragments sleep the same night. If you drink, notice the pattern: many people see their overnight HRV drop 10–20% after even moderate drinking. Caffeine raises sympathetic tone; keep it moderate and out of the afternoon. Hydration and regular meals stabilise the nervous system; skipping meals amplifies stress responses. Omega-3s and whole-food nutrition are supportive, not dramatic. What you remove (alcohol, late caffeine) usually moves HRV more than what you add.",
      },
      {
        id: "training",
        title: "Movement guidance",
        keywords: ["training", "zone 2", "cardio", "exercise", "gentle"],
        content:
          "Gentle, consistent aerobic work is the best movement medicine for HRV: 3 sessions of 30–45 minutes of Zone 2 (conversational) effort per week. It builds parasympathetic tone without the recovery cost of hard training. Hard training itself lowers HRV transiently — that is expected, and the rebound is the signal of fitness. On high-stress days, prefer walks and easy movement over intense sessions; training through high stress entrenches the stress pattern. Yoga, stretching, and mobility count as recovery-oriented movement.",
      },
      {
        id: "recovery",
        title: "Recovery & stress management",
        keywords: ["recovery", "sleep", "breathwork", "stress", "rest"],
        content:
          "Sleep is the foundation of HRV — protect 7.5–8.5 h with a consistent schedule. Build a daily nervous-system practice: physiological sighs (double inhale, long exhale) are evidence-backed and can be done anywhere; a 10-minute guided body scan before bed helps many people. Reduce digital noise in the evening. Plan genuine rest — a full day off from training and obligations at least weekly. When your readiness score reads low, treat it as data: easier day, earlier night.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "meditate", "routine", "tracking", "morning"],
        content:
          "Anchor the core habits: morning sunlight, a daily breathwork or meditation slot, a caffeine cut-off, and a wind-down routine. Log them — the journal's meditation, sunlight, stretch, and nighttime habits correlate directly with recovery in the app's insights. Reduce alcohol systematically and watch your own data tell the story. Keep a consistent sleep schedule; HRV rewards regularity above almost everything. Track trends, not single days.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "trend", "weeks"],
        content:
          "Weeks 1–2: breathwork may feel awkward and HRV may not move — normal. Weeks 3–6: with consistency, the 7-day HRV average typically trends up and mornings feel calmer; recovery scores improve. Months 1–3: the nervous system response to stress shifts — you recover faster after hard days or rough nights. Plateaus are normal; HRV has a genetic ceiling. If HRV trends down for weeks despite good habits, look at sleep, alcohol, overtraining, or stressors — and consider a clinician.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "medical", "anxiety", "diagnosis"],
        content:
          "HRV is a wellness signal, not a medical diagnostic. Do not use it to diagnose conditions, and do not panic at single low readings — watch trends. If you experience persistent anxiety, panic attacks, or physical symptoms that worry you, speak with a clinician; breathwork and lifestyle are supports, not treatments. This guidance is general wellness information. If meditation practices worsen symptoms for you, adjust or pause them — not every practice suits every person.",
      },
    ],
    habits: ["meditate", "breathwork", "brain_dump", "sunlight", "stretch", "early_bed", "device_bed", "no_caffeine_pm", "read_book", "cool_room", "gratitude", "no_phone_first_hour", "stress_checkin"],
    sleepHours: 8,
    stepsPerDay: 7000,
  },
  {
    id: "general_health",
    label: "General health",
    emoji: "🌿",
    icon: "leaf",
    tagline: "Move daily, sleep well, live longer",
    summary:
      "The fundamentals: daily movement, quality sleep, whole-food eating, social connection, stress management, and routine prevention. Small consistent habits compound into long-term health.",
    sections: [
      {
        id: "principles",
        title: "Core principles",
        keywords: ["health", "principles", "movement", "foundation", "longevity"],
        content:
          "Long-term health is built on a few unglamorous fundamentals: move every day, sleep 7–9 hours, eat mostly whole foods, stay connected to people, manage stress, and show up for prevention (checkups, screenings). The best interventions are the ones that compound — a daily walk, a consistent bedtime, regular meals — not heroic short-term programs. Health span (years of good health) beats lifespan as a goal. You do not need to be an athlete; you need to be consistent.",
      },
      {
        id: "targets",
        title: "Targets at a glance",
        keywords: ["target", "steps", "sleep", "fiber", "strength"],
        content:
          "Movement: 7,000–10,000 steps/day plus 2 strength sessions/week. Sleep: 7–9 h. Fruits & vegetables: 5+ servings/day. Fibre: 25–35 g/day. Strength: 2×/week (it protects muscle and bone with age). Social connection: regular contact with people who matter. Alcohol: within low-risk limits (<2 drinks/day, with alcohol-free days). Prevention: routine checkups, dental, and age-appropriate screenings.",
      },
      {
        id: "nutrition",
        title: "Nutrition guidance",
        keywords: ["nutrition", "whole food", "fiber", "protein", "diet"],
        content:
          "Eat mostly whole and minimally processed foods: plenty of vegetables and fruit, whole grains, legumes, nuts, fish and lean protein. Prioritise fibre (25–35 g/day) — most people are short, and it supports gut, heart, and metabolic health. Protein at 1.2–1.6 g/kg helps preserve muscle as you age. Hydrate consistently. You do not need to be perfect: the research consistently favours an 80/20 pattern — mostly nourishing food, with room for what you enjoy — sustained for years.",
      },
      {
        id: "training",
        title: "Movement guidance",
        keywords: ["training", "movement", "steps", "strength", "walk"],
        content:
          "Make daily movement automatic: walk (7–10k steps), take stairs, garden, play — non-exercise movement counts. Add 2 strength sessions per week; after age 30 we lose ~3–8% of muscle per decade without it, and strength training is the best countermeasure. Moderate cardio (brisk walks, cycling, swimming) 150+ minutes/week covers heart health. Keep it enjoyable — the exercise you repeat is the exercise that works. Consistency across decades beats intensity in bursts.",
      },
      {
        id: "recovery",
        title: "Sleep & stress",
        keywords: ["sleep", "stress", "recovery", "connection", "rest"],
        content:
          "Sleep 7–9 h with a consistent schedule — it is the foundation that makes every other habit possible. Manage stress actively with daily practices (walks, breathwork, hobbies) rather than letting it accumulate. Social connection is a genuine health input: regular contact with friends and family is associated with better long-term outcomes across measures. Take rest days. If you are consistently tired, stressed, or anxious, treat that as data and seek support — mental health is health.",
      },
      {
        id: "habits",
        title: "Habits to build",
        keywords: ["habit", "routine", "tracking", "consistency"],
        content:
          "Build a small set of daily non-negotiables: a walk, vegetables at a meal, water, a wind-down routine, and one meaningful social contact. Track them — completion streaks reinforce the identity of 'the kind of person who shows up'. Add habits one at a time and give each a few weeks before adding the next. Morning sunlight, reading, and meditation are high-value add-ons. The journal's habit library is built exactly for this: choose a handful and let consistency do the rest.",
      },
      {
        id: "milestones",
        title: "What to expect",
        keywords: ["milestone", "expect", "timeline", "compound", "months"],
        content:
          "Weeks 1–4: habits feel effortful; energy may shift as sleep and movement improve. Months 1–3: daily routine becomes automatic; sleep quality, mood, and energy stabilise. Months 3–12: biometrics (resting HR, HRV, weight trend, blood pressure if tracked) typically move in the right direction. Years: the compounding shows up as maintained function — the real payoff. There is no finish line; the goal is a system you can maintain through life's chaos, not a perfect month.",
      },
      {
        id: "cautions",
        title: "Caution",
        keywords: ["caution", "safety", "medical", "screening", "checkup"],
        content:
          "General wellness habits reduce risk — they do not replace medical care. Attend routine checkups and age-appropriate screenings, and see a clinician for new or concerning symptoms rather than assuming a lifestyle fix will handle them. If you have a chronic condition, coordinate lifestyle changes with your care team. This guidance is general health information, not personal medical advice.",
      },
    ],
    habits: ["walk", "veggies", "fiber_goal", "food_log", "water_goal", "sunlight", "read_book", "social", "meditate", "early_bed", "gratitude", "morning_routine", "no_phone_first_hour"],
    sleepHours: 8,
    stepsPerDay: 9000,
  },
];

export function getGoalById(id: string): GoalDoc | undefined {
  return GOAL_DOCS.find((goal) => goal.id === id);
}

/** Compact summary for the LLM — small enough to never overload context. */
export function getGoalSummary(goalId: string): string | null {
  const goal = getGoalById(goalId);
  if (!goal) return null;
  return `${goal.id} — ${goal.label}: ${goal.summary} Sleep target ${goal.sleepHours}h, ${goal.stepsPerDay.toLocaleString()} steps/day.`;
}

export function getAllGoalsForPicker(): Array<Pick<GoalDoc, "id" | "label" | "emoji" | "icon" | "tagline">> {
  return GOAL_DOCS.map(({ id, label, emoji, icon, tagline }) => ({ id, label, emoji, icon, tagline }));
}

// ── Retrieval (basic RAG) ─────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at", "by",
  "from", "as", "is", "are", "was", "be", "it", "this", "that", "do", "does", "can",
  "should", "how", "what", "my", "me", "i", "you", "your", "we", "us", "about", "get",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export interface GoalChunkHit {
  goalId: string;
  goalLabel: string;
  goalEmoji: string;
  sectionId: string;
  title: string;
  snippet: string;
  score: number;
}

/**
 * Keyword retrieval across all goal documents. Returns the top matching
 * chunks (id + title + snippet) so the LLM can pick what to expand — this is
 * what keeps the library comprehensive without overloading the model.
 */
export function searchGoalChunks(query: string, maxResults = 4): GoalChunkHit[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const hits: GoalChunkHit[] = [];

  for (const goal of GOAL_DOCS) {
    const goalTokens = new Set([
      ...tokenize(goal.id),
      ...tokenize(goal.label),
      ...tokenize(goal.tagline),
    ]);

    for (const section of goal.sections) {
      let score = 0;
      const sectionTokens = new Set([
        ...section.keywords,
        ...tokenize(section.title),
      ]);

      for (const token of tokens) {
        if (sectionTokens.has(token)) score += 3;
        else if (goalTokens.has(token)) score += 1;
      }

      // Boost the numeric "targets" chunk when the query mentions numbers/goals.
      if (section.id === "targets" && /goal|target|calorie|protein|sleep|steps/.test(query.toLowerCase())) {
        score += 1;
      }

      if (score > 0) {
        hits.push({
          goalId: goal.id,
          goalLabel: goal.label,
          goalEmoji: goal.emoji,
          sectionId: section.id,
          title: section.title,
          snippet: section.content.slice(0, 160) + (section.content.length > 160 ? "…" : ""),
          score,
        });
      }
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/** Expand selected chunks (by goalId + sectionId) into bounded full text. */
export function getGoalChunkText(
  goalId: string,
  sectionIds: string[],
  maxChars = 1800
): string {
  const goal = getGoalById(goalId);
  if (!goal) return "";
  const sections = goal.sections.filter((section) => sectionIds.includes(section.id));
  if (!sections.length) return "";

  const parts = sections.map(
    (section) => `## ${goal.label} — ${section.title}\n${section.content}`
  );

  let output = "";
  for (const part of parts) {
    if (output.length + part.length + 1 > maxChars) break;
    output += (output ? "\n\n" : "") + part;
  }
  return output;
}


