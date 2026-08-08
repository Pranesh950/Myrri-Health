import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

export interface FoodItem {
  /** OpenNutrition's stable string identifier. Kept under the existing API name for UI compatibility. */
  fdcId: string;
  description: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealEntry {
  id: string;
  date: string;
  timestamp: string;
  fdcId: string;
  foodName: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

const MEALS_PREFIX = "meal_log_";
const DATABASE_NAME = "opennutrition-2025.1.db";
const OPENNUTRITION_DATABASE_ASSET = require("../data/opennutrition-2025.1.db");

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === "web") {
    throw new Error("The OpenNutrition database is available in the native app only.");
  }
  if (!databasePromise) {
    databasePromise = (async () => {
      // Remove the obsolete JSON catalog cache left by previous app versions.
      await clearLegacyFoodDatabaseCache();
      // expo-sqlite imports the prebuilt asset into its native SQLite directory.
      // forceOverwrite is intentionally false so the database is copied only once per install.
      await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, {
        assetId: OPENNUTRITION_DATABASE_ASSET,
      });
      let database = await SQLite.openDatabaseAsync(DATABASE_NAME);

      // Databases copied from older app versions predate the barcodes table.
      // Re-import the bundled asset so barcode scanning works without a manual
      // reinstall. The food database holds no user data, so replacing it is safe.
      try {
        const row = await database.getFirstAsync<{ n: number }>(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'barcodes'"
        );
        if (!row || row.n === 0) {
          database.closeSync();
          await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, {
            assetId: OPENNUTRITION_DATABASE_ASSET,
            forceOverwrite: true,
          });
          database = await SQLite.openDatabaseAsync(DATABASE_NAME);
        }
      } catch (error) {
        console.warn("[FoodDB] Barcode database upgrade failed:", error);
        try {
          database.closeSync();
        } catch {}
        database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      }
      return database;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

interface FoodRow {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

function mapFood(row: FoodRow): FoodItem {
  return {
    fdcId: row.id,
    description: row.name,
    category: row.category,
    calories: Math.max(0, Number(row.calories) || 0),
    protein: Math.max(0, Number(row.protein) || 0),
    carbs: Math.max(0, Number(row.carbs) || 0),
    fat: Math.max(0, Number(row.fat) || 0),
    fiber: Math.max(0, Number(row.fiber) || 0),
  };
}

function escapeFtsQuery(query: string): string {
  return normalizeQuery(query)
    .split(" ")
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, "")}"*`)
    .join(" AND ");
}

export async function searchFood(query: string): Promise<FoodItem[]> {
  const normalized = normalizeQuery(query);
  const match = escapeFtsQuery(normalized);
  if (!match) return [];
  const database = await getDatabase();

  try {
    const rows = await database.getAllAsync<FoodRow>(
      `SELECT f.id, f.name, f.category, f.calories, f.protein, f.carbs, f.fat, f.fiber
       FROM foods_fts AS search
       JOIN foods AS f ON f.id = search.id
       WHERE foods_fts MATCH ?
       ORDER BY bm25(foods_fts), f.name
       LIMIT 8`,
      [match]
    );
    return rows.map(mapFood);
  } catch (error) {
    // Some platform SQLite builds may omit FTS5. Keep offline search usable.
    console.warn("[FoodDB] FTS search unavailable, using indexed-name fallback", error);
    const like = `%${normalized.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    const rows = await database.getAllAsync<FoodRow>(
      `SELECT id, name, category, calories, protein, carbs, fat, fiber
       FROM foods
       WHERE name LIKE ? ESCAPE "\\"
       ORDER BY name
       LIMIT 8`,
      [like]
    );
    return rows.map(mapFood);
  }
}

export async function getFoodByFdcId(fdcId: string | number): Promise<FoodItem | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<FoodRow>(
    "SELECT id, name, category, calories, protein, carbs, fat, fiber FROM foods WHERE id = ?",
    [String(fdcId)]
  );
  return row ? mapFood(row) : null;
}

/**
 * Looks up a food by its EAN-13 / UPC barcode. Branded and grocery foods in
 * the OpenNutrition dataset carry an ean_13 value; everyday foods do not.
 * Returns null when the code is unknown or the bundled database predates the
 * barcodes table.
 */
export async function searchFoodByBarcode(ean: string): Promise<FoodItem | null> {
  const code = String(ean || "").trim();
  const digits = code.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const database = await getDatabase();
  try {
    const row = await database.getFirstAsync<FoodRow>(
      `SELECT f.id, f.name, f.category, f.calories, f.protein, f.carbs, f.fat, f.fiber
       FROM barcodes AS b
       JOIN foods AS f ON f.id = b.food_id
       WHERE b.ean_13 = ?
       LIMIT 1`,
      [code]
    );
    if (row) return mapFood(row);
    // Some scanners return UPC-A (12 digits) while the dataset stores the
    // equivalent EAN-13 (leading zero), and some codes carry a trailing "X"
    // check-digit marker. Try the normalized variants before giving up.
    const variants = Array.from(
      new Set<string>(
        [
          digits,
          digits.length === 12 ? `0${digits}` : null,
          digits.length === 13 && digits.startsWith("0") ? digits.slice(1) : null,
        ].filter((v): v is string => !!v)
      )
    );
    if (variants.length > 0) {
      const placeholders = variants.map(() => "?").join(", ");
      const row2 = await database.getFirstAsync<FoodRow>(
        `SELECT f.id, f.name, f.category, f.calories, f.protein, f.carbs, f.fat, f.fiber
         FROM barcodes AS b
         JOIN foods AS f ON f.id = b.food_id
         WHERE REPLACE(b.ean_13, 'X', '') IN (${placeholders})
         LIMIT 1`,
        variants
      );
      if (row2) return mapFood(row2);
    }
    return null;
  } catch (error) {
    // Databases built before the barcodes table (or platforms without it)
    // degrade gracefully to "no match".
    console.warn("[FoodDB] Barcode lookup unavailable:", error);
    return null;
  }
}

/** Removes the obsolete JSON catalog cache from installs that used the previous database. */
export async function clearLegacyFoodDatabaseCache(): Promise<void> {
  await AsyncStorage.removeItem("food_database_cache");
}

export function getFoodDatabaseAttribution(): string {
  return "Nutrition data from OpenNutrition (https://www.opennutrition.app), licensed under ODbL/DbCL.";
}

export const OPENNUTRITION_ATTRIBUTION = getFoodDatabaseAttribution();

export async function logMeal(entry: MealEntry): Promise<void> {
  const key = `${MEALS_PREFIX}${entry.date}`;
  let meals: MealEntry[] = [];
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) meals = JSON.parse(raw);
  } catch {}
  meals.push(entry);
  await AsyncStorage.setItem(key, JSON.stringify(meals));
}

export async function getMeals(date: string): Promise<MealEntry[]> {
  const key = `${MEALS_PREFIX}${date}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const meals: MealEntry[] = JSON.parse(raw);
      // Older app versions stored numeric USDA IDs. Preserve those logs as
      // strings so existing entries remain editable after the ID migration.
      return meals.map((meal) => ({ ...meal, fdcId: String(meal.fdcId) }));
    }
  } catch {}
  return [];
}

