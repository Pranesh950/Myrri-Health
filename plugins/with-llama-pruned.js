const fs = require("fs");
const path = require("path");
const { withDangerousMod, createRunOncePlugin } = require("@expo/config-plugins");

const pkg = require("../package.json");

/**
 * llama.rn ships several prebuilt copies of the llama.cpp engine
 * (`librnllama*.so`), each compiled for a different ARM instruction set
 * (v8, v8.2, dotprod, i8mm, hexagon_opencl, ...) so the runtime can pick
 * the fastest one the device CPU supports.
 *
 * Its loader (RNLlama.loadNative) already falls back gracefully when a
 * variant is missing (`tryLoadLibrary` catches UnsatisfiedLinkError and
 * walks down the chain to the plain `rnllama_jni` + `rnllama` pair), so
 * shipping only the universal build keeps on-device inference working on
 * every arm64 phone at the cost of some speed on newer chips.
 *
 * What gets removed (all inside node_modules/llama.rn):
 *   - android/src/main/jniLibs/arm64-v8a/*.so except librnllama.so
 *   - android/src/main/jniLibs/x86_64/  (Android emulator / ChromeOS only)
 *   - bin/arm64-v8a/                    (Hexagon DSP + OpenCL stub libs,
 *     used only by the hexagon_opencl variant; deleting the dir makes the
 *     gradle HTP asset sync task skip entirely)
 *
 * This is safe with llama.rn's build: android/src/main/CMakeLists.txt
 * skips compiling any JNI wrapper whose prebuilt engine .so is missing
 * (`if (NOT EXISTS ${PREBUILT_CHECK_PATH}) ... return()`), so only
 * `librnllama_jni.so` + `librnllama.so` end up in the final APK/AAB.
 *
 * Note: llama.rn's postinstall (`download-native-artifacts.js`) restores
 * the full jniLibs set on `npm install`. That is expected — `expo
 * prebuild` (which EAS always runs after install, and which runs this
 * plugin) re-prunes right afterwards, so builds always ship plain-only.
 */
const LLAMA_RN_ROOT = "node_modules/llama.rn";
const KEEP_ARM64 = new Set(["librnllama.so"]);

/**
 * Delete the unneeded llama.rn native artifacts under `projectRoot`.
 * Exported separately so it can be unit-tested. Returns
 * `{ deleted, hadArtifacts }` where `deleted` is the list of removed
 * paths and `hadArtifacts` is true when the expected jniLibs layout was
 * found (false means llama.rn is absent or its package layout changed).
 */
function pruneLlamaRnNativeLibs(projectRoot) {
  const deleted = [];
  const base = path.join(projectRoot, LLAMA_RN_ROOT, "android", "src", "main", "jniLibs");

  // arm64-v8a: keep only the plain (universal) engine
  const arm64 = path.join(base, "arm64-v8a");
  const hadArtifacts = fs.existsSync(arm64);
  if (hadArtifacts) {
    for (const file of fs.readdirSync(arm64)) {
      if (file.endsWith(".so") && !KEEP_ARM64.has(file)) {
        const target = path.join(arm64, file);
        fs.rmSync(target, { force: true });
        deleted.push(target);
      }
    }
  }

  // x86_64: only used by the Android emulator / ChromeOS
  const x86_64 = path.join(base, "x86_64");
  if (fs.existsSync(x86_64)) {
    fs.rmSync(x86_64, { recursive: true, force: true });
    deleted.push(x86_64);
  }

  // bin/arm64-v8a: Hexagon DSP + OpenCL stub libs, used only by the
  // hexagon_opencl variant. Removing the whole dir makes the gradle HTP
  // asset sync task skip (its onlyIf checks htpLibSourceDir.exists()).
  const htpDir = path.join(projectRoot, LLAMA_RN_ROOT, "bin", "arm64-v8a");
  if (fs.existsSync(htpDir)) {
    fs.rmSync(htpDir, { recursive: true, force: true });
    deleted.push(htpDir);
  }

  return { deleted, hadArtifacts };
}

function withLlamaPruned(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const { deleted, hadArtifacts } = pruneLlamaRnNativeLibs(projectRoot);
      if (deleted.length > 0) {
        console.log(
          `[with-llama-pruned] Removed ${deleted.length} llama.rn native artifact(s):\n  ` +
            deleted.join("\n  ")
        );
      } else if (!hadArtifacts) {
        // llama.rn missing or its package layout changed — nothing to prune.
        console.warn(
          "[with-llama-pruned] No llama.rn jniLibs found at " +
            "node_modules/llama.rn/android/src/main/jniLibs/. If llama.rn was " +
            "upgraded, check its layout — otherwise the full per-CPU variant " +
            "set (~90MB) will ship again."
        );
      }
      return config;
    },
  ]);
}

module.exports = createRunOncePlugin(withLlamaPruned, "with-llama-pruned", pkg?.version ?? "1.0.0");
module.exports.pruneLlamaRnNativeLibs = pruneLlamaRnNativeLibs;
