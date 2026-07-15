import { Platform } from "react-native";

export interface HealthData {
  steps: number;
  heartRate: number[];
  sleepHours: number;
  activeCalories: number;
  distance: number;
  weight: number | null;
  height: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  bloodOxygen: number | null;
  bodyTemperature: number | null;
  respiratoryRate: number | null;
  restingHeartRate: number | null;
  heartRateVariability: number | null;
}

let healthKit: any = null;
let healthConnect: any = null;

const HEALTHKIT_READ_PERMISSIONS = [
  "Steps",
  "HeartRate",
  "SleepAnalysis",
  "ActiveEnergyBurned",
  "DistanceWalkingRunning",
  "Weight",
  "Height",
  "BloodPressureSystolic",
  "BloodPressureDiastolic",
  "OxygenSaturation",
  "BodyTemperature",
] as const;

async function getModules() {
  if (Platform.OS === "ios") {
    if (!healthKit) {
      try {
        healthKit = require("react-native-health");
      } catch {
        return null;
      }
    }
    if (!healthKit) return null;
    return { type: "healthkit" as const, module: healthKit };
  } else if (Platform.OS === "android") {
    if (!healthConnect) {
      try {
        healthConnect = require("react-native-health-connect");
      } catch {
        return null;
      }
    }
    return { type: "healthconnect" as const, module: healthConnect };
  }
  return null;
}