export async function deleteMeal(date: string, mealId: string): Promise<void> {
  const key = `${MEALS_PREFIX}${date}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const meals: MealEntry[] = JSON.parse(raw);
      const filtered = meals.filter((m) => m.id !== mealId);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {}
}

export async function updateMeal(date: string, mealId: string, updates: Partial<Pick<MealEntry, "servingGrams" | "foodName" | "calories" | "protein" | "carbs" | "fat" | "fiber">>): Promise<MealEntry | null> {
  const key = `${MEALS_PREFIX}${date}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const meals: MealEntry[] = JSON.parse(raw);
      const idx = meals.findIndex((m) => m.id === mealId);
      if (idx === -1) return null;
      meals[idx] = { ...meals[idx], ...updates };
      await AsyncStorage.setItem(key, JSON.stringify(meals));
      return meals[idx];
    }
  } catch {}
  return null;
}

export async function getMealDatesWithData(): Promise<string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys
    .filter((k) => k.startsWith(MEALS_PREFIX))
    .map((k) => k.replace(MEALS_PREFIX, ""));
}

export interface ServingUnit {
  label: string;
  gramsPerUnit: number;
  plural: string;
}

export function getServingUnits(description: string): ServingUnit[] {
  const d = description.toLowerCase();

  // Universal measures — every food gets these, in addition to the specific
  // units below.
  const units: ServingUnit[] = [
    { label: "g", gramsPerUnit: 1, plural: "g" },
    { label: "kg", gramsPerUnit: 1000, plural: "kg" },
    { label: "oz", gramsPerUnit: 28, plural: "oz" },
    { label: "lb", gramsPerUnit: 454, plural: "lb" },
    { label: "serving", gramsPerUnit: 150, plural: "servings" },
    { label: "portion", gramsPerUnit: 200, plural: "portions" },
  ];

  const isLiquid =
    /milk|yogurt|yoghurt|juice|drink|soup|smoothie|shake|water|soda|coffee|tea|wine|beer|cider|broth|stock|cream|kefir|kombucha|sports drink|protein shake|energy drink/.test(d);

  if (isLiquid) {
    // Volume measures — for water-based drinks grams ≈ millilitres.
    units.push({ label: "ml", gramsPerUnit: 1, plural: "ml" });
    units.push({ label: "fl oz", gramsPerUnit: 30, plural: "fl oz" });
    units.push({ label: "cup", gramsPerUnit: 240, plural: "cups" });
    units.push({ label: "glass", gramsPerUnit: 240, plural: "glasses" });
    units.push({ label: "bottle", gramsPerUnit: 355, plural: "bottles" });
    units.push({ label: "can", gramsPerUnit: 330, plural: "cans" });
    if (/(beer|cider)/.test(d)) {
      units.push({ label: "pint", gramsPerUnit: 473, plural: "pints" });
    }
  } else {
    units.push({ label: "handful", gramsPerUnit: 40, plural: "handfuls" });
  }

  // Spoons & scoops for spreads, oils, sauces, flours, and powders.
  if (/(oil|butter|mayo|mayonnaise|dressing|honey|syrup|sauce|ketchup|mustard|jam|jelly|peanut butter|nut butter|flour|sugar|spice|cocoa|protein powder|whey|hummus|pesto|tahini|salsa|vinegar|soy sauce|curry paste)/.test(d)) {
    units.push({ label: "tsp", gramsPerUnit: 5, plural: "tsp" });
    units.push({ label: "tbsp", gramsPerUnit: 14, plural: "tbsp" });
  }
  if (/(protein|whey|powder)/.test(d) && !d.includes("ice cream")) {
    units.push({ label: "scoop", gramsPerUnit: 30, plural: "scoops" });
  }

  // Dry goods measured by the cup.
  if (/(flour|sugar|oats|oatmeal|porridge|rice|pasta|noodle|cereal|granola|quinoa|muesli|popcorn|couscous|berries|grapes|blueberries|strawberries|raspberries)/.test(d)) {
    units.push({ label: "cup", gramsPerUnit: 150, plural: "cups" });
  }

  // Canned foods and bowl-sized meals.
  if (/(can|canned|tuna|beans|soup|chili|stew|spaghetti|ravioli|tinned|sardine|corn|tomato sauce)/.test(d)) {
    units.push({ label: "can", gramsPerUnit: 330, plural: "cans" });
  }
  if (/(soup|chili|stew|oatmeal|porridge|cereal|rice|pasta|noodle|ramen|salad|ice cream|curry|dal|lentil|yogurt|stir.fry)/.test(d)) {
    units.push({ label: "bowl", gramsPerUnit: 300, plural: "bowls" });
  }

  // Bars, bites, and bakes.
  if (/(bar|candy bar|protein bar|granola bar|chocolate|cookie|brownie|muffin|snack|biscuit|donut)/.test(d)) {
    units.push({ label: "bar", gramsPerUnit: 60, plural: "bars" });
  }
  if (/(cookie|brownie|muffin|biscuit|donut)/.test(d)) {
    units.push({ label: "piece", gramsPerUnit: 60, plural: "pieces" });
  }
  if (/(pancake|waffle|crepe)/.test(d)) {
    units.push({ label: "piece", gramsPerUnit: 40, plural: "pieces" });
  }
  if (/(bagel|roll|bun|croissant|pretzel|danish)/.test(d)) {
    units.push({ label: "piece", gramsPerUnit: 100, plural: "pieces" });
  }

  // Sliced foods.
  if (/(bread|toast|tortilla|pita|naan|wrap|pizza|baguette|sourdough|rye)/.test(d)) {
    units.push({ label: "slice", gramsPerUnit: 30, plural: "slices" });
  }
  if (/(cheese|salami|bacon|ham|deli|prosciutto|pepperoni|turkey breast|chicken breast)/.test(d)) {
    units.push({ label: "slice", gramsPerUnit: 20, plural: "slices" });
  }
  if (d.includes("cheese")) {
    units.push({ label: "wedge", gramsPerUnit: 30, plural: "wedges" });
    units.push({ label: "block", gramsPerUnit: 200, plural: "blocks" });
  }
  if (d.includes("butter")) {
    units.push({ label: "stick", gramsPerUnit: 113, plural: "sticks" });
  }
  if (d.includes("ice cream")) {
    units.push({ label: "scoop", gramsPerUnit: 70, plural: "scoops" });
  }

  // Whole fruits & veg — kept before generic "piece" rules so the specific
  // weight wins when a food matches both (e.g. "orange muffin").
  const isJuice = d.includes("juice");
  if (!isJuice) {
    if (d.includes("egg")) units.push({ label: "egg", gramsPerUnit: 50, plural: "eggs" });
    if (d.includes("apple")) units.push({ label: "apple", gramsPerUnit: 180, plural: "apples" });
    if (d.includes("banana")) units.push({ label: "banana", gramsPerUnit: 120, plural: "bananas" });
    if (d.includes("orange") || d.includes("clementine") || d.includes("tangerine"))
      units.push({ label: "orange", gramsPerUnit: 150, plural: "oranges" });
    if (d.includes("avocado")) units.push({ label: "avocado", gramsPerUnit: 150, plural: "avocados" });
    if (d.includes("peach") || d.includes("nectarine")) units.push({ label: "peach", gramsPerUnit: 150, plural: "peaches" });
    if (d.includes("pear")) units.push({ label: "pear", gramsPerUnit: 180, plural: "pears" });
    if (d.includes("mango")) units.push({ label: "mango", gramsPerUnit: 200, plural: "mangoes" });
    if (d.includes("kiwi")) units.push({ label: "kiwi", gramsPerUnit: 75, plural: "kiwis" });
    if (d.includes("lemon") || d.includes("lime")) units.push({ label: "piece", gramsPerUnit: 60, plural: "pieces" });
    if (d.includes("strawberry")) units.push({ label: "strawberry", gramsPerUnit: 15, plural: "strawberries" });
    if (d.includes("tomato")) units.push({ label: "tomato", gramsPerUnit: 120, plural: "tomatoes" });
    if (d.includes("potato")) units.push({ label: "potato", gramsPerUnit: 170, plural: "potatoes" });
    if (d.includes("sweet potato")) units.push({ label: "sweet potato", gramsPerUnit: 130, plural: "sweet potatoes" });
    if (d.includes("onion")) units.push({ label: "onion", gramsPerUnit: 110, plural: "onions" });
    if (d.includes("pepper") && !d.includes("black") && !d.includes("chili") && !d.includes("red pepper flakes"))
      units.push({ label: "pepper", gramsPerUnit: 120, plural: "peppers" });
    if (d.includes("carrot")) units.push({ label: "carrot", gramsPerUnit: 60, plural: "carrots" });
    if (d.includes("cucumber")) units.push({ label: "cucumber", gramsPerUnit: 150, plural: "cucumbers" });
    if (d.includes("garlic")) units.push({ label: "clove", gramsPerUnit: 4, plural: "cloves" });
    if (d.includes("celery") || d.includes("leek") || d.includes("asparagus"))
      units.push({ label: "stalk", gramsPerUnit: 100, plural: "stalks" });
    if (d.includes("broccoli") || d.includes("cauliflower"))
      units.push({ label: "floret", gramsPerUnit: 20, plural: "florets" });
    if (d.includes("lettuce") || d.includes("cabbage") || d.includes("cauliflower") || d.includes("romaine"))
      units.push({ label: "head", gramsPerUnit: 500, plural: "heads" });
  }

  // Proteins.
  if (d.includes("chicken") && (d.includes("breast") || d.includes("thigh") || d.includes("wing") || d.includes("drumstick")))
    units.push({ label: "piece", gramsPerUnit: 120, plural: "pieces" });
  if (/(salmon|tilapia|cod|halibut|trout|mackerel|fish fillet|chicken breast)/.test(d))
    units.push({ label: "fillet", gramsPerUnit: 150, plural: "fillets" });
  if (/(instant|packet|sachet)/.test(d))
    units.push({ label: "packet", gramsPerUnit: 25, plural: "packets" });
  if (d.includes("chicken") || d.includes("beef") || d.includes("pork") || d.includes("fish") || d.includes("turkey") || d.includes("lamb") || d.includes("steak") || d.includes("sausage") || d.includes("bacon") || d.includes("ham") || d.includes("patty") || d.includes("burger") || d.includes("tofu") || d.includes("tempeh"))
    units.push({ label: "patty", gramsPerUnit: 150, plural: "patties" });

  // De-duplicate by label: foods matching several rules can offer the same
  // unit (e.g. "piece" or "cup") — keep the first, most specific match.
  const seen = new Set<string>();
  return units.filter((unit) => {
    if (seen.has(unit.label)) return false;
    seen.add(unit.label);
    return true;
  });
}

