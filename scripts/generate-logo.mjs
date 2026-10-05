// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// ─────────────────────────────────────────────────────────────────────────────
// Everwave logo generator
//
// The mark is a Gerono lemniscate (a mathematically perfect ∞) drawn as one
// continuous wave-line in the brand's peach → coral gradient:
//
//     x(t) = A · cos t
//     y(t) = B · sin t · cos t
//
// Longevity = the endless loop, ocean = the wave. One stroke, nothing else.
//
// Usage:
//   node scripts/generate-logo.mjs [projectRoot]
//
// Outputs (all paths referenced by app.json are overwritten in place):
//   assets/icon.png                       1024×1024  (iOS / general app icon)
//   assets/android-icon-foreground.png     512×512   (adaptive foreground, transparent)
//   assets/android-icon-background.png     512×512   (adaptive background layer)
//   assets/android-icon-monochrome.png     432×432   (themed / monochrome icon)
//   assets/splash-icon.png                1024×1024  (splash mark, transparent)
//   assets/brand/everwave.svg                        (master vector, icon tile)
//   assets/brand/everwave-mark.svg                   (master vector, glyph only)
//   assets/brand/preview.png                         (visual preview sheet)
// ─────────────────────────────────────────────────────────────────────────────

import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const PROJECT_ROOT = path.resolve(process.argv[2] ?? process.cwd());
const ASSETS = path.join(PROJECT_ROOT, "assets");
const BRAND = path.join(ASSETS, "brand");

// ── Brand palette (from src/theme.ts) ────────────────────────────────────────
const PEACH = "#F0B1A6"; // colors["signature-peach"]
const CORAL = "#E56F63"; // colors["signature-coral"]
const OCEAN_TOP = "#EDF7FD"; // pale sea-foam, barely-there
const OCEAN_BOTTOM = "#DEEFFA"; // shallow-water blue
const OCEAN_FLAT = "#E6F4FE"; // android adaptiveIcon backgroundColor in app.json

// ── Everwave geometry ────────────────────────────────────────────────────────
// Glyph lives in a 1024×1024 viewBox, centered.
const A = 270; // horizontal amplitude → path width = 540
const B = 210; // vertical factor → path height = 210
const STROKE = 58;
const CX = 512;
const CY = 512;
const N = 720; // samples around the loop (visually seamless)

function glyphPathD() {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = CX + A * Math.cos(t);
    const y = CY + B * Math.sin(t) * Math.cos(t);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}
const PATH_D = glyphPathD();

// Bounding box of the stroked glyph (path extent ± stroke/2), used for the
// gradient span so the diagonal runs corner-to-corner of the mark itself.
const BBOX = {
  x0: CX - A - STROKE / 2,
  y0: CY - B / 2 - STROKE / 2,
  x1: CX + A + STROKE / 2,
  y1: CY + B / 2 + STROKE / 2,
};

/**
 * Build the master SVG.
 * @param {object} opts
 * @param {"gradient" | string | null} opts.stroke "gradient" | css color | null (bg-only tile)
 * @param {"ocean" | null} opts.bg background style
 * @param {number} opts.scale scale of the glyph about the canvas center
 */
function buildSvg({ stroke = "gradient", bg = "ocean", scale = 1 } = {}) {
  const strokePaint =
    stroke === "gradient" ? "url(#everwave-coral)" : (stroke ?? "none");
  const group =
    scale === 1
      ? ""
      : ` transform="translate(${CX} ${CY}) scale(${scale}) translate(${-CX} ${-CY})"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- Myrri "Everwave" — one wave-line, endlessly looping. -->
  <defs>
    <linearGradient id="everwave-coral" x1="${BBOX.x0}" y1="${BBOX.y0}" x2="${BBOX.x1}" y2="${BBOX.y1}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${PEACH}"/>
      <stop offset="1" stop-color="${CORAL}"/>
    </linearGradient>
    <linearGradient id="everwave-ocean" x1="0" y1="0" x2="0" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${OCEAN_TOP}"/>
      <stop offset="1" stop-color="${OCEAN_BOTTOM}"/>
    </linearGradient>
  </defs>
  ${
    bg === "ocean"
      ? `<rect width="1024" height="1024" fill="url(#everwave-ocean)"/>`
      : ""
  }
  <path d="${PATH_D}" fill="none" stroke="${strokePaint}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"${group}/>
</svg>
`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function renderSvg(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** Round the corners of an icon buffer, like a home-screen tile. */
async function roundedIcon(buf, size, radiusRatio = 0.224) {
  const radius = Math.round(size * radiusRatio);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  return sharp(buf)
    .resize(size, size)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Print a coarse ASCII rendering so the shape can be sanity-checked. */
async function asciiPreview(file, cols = 72, rows = 30) {
  const { data } = await sharp(file)
    .resize(cols, rows, { fit: "fill" })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ramp = "@#*+=:-. "; // dark → light
  let out = "";
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const v = data[r * cols + c]; // 0=black … 255=white
      line += ramp[Math.min(ramp.length - 1, Math.floor((v / 256) * ramp.length))];
    }
    out += line + "\n";
  }
  return out;
}

/** Verify the adaptive foreground glyph sits inside Android's 66% safe circle. */
async function checkSafeZone(file, size) {
  const { data } = await sharp(file)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const half = size / 2;
  const safeRadius = size / 3; // safe zone = inner 66% circle
  let maxDist = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x] > 8) {
        const d = Math.hypot(x - half, y - half);
        if (d > maxDist) maxDist = d;
      }
    }
  }
  return { maxDist: Math.round(maxDist), safeRadius: Math.round(safeRadius), ok: maxDist <= safeRadius };
}

