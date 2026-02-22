import type { DataModules } from "@/data/interfaces";
import { createLocalDataModules } from "@/data/local";

export type { DataModules } from "@/data/interfaces";
export * from "@/data/entities";

let activeDataModules: DataModules = createLocalDataModules();

export function getDataModules(): DataModules {
  return activeDataModules;
}

export function setDataModules(modules: DataModules): void {
  activeDataModules = modules;
}

export function resetToLocalDataModules(): void {
  activeDataModules = createLocalDataModules();
}