export function estimateServing(description: string): number {
  const d = description.toLowerCase();

  // ── Fats / Oils / Condiments ───────────────────────────
  if (d.includes("peanut butter") || d.includes("almond butter")) return 32; // 2 tbsp
  if (d.includes("oil") || d.includes("butter") || d.includes("mayo") || d.includes("margarine")) return 14; // 1 tbsp
  if (d.includes("dressing") || d.includes("vinaigrette")) return 30; // 2 tbsp
  if (d.includes("sauce") || d.includes("gravy") || d.includes("ketchup") || d.includes("mustard") || d.includes("salsa") || d.includes("soy sauce") || d.includes("hot sauce") || d.includes("bbq")) return 30; // 2 tbsp
  if (d.includes("hummus") || d.includes("guacamole")) return 57; // 1/4 cup

  // ── Nuts / Seeds / Dried fruit ─────────────────────────
  if (d.includes("almond") || d.includes("walnut") || d.includes("pecan") || d.includes("cashew") || d.includes("pistachio")) {
    if (d.includes("milk") || d.includes("butter")) return 240; // almond milk, cashew milk etc → 1 cup
    return 28; // 1 oz
  }
  if ((d.includes("nut") || d.includes("seed") || d.includes("trail mix")) && !d.includes("milk")) return 28; // 1 oz
  // Plant milks
  if (d.includes("oat") && d.includes("milk")) return 240;
  if (d.includes("soy") && d.includes("milk")) return 240;
  if (d.includes("coconut") && d.includes("milk")) return 240;
  if (d.includes("hemp") && d.includes("milk")) return 240;
  if (d.includes("flax") && d.includes("milk")) return 240;
  if (d.includes("raisin") || d.includes("prune") || d.includes("dried") && (d.includes("fruit") || d.includes("apricot") || d.includes("cranberry"))) return 40; // 1/4 cup

  // ── Bakery / Bread ─────────────────────────────────────
  if (d.includes("bagel")) return 100;
  if (d.includes("croissant") || d.includes("roll") && (d.includes("dinner") || d.includes("bread"))) return 57;
  if (d.includes("bread") && d.includes("slice")) return 30; // 1 slice
  if (d.includes("bread") || d.includes("toast")) return 50; // 2 slices typical
  if (d.includes("tortilla") && (d.includes("corn") || d.includes("small"))) return 25;
  if (d.includes("tortilla") || d.includes("wrap")) return 50;
  if (d.includes("cracker") || d.includes("pretzel")) return 30;
  if (d.includes("muffin") || d.includes("cupcake")) return 100;
  if (d.includes("pancake") || d.includes("waffle")) return 75; // 2 medium pancakes
  if (d.includes("biscuit")) return 60;

  // ── Breakfast / Cereal ─────────────────────────────────
  if (d.includes("granola") || d.includes("muesli")) return 55; // 1/2 cup
  if (d.includes("cereal") && !d.includes("bar")) return 40; // 1 cup, ~40g
  if (d.includes("oatmeal") || d.includes("oats") || d.includes("porridge")) return 200; // 1 cup cooked

  // ── Grains / Starches ──────────────────────────────────
  if (d.includes("quinoa")) return 185; // 1 cup cooked
  if (d.includes("rice") && (d.includes("brown") || d.includes("white") || d.includes("wild") || d.includes("basmati") || d.includes("jasmine") || d.includes("cooked"))) return 200; // 1 cup cooked
  if (d.includes("rice")) return 200;
  if (d.includes("pasta") || d.includes("spaghetti") || d.includes("noodle") || d.includes("macaroni") || d.includes("penne") || d.includes("fettuccine") || d.includes("linguine")) return 140; // 1 cup cooked
  if (d.includes("potato") && (d.includes("sweet") || d.includes("yam"))) return 150; // 1 medium
  if (d.includes("potato") && (d.includes("mashed") || d.includes("fries") || d.includes("fried") || d.includes("chip"))) return 150;
  if (d.includes("french fry") || d.includes("fries")) return 150;
  if (d.includes("potato")) return 200; // 1 medium baked
  if (d.includes("corn") && !d.includes("syrup") && !d.includes("starch") && !d.includes("oil")) return 150; // 1 cup
  if (d.includes("peas") || d.includes("chickpea") || d.includes("garbanzo")) return 160; // 1 cup
  if (d.includes("bean") && (d.includes("black") || d.includes("pinto") || d.includes("kidney") || d.includes("navy") || d.includes("refried") || d.includes("baked"))) return 130; // 1/2 cup
  if (d.includes("lentil")) return 200; // 1 cup cooked
  if (d.includes("bean") || d.includes("legume")) return 130;

  // ── Protein / Meat ─────────────────────────────────────
  if (d.includes("chicken") && (d.includes("breast") || d.includes("half"))) return 170; // 1 medium breast half
  if (d.includes("chicken") && (d.includes("thigh") || d.includes("drumstick") || d.includes("leg") || d.includes("wing"))) return 120;
  if (d.includes("chicken") || d.includes("turkey")) return 140;
  if (d.includes("salmon") || d.includes("tuna") || d.includes("halibut") || d.includes("cod") || d.includes("tilapia") || d.includes("trout") || d.includes("seafood") || d.includes("fish fillet")) return 170; // 6 oz fillet
  if (d.includes("shrimp") || d.includes("prawn") || d.includes("scallop") || d.includes("lobster") || d.includes("crab")) return 113; // 4 oz
  if (d.includes("bacon")) return 30; // 3 slices
  if (d.includes("sausage") || d.includes("bratwurst") || d.includes("hot dog") || d.includes("frank")) return 85; // 1 link
  if (d.includes("steak") || d.includes("roast") || d.includes("beef") || d.includes("pork") || d.includes("lamb") || d.includes("veal") || d.includes("venison")) return 113; // 4 oz
  if (d.includes("ham") || d.includes("prosciutto") || d.includes("deli") || d.includes("cold cut")) return 85; // 3 slices
  if (d.includes("meat") && (d.includes("ground") || d.includes("minced"))) return 113;
  if (d.includes("burger") || d.includes("patty")) return 150;
  if (d.includes("fish") || d.includes("fillet")) return 150;
  if (d.includes("tofu") || d.includes("tempeh")) return 85; // 3 oz
  if (d.includes("meatball")) return 85; // 3-4 meatballs
  if (d.includes("protein") && (d.includes("bar") || d.includes("shake") || d.includes("powder"))) return 45; // 1 scoop

  // ── Dairy ──────────────────────────────────────────────
  if (d.includes("butter") && (d.includes("peanut") || d.includes("almond"))) return 32;
  if (d.includes("cheese") && (d.includes("cream") || d.includes("ricotta") || d.includes("cottage"))) return 57; // 1/4 cup
  if (d.includes("cheese") && (d.includes("slice") || d.includes("shred") || d.includes("grate"))) return 28; // 1 oz / 1 slice
  if (d.includes("cheese") || d.includes("parmesan")) return 28; // 1 oz
  if (d.includes("cream cheese")) return 30; // 2 tbsp
  if (d.includes("sour cream")) return 30; // 2 tbsp
  if (d.includes("yogurt") || d.includes("yoghurt")) return 170; // single serve cup
  if (d.includes("milk") || d.includes("cream") || d.includes("half and half") || d.includes("half-&-half") || d.includes("half & half")) return 240; // 1 cup
  if (d.includes("buttermilk")) return 240;

  // ── Eggs ───────────────────────────────────────────────
  if (d.includes("egg") && (d.includes("white") || d.includes("whites"))) return 33; // 1 large white
  if (d.includes("egg")) return 50; // 1 large egg

  // ── Beverages ──────────────────────────────────────────
  if (d.includes("beer") || d.includes("ale") || d.includes("lager") || d.includes("stout")) return 355; // 12 oz
  if (d.includes("wine") || d.includes("champagne") || d.includes("prosecco")) return 150; // 5 oz
  if (d.includes("soda") || d.includes("cola") || d.includes("coke") || d.includes("pop") || d.includes("soft drink")) return 355; // 12 oz can
  if (d.includes("energy") && (d.includes("drink") || d.includes("red bull") || d.includes("monster"))) return 250; // 8.4 oz
  if (d.includes("smoothie") || d.includes("shake") || d.includes("frappe") || d.includes("frappuccino")) return 400; // 16 oz
  if (d.includes("coffee") || d.includes("espresso") || d.includes("latte") || d.includes("cappuccino") || d.includes("mocha") || d.includes("americano") || d.includes("tea") || d.includes("chai")) return 240; // 8 oz
  if (d.includes("juice") || d.includes("cider") || d.includes("lemonade")) return 240; // 8 oz
  if (d.includes("water") || d.includes("seltzer") || d.includes("sparkling")) return 240;
  if (d.includes("drink") || d.includes("beverage")) return 240;
  if (d.includes("soup") || d.includes("broth") || d.includes("stew") || d.includes("chili") || d.includes("bisque") || d.includes("chowder")) return 240; // 1 cup

  // ── Desserts / Sweets ──────────────────────────────────
  if (d.includes("ice cream") || d.includes("gelato") || d.includes("sorbet") || d.includes("sherbet") || d.includes("frozen yogurt")) return 130; // 1 cup
  if (d.includes("pie") && !d.includes("piece")) return 150; // 1 slice
  if (d.includes("cake") || d.includes("cheesecake") || d.includes("brownie") || d.includes("pie")) return 100; // 1 slice/piece
  if (d.includes("cookie") && !d.includes("dough")) return 30; // 1 medium cookie
  if (d.includes("donut") || d.includes("doughnut") || d.includes("pastry") || d.includes("danish")) return 80;
  if (d.includes("chocolate") || d.includes("candy") || d.includes("fudge") || d.includes("toffee") || d.includes("caramel")) return 30; // 1 oz
  if (d.includes("pudding") || d.includes("custard") || d.includes("mousse")) return 130; // 1/2 cup
  if (d.includes("syrup") || d.includes("honey") || d.includes("maple") || d.includes("molasses") || d.includes("jam") || d.includes("jelly") || d.includes("preserves")) return 21; // 1 tbsp
  if (d.includes("sugar") || d.includes("sweetener")) return 4; // 1 tsp
  if (d.includes("chip") && (d.includes("tortilla") || d.includes("potato") || d.includes("corn") || d.includes("pita"))) return 28; // 1 oz
  if (d.includes("chip") || d.includes("crisp")) return 28;
  if (d.includes("popcorn") || d.includes("popped")) return 30; // ~4 cups popped
  if (d.includes("snack") || d.includes("trail mix")) return 40;

  // ── Fruits (most common, check after broader categories) ─
  if (d.includes("avocado")) return 75; // 1/2 medium
  if (d.includes("banana")) return 120; // 1 medium
  if (d.includes("apple")) return 180; // 1 medium
  if (d.includes("orange") || d.includes("grapefruit") || d.includes("tangerine") || d.includes("clementine") || d.includes("mandarin")) return 150; // 1 medium
  if (d.includes("peach") || d.includes("nectarine") || d.includes("plum") || d.includes("pear") || d.includes("apricot") || d.includes("mango") || d.includes("papaya")) return 150; // 1 medium
  if (d.includes("kiwi") || d.includes("kiwifruit")) return 75; // 1 medium
  if (d.includes("grape")) return 150; // 1 cup
  if (d.includes("melon") || d.includes("cantaloupe") || d.includes("honeydew") || d.includes("watermelon")) return 180; // 1 cup diced
  if (d.includes("pineapple")) return 165; // 1 cup chunks
  if (d.includes("cherry") || d.includes("cherries")) return 150; // 1 cup
  if (d.includes("blueberry") || d.includes("raspberry") || d.includes("blackberry") || d.includes("cranberry")) return 150; // 1 cup
  if (d.includes("strawberr") || d.includes("berry") || d.includes("berries")) return 150; // 1 cup
  if (d.includes("fruit") && (d.includes("dried") || d.includes("dry"))) return 40;
  if (d.includes("fruit") && (d.includes("cup") || d.includes("salad") || d.includes("mix") || d.includes("cocktail"))) return 180;
  if (d.includes("fruit")) return 150; // 1 medium piece

  // ── Vegetables ─────────────────────────────────────────
  if (d.includes("spinach") || d.includes("kale") || d.includes("lettuce") || d.includes("arugula") || d.includes("chard") || d.includes("collard") || d.includes("cress") || d.includes("greens") || d.includes("mixed green") || d.includes("salad") && (d.includes("green") || d.includes("leaf") || d.includes("garden") || d.includes("side") || d.includes("caesar") || d.includes("mixed"))) return 85; // 3 cups raw
  if (d.includes("broccoli") || d.includes("cauliflower")) return 100; // 1 cup florets
  if (d.includes("carrot") || d.includes("carrots")) return 60; // 1 medium
  if (d.includes("tomato") || d.includes("tomatoes")) return 150; // 1 medium
  if (d.includes("cucumber") || d.includes("zucchini") || d.includes("squash") || d.includes("eggplant") || d.includes("aubergine")) return 150; // 1 medium
  if (d.includes("onion") || d.includes("shallot") || d.includes("leek") || d.includes("scallion") || d.includes("green onion")) return 75; // 1/2 medium
  if (d.includes("pepper") && (d.includes("bell") || d.includes("sweet") || d.includes("red") || d.includes("green") || d.includes("yellow") || d.includes("orange"))) return 120; // 1 medium
  if (d.includes("mushroom") || d.includes("mushrooms")) return 80; // 1 cup sliced
  if (d.includes("asparagus") || d.includes("green bean") || d.includes("snap pea") || d.includes("snow pea") || d.includes("brussel") || d.includes("cabbage") || d.includes("celery") || d.includes("beet") || d.includes("turnip") || d.includes("radish") || d.includes("okra") || d.includes("artichoke") || d.includes("bamboo") || d.includes("water chestnut")) return 100;
  if (d.includes("vegetable") || d.includes("veggie") || d.includes("veg") && (d.includes("mix") || d.includes("stir") || d.includes("medley") || d.includes("blend") || d.includes("frozen"))) return 150;
  if (d.includes("vegetable") || d.includes("veggie")) return 100;
  if (d.includes("pickle") || d.includes("olive")) return 30; // 1 oz

  // ── Pizza / Fast food ──────────────────────────────────
  if (d.includes("pizza") || d.includes("calzone") || d.includes("stromboli")) return 150; // 1 slice
  if (d.includes("burrito")) return 300;
  if (d.includes("taco")) return 100;
  if (d.includes("quesadilla") || d.includes("enchilada")) return 200;
  if (d.includes("nacho")) return 200;
  if (d.includes("sandwich") || d.includes("sub") || d.includes("hoagie")) return 250;
  if (d.includes("sushi") || d.includes("sashimi") || d.includes("maki")) return 150; // 6-8 pieces
  if (d.includes("dumpling") || d.includes("potsticker") || d.includes("gyoza") || d.includes("wonton") || d.includes("pierogi")) return 100; // 4-5 pieces

  // ── Generic fallback ───────────────────────────────────
  return 100;
}
