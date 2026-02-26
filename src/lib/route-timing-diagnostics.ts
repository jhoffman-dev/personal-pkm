export type RouteTimingSummary = {
  route: string;
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
};

const MAX_SAMPLES_PER_ROUTE = 120;
const LOG_EVERY_N_SAMPLES = 20;

const routeSamples = new Map<string, number[]>();
let sampleCounter = 0;

function roundMs(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentile(sortedSamples: number[], ratio: number): number {
  if (sortedSamples.length === 0) {
    return 0;
  }

  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const index = Math.floor((sortedSamples.length - 1) * clampedRatio);
  return sortedSamples[index] ?? 0;
}

function buildRouteTimingSummary(
  route: string,
  samples: number[],
): RouteTimingSummary {
  const sorted = [...samples].sort((left, right) => left - right);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const avg = samples.length > 0 ? total / samples.length : 0;

  return {
    route,
    count: samples.length,
    avgMs: roundMs(avg),
    p50Ms: roundMs(percentile(sorted, 0.5)),
    p95Ms: roundMs(percentile(sorted, 0.95)),
    minMs: roundMs(sorted[0] ?? 0),
    maxMs: roundMs(sorted[sorted.length - 1] ?? 0),
  };
}

export function getRouteTimingSnapshot(): RouteTimingSummary[] {
  return Array.from(routeSamples.entries())
    .map(([route, samples]) => buildRouteTimingSummary(route, samples))
    .sort((left, right) => left.route.localeCompare(right.route));
}

export function resetRouteTimingDiagnostics(): void {
  routeSamples.clear();
  sampleCounter = 0;
}

export function recordRouteTimingSample(
  route: string,
  durationMs: number,
): void {
  if (!import.meta.env.DEV) {
    return;
  }

  if (!route || !Number.isFinite(durationMs) || durationMs < 0) {
    return;
  }

  const existing = routeSamples.get(route) ?? [];
  const next = [...existing, durationMs].slice(-MAX_SAMPLES_PER_ROUTE);
  routeSamples.set(route, next);
  sampleCounter += 1;

  if (sampleCounter % LOG_EVERY_N_SAMPLES === 0) {
    console.table(getRouteTimingSnapshot());
  }
}

declare global {
  interface Window {
    __pkmRouteTimingDiagnostics?: {
      snapshot: () => RouteTimingSummary[];
      reset: () => void;
    };
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__pkmRouteTimingDiagnostics = {
    snapshot: getRouteTimingSnapshot,
    reset: resetRouteTimingDiagnostics,
  };
}
