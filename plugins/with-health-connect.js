const { withAndroidManifest, withMainActivity, createRunOncePlugin } = require("@expo/config-plugins");

const pkg = require("../package.json");

const HEALTH_PERMISSIONS = [
  "android.permission.health.READ_STEPS",
  "android.permission.health.READ_DISTANCE",
  "android.permission.health.READ_HEART_RATE",
  "android.permission.health.READ_RESTING_HEART_RATE",
  "android.permission.health.READ_SLEEP",
  "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
  "android.permission.health.READ_TOTAL_CALORIES_BURNED",
  "android.permission.health.READ_HEIGHT",
  "android.permission.health.READ_WEIGHT",
  "android.permission.health.READ_BLOOD_PRESSURE",
  "android.permission.health.READ_OXYGEN_SATURATION",
  "android.permission.health.READ_BODY_TEMPERATURE",
  "android.permission.health.READ_HYDRATION",
  "android.permission.health.READ_NUTRITION",
  "android.permission.health.READ_EXERCISE",
  "android.permission.health.READ_BASAL_METABOLIC_RATE",
  "android.permission.health.READ_BLOOD_GLUCOSE",
  "android.permission.health.READ_BODY_FAT",
];

function withHealthConnectManifest(config) {
  return withAndroidManifest(config, (config) => {
    const root = config.modResults.manifest ?? config.modResults;
    const application = root.application?.[0];
    if (!application) return config;

    // <uses-permission> and <queries> must be direct children of <manifest>,
    // not <application>. Insert them at the root level.
    if (!Array.isArray(root["uses-permission"])) {
      root["uses-permission"] = [];
    }

    const existing = new Set(
      root["uses-permission"]
        .map((p) => p?.$?.["android:name"])
        .filter(Boolean)
    );

    for (const perm of HEALTH_PERMISSIONS) {
      if (!existing.has(perm)) {
        root["uses-permission"].push({
          $: { "android:name": perm },
        });
        existing.add(perm);
      }
    }

    if (!Array.isArray(root["queries"])) {
      root["queries"] = [];
    }

    const hasHealthConnectQuery = root["queries"].some((q) =>
      q?.package?.some(
        (p) => p?.$?.["android:name"] === "com.google.android.apps.healthdata"
      )
    );

    if (!hasHealthConnectQuery) {
      root["queries"].push({
        package: [
          { $: { "android:name": "com.google.android.apps.healthdata" } },
        ],
      });
    }

    return config;
  });
}

function withHealthConnectMainActivity(config) {
  return withMainActivity(config, (config) => {
    const contents = config.modResults.contents ?? "";
    if (contents.includes("HealthConnectPermissionDelegate.setPermissionDelegate")) {
      return config;
    }

    let updated = contents;

    // Ensure required imports are present.
    if (!updated.includes("import android.os.Bundle")) {
      updated = updated.replace(
        /^(package [^\n]+\n)/m,
        "$1\nimport android.os.Bundle\nimport dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate\n"
      );
    } else if (!updated.includes("HealthConnectPermissionDelegate")) {
      updated = updated.replace(
        /import android.os.Bundle\n/,
        "import android.os.Bundle\nimport dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate\n"
      );
    }

    // Inject the delegate registration immediately after super.onCreate(...).
    // This must run inside onCreate, after the activity has been initialized.
    if (
      /override\s+fun\s+onCreate\s*\(\s*savedInstanceState\s*:\s*Bundle\s*\?\s*\)\s*\{/.test(
        updated
      )
    ) {
      if (!updated.includes("HealthConnectPermissionDelegate.setPermissionDelegate")) {
        updated = updated.replace(
          /(super\.onCreate\s*\([^)]*\)\s*\n)/,
          "$1    HealthConnectPermissionDelegate.setPermissionDelegate(this)\n"
        );
      }
    } else {
      const onCreate = `  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    HealthConnectPermissionDelegate.setPermissionDelegate(this)
  }

`;
      updated = updated.replace(
        /(class MainActivity[^{]*\{)/,
        `$1\n${onCreate}`
      );
    }

    config.modResults.contents = updated;
    return config;
  });
}

module.exports = createRunOncePlugin(
  (config) => {
    config = withHealthConnectManifest(config);
    config = withHealthConnectMainActivity(config);
    return config;
  },
  "with-health-connect",
  pkg?.version ?? "1.0.0"
);