export const HealthService = {
  async initialize(): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;

    try {
      if (ctx.type === "healthkit") {
        const opts = {
          permissions: {
            read: HEALTHKIT_READ_PERMISSIONS.map(
              (key) => ctx.module.Constants.Permissions[key]
            ),
            write: [],
          },
        };
        return new Promise((resolve) => {
          ctx.module.initHealthKit(opts, (err: any) => {
            resolve(!err);
          });
        });
      }

      if (ctx.type === "healthconnect") {
        await ctx.module.initialize();
        const needed = [
          "Steps", "HeartRate", "SleepSession", "ActiveCaloriesBurned",
          "Distance", "Weight", "Height", "BloodPressure",
          "OxygenSaturation", "BodyTemperature",
        ];
        // Actively fire the system Health Connect permission dialog so the
        // user can grant our app read access. Without this, the user is
        // never explicitly asked — `openHealthConnectSettings()` only takes
        // them to the HC settings page, which doesn't surrogate for granting
        // permissions to our app.
        let granted: any[] = [];
        try {
          if (typeof ctx.module.requestPermission === "function") {
            const requestResult = await ctx.module.requestPermission(
              needed.map((recordType) => ({
                recordType,
                accessType: "read",
              }))
            );
            // requestPermission resolves with the currently granted permissions.
            granted = Array.isArray(requestResult) ? requestResult : [];
          }
        } catch (e) {
          console.warn("[HealthService] requestPermission failed:", e);
        }

        if (!granted.length) {
          try {
            granted = (await ctx.module.getGrantedPermissions()) || [];
          } catch (e) {
            console.warn("[HealthService] getGrantedPermissions failed:", e);
          }
        }

        const hasAll = needed.every((t) =>
          granted.some((p: any) => p.recordType === t && p.accessType === "read")
        );
        if (!hasAll) {
          console.warn("[HealthService] Not all permissions granted; opening Health Connect settings.");
          ctx.module.openHealthConnectSettings();
        } else {
          console.log("[HealthService] All Health Connect read permissions granted.");
        }
        return hasAll;
      }
    } catch {
      return false;
    }
    return false;
  },

  async isAvailable(): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;

    try {
      if (ctx.type === "healthkit") {
        return ctx.module.isAvailable();
      }
      if (ctx.type === "healthconnect") {
        const status = await ctx.module.getSdkStatus();
        return status === 3;
      }
    } catch {
      return false;
    }
    return false;
  },

  // Returns true if our app has been granted any read permission by Health
  // Connect / HealthKit. On Android, this is the real signal we use to
  // decide whether to show the "Grant access" prompt. On iOS we ask
  // HealthKit for the current authorization status.
  async hasReadPermissions(): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;

    try {
      if (ctx.type === "healthkit") {
        return new Promise<boolean>((resolve) => {
          if (typeof ctx.module.getAuthStatus !== "function") {
            resolve(false);
            return;
          }
          const authOptions = {
            permissions: {
              read: HEALTHKIT_READ_PERMISSIONS.map(
                (key) => ctx.module.Constants.Permissions[key]
              ),
              write: [],
            },
          };
          ctx.module.getAuthStatus(authOptions, (err: any, results: any) => {
            if (err || !results) {
              resolve(false);
              return;
            }
            const readPerms = Array.isArray(results?.permissions?.read)
              ? results.permissions.read
              : [];
            resolve(readPerms.length > 0);
          });
        });
      }
      if (ctx.type === "healthconnect") {
        const granted = await ctx.module.getGrantedPermissions();
        return Array.isArray(granted) &&
          granted.some((p: any) => p.accessType === "read");
      }
    } catch {
      return false;
    }
    return false;
  },

  // Returns true if Health Connect / HealthKit has any data within the last
  // `days` days across several common record types. Used by the root layout
  // to decide whether to route the user through onboarding
  // (no data → re-onboard). Short-circuits on the first record hit.
  async hasAnyData(days = 7): Promise<boolean> {
    const ctx = await getModules();
    if (!ctx) return false;

    // Order matters: cheapest / most common first. The HealthKit list uses
    // permission keys (Constants.Permissions); the HealthConnect list uses
    // record type names.
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      if (ctx.type === "healthkit") {
        const hk = ctx.module;
        const probes: Array<{ method: string; accessor?: (r: any) => any }> = [
          { method: "getDailyStepCountSamples" },
          { method: "getHeartRateSamples" },
          { method: "getWeightSamples" },
          { method: "getBloodPressureSamples" },
        ];

        for (const { method } of probes) {
          const fn = hk[method];
          if (typeof fn !== "function") continue;
          const records = await new Promise<any[]>((resolve) => {
            fn.call(
              hk,
              { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
              (err: any, results: any[]) => {
                resolve(err ? [] : results || []);
              }
            );
          });
          if (records.length > 0) return true;
        }
        return false;
      }

      if (ctx.type === "healthconnect") {
        const probeTypes = [
          "Steps",
          "HeartRate",
          "Weight",
          "BloodPressure",
        ];
        for (const recordType of probeTypes) {
          try {
            const response = await ctx.module.readRecords(recordType, {
              timeRangeFilter: {
                operator: "between",
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
              },
            });
            if ((response?.records || []).length > 0) return true;
          } catch (err) {
            // Skip this record type if it isn't authorised yet.
            console.warn(`[HealthService] hasAnyData probe for ${recordType} failed:`, err);
            continue;
          }
        }
        return false;
      }
    } catch {
      return false;
    }
    return false;
  },

  async getTodayData(): Promise<HealthData> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ctx = await getModules();

    const defaultData: HealthData = {
      steps: 0,
      heartRate: [],
      sleepHours: 0,
      activeCalories: 0,
      distance: 0,
      weight: null,
      height: null,
      bloodPressure: null,
      bloodOxygen: null,
      bodyTemperature: null,
      respiratoryRate: null,
      restingHeartRate: null,
      heartRateVariability: null,
    };

    if (!ctx) return defaultData;

    try {
      if (ctx.type === "healthkit") {
        return await this.fetchHealthKitData(ctx.module, startOfDay, now);
      }
      if (ctx.type === "healthconnect") {
        return await this.fetchHealthConnectData(ctx.module, startOfDay, now);
      }
    } catch (err) {
      console.warn("[HealthService] getTodayData failed:", err);
      return defaultData;
    }
    return defaultData;
  },

  async fetchHealthKitData(
    hk: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthData> {
    const data: HealthData = {
      steps: 0,
      heartRate: [],
      sleepHours: 0,
      activeCalories: 0,
      distance: 0,
      weight: null,
      height: null,
      bloodPressure: null,
      bloodOxygen: null,
      bodyTemperature: null,
      respiratoryRate: null,
      restingHeartRate: null,
      heartRateVariability: null,
    };

    const get = (method: string, options: any) =>
      new Promise<any[]>((resolve) => {
        const fn = hk[method];
        if (typeof fn !== "function") {
          console.warn(`[HealthService] HealthKit method ${method} is not available`);
          resolve([]);
          return;
        }
        fn.call(hk, options, (err: any, results: any[]) => {
          resolve(err ? [] : results || []);
        });
      });

    const steps = await get("getDailyStepCountSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.steps = steps.reduce((sum: number, s: any) => sum + (s.value || 0), 0);

    const hr = await get("getHeartRateSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.heartRate = hr.map((h: any) => h.value);

    const sleep = await get("getSleepSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.sleepHours = sleep.reduce((sum: number, s: any) => {
      const dur =
        (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
        3600000;
      return sum + dur;
    }, 0);

    const cal = await get("getActiveEnergyBurned", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.activeCalories = cal.reduce(
      (sum: number, c: any) => sum + (c.value || 0),
      0
    );

    const dist = await get("getDistanceWalkingRunning", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.distance = dist.reduce(
      (sum: number, d: any) => sum + (d.value || 0),
      0
    );

    // Weight — use most recent sample
    const weightSamples = await get("getWeightSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const lastWeight = weightSamples[weightSamples.length - 1];
    data.weight = lastWeight ? (lastWeight.value ?? null) : null;

    // Height — use most recent sample
    const heightSamples = await get("getHeightSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const lastHeight = heightSamples[heightSamples.length - 1];
    data.height = lastHeight ? (lastHeight.value ?? null) : null;

    // Blood pressure — use getBloodPressureSamples for properly paired values
    const bpSamples = await get("getBloodPressureSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const lastBp = bpSamples[bpSamples.length - 1];
    data.bloodPressure = lastBp
      ? {
          systolic: lastBp.bloodPressureSystolicValue ?? 0,
          diastolic: lastBp.bloodPressureDiastolicValue ?? 0,
        }
      : null;

    // Blood Oxygen — use most recent sample
    const o2Samples = await get("getOxygenSaturationSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const lastO2 = o2Samples[o2Samples.length - 1];
    data.bloodOxygen = lastO2 ? (lastO2.value ?? null) : null;

    // Body Temperature — use most recent sample
    const tempSamples = await get("getBodyTemperatureSamples", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const lastTemp = tempSamples[tempSamples.length - 1];
    data.bodyTemperature = lastTemp ? (lastTemp.value ?? null) : null;

    return data;
  },

  async fetchHealthConnectData(
    hc: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthData> {
    const data: HealthData = {
      steps: 0,
      heartRate: [],
      sleepHours: 0,
      activeCalories: 0,
      distance: 0,
      weight: null,
      height: null,
      bloodPressure: null,
      bloodOxygen: null,
      bodyTemperature: null,
      respiratoryRate: null,
      restingHeartRate: null,
      heartRateVariability: null,
    };

    const read = (recordType: string) =>
      hc
        .readRecords(recordType, {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        })
        .then((r: any) => r.records || [])
        .catch((err: any) => {
          // Isolate failures so one missing/unsupported permission doesn't
          // zero out every other metric.
          console.warn(`[HealthService] Failed to read ${recordType}:`, err);
          return [];
        });

    const steps = await read("Steps");
    data.steps = steps.reduce((sum: number, s: any) => sum + (s.count || 0), 0);

    const hr = await read("HeartRate");
    data.heartRate = hr.flatMap((h: any) =>
      (h.samples || []).map((s: any) => s.beatsPerMinute)
    );

    const sleep = await read("SleepSession");
    data.sleepHours = sleep.reduce((sum: number, s: any) => {
      const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
      return sum + dur;
    }, 0);

    const cal = await read("ActiveCaloriesBurned");
    data.activeCalories = cal.reduce((sum: number, c: any) => sum + (c.energy?.inKilocalories || 0), 0);

    const dist = await read("Distance");
    data.distance = dist.reduce((sum: number, d: any) => sum + (d.distance?.inMeters || 0), 0);

    const weight = await read("Weight");
    const lastWeight = weight[weight.length - 1];
    data.weight = lastWeight ? (lastWeight.weight?.inKilograms ?? null) : null;

    const height = await read("Height");
    const lastHeight = height[height.length - 1];
    data.height = lastHeight ? ((lastHeight.height?.inMeters ?? 0) * 100) : null;

    const bp = await read("BloodPressure");
    const lastBp = bp[bp.length - 1];
    data.bloodPressure = lastBp
      ? { systolic: lastBp.systolic?.inMillimetersOfMercury ?? 0, diastolic: lastBp.diastolic?.inMillimetersOfMercury ?? 0 }
      : null;

    const o2 = await read("OxygenSaturation");
    const lastO2 = o2[o2.length - 1];
    data.bloodOxygen = lastO2 ? (lastO2.percentage ?? null) : null;

    const temp = await read("BodyTemperature");
    const lastTemp = temp[temp.length - 1];
    data.bodyTemperature = lastTemp ? (lastTemp.temperature?.inCelsius ?? null) : null;

    return data;
  },
};