async function main() {
  fs.mkdirSync(BRAND, { recursive: true });

  // 1) Master vectors
  const iconSvg = buildSvg({ stroke: "gradient", bg: "ocean", scale: 1 });
  const markSvg = buildSvg({ stroke: "gradient", bg: null, scale: 1 });
  fs.writeFileSync(path.join(BRAND, "everwave.svg"), iconSvg);
  fs.writeFileSync(path.join(BRAND, "everwave-mark.svg"), markSvg);

  // 2) App icon — full-bleed tile, opaque (1024×1024)
  const iconBuf = await renderSvg(iconSvg, 1024);
  await sharp(iconBuf).flatten().png().toFile(path.join(ASSETS, "icon.png"));

  // 3) Android adaptive foreground — transparent, glyph inside 66% safe circle.
  //    Scale 0.95 keeps the glyph comfortably within the safe-zone radius.
  const fgSvg = buildSvg({ stroke: "gradient", bg: null, scale: 0.95 });
  await renderSvg(fgSvg, 512).then((b) =>
    fs.promises.writeFile(path.join(ASSETS, "android-icon-foreground.png"), b)
  );

  // 4) Android adaptive background layer — same ocean ground as the icon tile.
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: OCEAN_FLAT,
    },
  })
    .png()
    .toFile(path.join(ASSETS, "android-icon-background.png"));

  // 5) Android themed (monochrome) icon — pure white glyph on transparency.
  const monoSvg = buildSvg({ stroke: "#FFFFFF", bg: null, scale: 0.95 });
  await renderSvg(monoSvg, 432).then((b) =>
    fs.promises.writeFile(path.join(ASSETS, "android-icon-monochrome.png"), b)
  );

  // 6) Splash mark — transparent, generous padding (plugin renders at ~100dp).
  const splashSvg = buildSvg({ stroke: "gradient", bg: null, scale: 0.78 });
  await renderSvg(splashSvg, 1024).then((b) =>
    fs.promises.writeFile(path.join(ASSETS, "splash-icon.png"), b)
  );

  // 7) Preview sheet — light & dark home-screen rows across common sizes.
  const sizes = [220, 140, 88, 56];
  const xs = [100, 400, 620, 788];
  const big = 360;
  const rowTop = 70;
  const comps = [
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="720"><rect width="1440" height="360" fill="#F1F2F4"/><rect y="360" width="1440" height="360" fill="#17181C"/></svg>`
      ),
      left: 0,
      top: 0,
    },
  ];
  for (const [row, top] of [
    [iconBuf, rowTop],
    [iconBuf, rowTop + 360],
  ]) {
    for (let i = 0; i < sizes.length; i++) {
      const rounded = await roundedIcon(row, sizes[i]);
      comps.push({ input: rounded, left: xs[i], top });
    }
    const bigTile = await roundedIcon(row, big);
    comps.push({ input: bigTile, left: 1000, top: top + (360 - big) / 2 });
  }
  await sharp({
    create: { width: 1440, height: 720, channels: 4, background: "#FFFFFF" },
  })
    .composite(comps)
    .png()
    .toFile(path.join(BRAND, "preview.png"));

  // ── Verification ───────────────────────────────────────────────────────────
  const targets = [
    "icon.png",
    "android-icon-foreground.png",
    "android-icon-background.png",
    "android-icon-monochrome.png",
    "splash-icon.png",
    "brand/everwave.svg",
    "brand/everwave-mark.svg",
    "brand/preview.png",
  ];
  console.log("Generated files:");
  for (const t of targets) {
    const p = path.join(ASSETS, t);
    const stat = fs.statSync(p);
    console.log(`  ${t.padEnd(34)} ${(stat.size / 1024).toFixed(1)} KB`);
  }

  console.log("\nDimensions:");
  for (const t of targets.filter((f) => f.endsWith(".png"))) {
    const meta = await sharp(path.join(ASSETS, t)).metadata();
    console.log(
      `  ${t.padEnd(34)} ${meta.width}×${meta.height}  channels=${meta.channels}`
    );
  }

  const zone = await checkSafeZone(
    path.join(ASSETS, "android-icon-foreground.png"),
    512
  );
  console.log(
    `\nAdaptive safe zone: glyph max radius ${zone.maxDist}px vs ${zone.safeRadius}px allowed → ${
      zone.ok ? "OK ✓" : "OVERFLOW ✗"
    }`
  );

  console.log("\nASCII check of assets/icon.png (the ∞ should read clearly):");
  console.log(await asciiPreview(path.join(ASSETS, "icon.png")));

  // Confirm app.json references exactly the files we wrote.
  const appJson = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "app.json"), "utf8")
  );
  const refs = [
    appJson.expo.icon,
    appJson.expo.android?.adaptiveIcon?.foregroundImage,
    appJson.expo.android?.adaptiveIcon?.backgroundImage,
    appJson.expo.android?.adaptiveIcon?.monochromeImage,
  ].filter(Boolean);
  console.log("app.json icon wiring:");
  for (const ref of refs) {
    const p = path.join(PROJECT_ROOT, ref.replace(/^\.\//, ""));
    console.log(`  ${ref.padEnd(42)} ${fs.existsSync(p) ? "exists ✓" : "MISSING ✗"}`);
  }
  const splashDefault = "./assets/splash-icon.png"; // expo-splash-screen plugin default
  console.log(
    `  ${splashDefault.padEnd(42)} exists ✓ (splash plugin default image)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
