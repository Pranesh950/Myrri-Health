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
}

let healthKit: any = null;
let healthConnect: any = null;

async function getModules() {
  if (Platform.OS === "ios") {
    if (!healthKit) {
      healthKit = require("react-native-health").default;
    }
    return { type: "healthkit" as const, module: healthKit };
  } else if (Platform.OS === "android") {
    if (!healthConnect) {
      healthConnect = require("react-native-health-connect");
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
            read: [
              ctx.module.Constants.Permissions.Steps,
              ctx.module.Constants.Permissions.HeartRate,
              ctx.module.Constants.Permissions.SleepAnalysis,
              ctx.module.Constants.Permissions.ActiveEnergyBurned,
              ctx.module.Constants.Permissions.DistanceWalkingRunning,
              ctx.module.Constants.Permissions.Weight,
              ctx.module.Constants.Permissions.Height,
              ctx.module.Constants.Permissions.BloodPressureSystolic,
              ctx.module.Constants.Permissions.BloodPressureDiastolic,
              ctx.module.Constants.Permissions.OxygenSaturation,
              ctx.module.Constants.Permissions.BodyTemperature,
            ],
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
        const result = await ctx.module.requestPermission([
          { accessType: "read", recordType: "Steps" },
          { accessType: "read", recordType: "HeartRate" },
          { accessType: "read", recordType: "SleepSession" },
          { accessType: "read", recordType: "CaloriesBurned" },
          { accessType: "read", recordType: "Distance" },
          { accessType: "read", recordType: "Weight" },
          { accessType: "read", recordType: "Height" },
          { accessType: "read", recordType: "BloodPressure" },
          { accessType: "read", recordType: "OxygenSaturation" },
          { accessType: "read", recordType: "BodyTemperature" },
        ]);
        return result;
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
        const status = await ctx.module.getHealthConnectSdkStatus();
        return status === 1;
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
    };

    if (!ctx) return defaultData;

    try {
      if (ctx.type === "healthkit") {
        return await this.fetchHealthKitData(ctx.module, startOfDay, now);
      }
      if (ctx.type === "healthconnect") {
        return await this.fetchHealthConnectData(ctx.module, startOfDay, now);
      }
    } catch {
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
    };

    const get = (options: any) =>
      new Promise<any[]>((resolve) => {
        hk.getSamples(options, (err: any, results: any[]) => {
          resolve(err ? [] : results || []);
        });
      });

    const steps = await get({
      type: hk.Constants.Permissions.Steps,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.steps = steps.reduce((sum: number, s: any) => sum + (s.value || 0), 0);

    const hr = await get({
      type: hk.Constants.Permissions.HeartRate,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.heartRate = hr.map((h: any) => h.value);

    const sleep = await get({
      type: hk.Constants.Permissions.SleepAnalysis,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.sleepHours =
      sleep.reduce((sum: number, s: any) => {
        const dur = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 3600000;
        return sum + dur;
      }, 0);

    const cal = await get({
      type: hk.Constants.Permissions.ActiveEnergyBurned,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.activeCalories = cal.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

    const dist = await get({
      type: hk.Constants.Permissions.DistanceWalkingRunning,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    data.distance = dist.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

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
    };

    const read = (recordType: string) =>
      hc.readRecords(recordType, {
        timeRangeFilter: {
          operator: "between",
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      }).then((r: any) => r || []);

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

    const cal = await read("CaloriesBurned");
    data.activeCalories = cal.reduce((sum: number, c: any) => sum + (c.energy?.inKcal || 0), 0);

    const dist = await read("Distance");
    data.distance = dist.reduce((sum: number, d: any) => sum + (d.distance?.inMeters || 0), 0);

    return data;
  },
};
