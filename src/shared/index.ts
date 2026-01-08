import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function log(message: string, ...args: unknown[]): void {
  if (process.env.DEBUG || process.env.THOTH_DEBUG) {
    console.log(`[thoth-plugin] ${message}`, ...args);
  }
}

export function expandPath(inputPath: string): string {
  if (inputPath.startsWith("~")) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

export function getUserConfigDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  } else if (process.platform === "win32") {
    return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  }
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function readFileSync(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export function writeFileSync(filePath: string, content: string): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T> | undefined
): T {
  if (!override) return base;
  
  const result = { ...base };
  
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseValue = base[key];
    const overrideValue = override[key];
    
    if (
      typeof baseValue === "object" &&
      baseValue !== null &&
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue as T[keyof T];
    }
  }
  
  return result;
}

export function getTemporalContext(): TemporalContext {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hour = now.getHours();
  
  let dayMode: DayMode;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    dayMode = "weekend-sanctuary";
  } else if (dayOfWeek === 1) {
    dayMode = "launch";
  } else if (dayOfWeek === 5) {
    dayMode = "closure";
  } else {
    dayMode = "execution";
  }
  
  let biologicalMode: BiologicalMode;
  if (hour >= 8 && hour < 11) {
    biologicalMode = "high-cognitive";
  } else if (hour >= 14 && hour < 17) {
    biologicalMode = "collaborative";
  } else if (hour >= 19 || hour < 6) {
    biologicalMode = "restoration";
  } else {
    biologicalMode = "transition";
  }
  
  const weekNumber = getWeekNumber(now);
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  
  return {
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    dayOfWeek: dayNames[dayOfWeek],
    weekNumber,
    quarter,
    dayMode,
    biologicalMode,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export type DayMode = "launch" | "execution" | "closure" | "weekend-sanctuary";
export type BiologicalMode = "high-cognitive" | "collaborative" | "restoration" | "transition";

export interface TemporalContext {
  date: string;
  time: string;
  dayOfWeek: string;
  weekNumber: number;
  quarter: number;
  dayMode: DayMode;
  biologicalMode: BiologicalMode;
  isWeekend: boolean;
}

export function formatTemporalContext(ctx: TemporalContext): string {
  return `<temporal_context>
  Date: ${ctx.date} (${ctx.dayOfWeek})
  Time: ${ctx.time}
  Week: ${ctx.weekNumber} of 52
  Quarter: Q${ctx.quarter}
  Day Mode: ${formatDayMode(ctx.dayMode)}
  Biological Mode: ${formatBiologicalMode(ctx.biologicalMode)}
  ${ctx.isWeekend ? "⚠️ Weekend Sanctuary - Block work unless Emergency P0" : ""}
</temporal_context>`;
}

function formatDayMode(mode: DayMode): string {
  switch (mode) {
    case "launch": return "Monday Launch Mode - Prioritize planning and alignment";
    case "execution": return "Execution Mode - Protect deep work blocks";
    case "closure": return "Friday Closure Mode - Wrap up and delegate";
    case "weekend-sanctuary": return "Weekend Sanctuary - Restoration priority";
  }
}

function formatBiologicalMode(mode: BiologicalMode): string {
  switch (mode) {
    case "high-cognitive": return "High Cognitive (08:00-11:00) - Protect from triage";
    case "collaborative": return "Collaborative (14:00-17:00) - Good for meetings";
    case "restoration": return "Restoration (19:00+) - Block work notifications";
    case "transition": return "Transition - Flexible period";
  }
}
