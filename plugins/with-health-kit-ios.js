const { withEntitlementsPlist, createRunOncePlugin } = require("@expo/config-plugins");

const pkg = require("../package.json");

function withHealthKitEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    // Standard fitness data does not require HealthKit Clinical Records access.
    config.modResults["com.apple.developer.healthkit"] = true;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withHealthKitEntitlements,
  "with-health-kit-ios",
  pkg?.version ?? "1.0.0"
);
