import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import unzipper from "unzipper";
import Database from "better-sqlite3";
import { parse } from "csv-parse";

const RELEASE = "2025.1";
const DOWNLOAD_URL = `https://downloads.opennutrition.app/opennutrition-dataset-${RELEASE}.zip`;
const CHECKSUM_URL = `${DOWNLOAD_URL}.sha256`;
const OUTPUT_PATH = path.resolve(`src/data/opennutrition-${RELEASE}.db`);
const TEMP_PATH = path.resolve(`.opennutrition-dataset-${RELEASE}.zip`);

function get(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": "health-app-opennutrition-build" } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        get(response.headers.location).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`OpenNutrition request failed with HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(5 * 60 * 1000, () => request.destroy(new Error("OpenNutrition request timed out")));
  });
}

async function download(url, destination) {
  const bytes = await get(url);
  fs.writeFileSync(destination, bytes);
  return bytes;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function categoryFor(type) {
  if (type === "branded") return "Branded";
  if (type === "restaurant") return "Restaurant";
  return "Everyday";
}

async function build() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  console.log(`Downloading ${DOWNLOAD_URL}`);
  const archiveBytes = await download(DOWNLOAD_URL, TEMP_PATH);
  const expectedChecksum = String(await get(CHECKSUM_URL)).trim().split(/\s+/)[0].toLowerCase();
  const actualChecksum = crypto.createHash("sha256").update(archiveBytes).digest("hex");
  if (actualChecksum !== expectedChecksum) {
    throw new Error(`OpenNutrition checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
  }
  console.log(`Verified SHA-256 ${actualChecksum}`);

  if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);
  const db = new Database(OUTPUT_PATH);
  try {
    db.pragma("journal_mode = DELETE");
    db.pragma("synchronous = OFF");
    db.exec(`
      CREATE TABLE foods (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        alternate_names TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        fiber REAL NOT NULL DEFAULT 0
      );
      CREATE VIRTUAL TABLE foods_fts USING fts5(
        id UNINDEXED,
        name,
        alternate_names,
        tokenize = 'unicode61 remove_diacritics 2'
      );
      -- EAN-13 barcodes for branded/grocery foods (column index 8 in the TSV).
      CREATE TABLE barcodes (
        ean_13 TEXT PRIMARY KEY NOT NULL,
        food_id TEXT NOT NULL
      );
      CREATE INDEX idx_barcodes_food ON barcodes(food_id);
    `);

    const insertFood = db.prepare(`
      INSERT INTO foods (id, name, alternate_names, category, calories, protein, carbs, fat, fiber)
      VALUES (@id, @name, @alternateNames, @category, @calories, @protein, @carbs, @fat, @fiber)
    `);
    const insertSearch = db.prepare(`
      INSERT INTO foods_fts (id, name, alternate_names)
      VALUES (@id, @name, @alternateNames)
    `);
    const insertBarcode = db.prepare(
      "INSERT OR IGNORE INTO barcodes (ean_13, food_id) VALUES (?, ?)"
    );
    const insertMany = db.transaction((food) => {
      insertFood.run(food);
      insertSearch.run(food);
    });

    let rows = 0;
    const archive = await unzipper.Open.file(TEMP_PATH);
    const entry = archive.files.find((file) => file.path === "opennutrition_foods.tsv");
    if (!entry) throw new Error("OpenNutrition archive did not contain opennutrition_foods.tsv");

    // OpenNutrition's JSON columns contain unescaped double quotes by design; this is
    // a tab-separated format, not CSV quoting. Disable quote handling and split only
    // on tabs so the embedded JSON remains intact.
    const parser = entry.stream().pipe(parse({
      delimiter: "\t",
      quote: false,
      escape: false,
      relax_column_count: true,
      skip_empty_lines: true,
    }));
    let header;
    for await (const columns of parser) {
      if (!header) {
        header = columns;
        continue;
      }
      if (columns.length < 8) continue;

      let nutrition;
      try {
        nutrition = JSON.parse(columns[7] || "{}");
      } catch {
        nutrition = {};
      }

      let alternateNames = "";
      try {
        const names = JSON.parse(columns[2] || "[]");
        alternateNames = Array.isArray(names) ? names.filter(Boolean).join(" ") : "";
      } catch {
        alternateNames = "";
      }

      const food = {
        id: columns[0],
        name: columns[1] || "Unknown food",
        alternateNames,
        category: categoryFor(columns[4]),
        calories: numberOrZero(nutrition.calories),
        protein: numberOrZero(nutrition.protein),
        carbs: numberOrZero(nutrition.carbohydrates),
        fat: numberOrZero(nutrition.total_fat),
        fiber: numberOrZero(nutrition.dietary_fiber),
      };
      if (!food.id || !food.name) continue;
      insertMany(food);
      const ean = String(columns[8] || "").trim();
      if (ean) insertBarcode.run(ean, food.id);
      rows += 1;
      if (rows % 25000 === 0) console.log(`Imported ${rows.toLocaleString()} foods`);
    }

    db.exec("PRAGMA optimize;");
    const barcodeCount = db.prepare("SELECT COUNT(*) AS n FROM barcodes").get().n;
    console.log(`Built ${OUTPUT_PATH} with ${rows.toLocaleString()} foods and ${barcodeCount.toLocaleString()} barcodes`);
  } finally {
    db.close();
    fs.rmSync(TEMP_PATH, { force: true });
  }

  const sizeMb = (fs.statSync(OUTPUT_PATH).size / (1024 * 1024)).toFixed(1);
  console.log(`SQLite asset size: ${sizeMb} MB`);
}

build().catch((error) => {
  fs.rmSync(TEMP_PATH, { force: true });
  console.error(error);
  process.exitCode = 1;
});
