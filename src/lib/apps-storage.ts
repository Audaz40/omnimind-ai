/**
 * Client storage and manager for Saved Apps (App Studio Workspace)
 */
import type { AppManifest } from "./apps.types";

const STORAGE_KEY = "nova_saved_apps_workspace_v1";

export function getSavedApps(): AppManifest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load saved apps from storage", e);
    return [];
  }
}

export function saveAppToWorkspace(app: AppManifest): AppManifest {
  if (typeof window === "undefined") return app;
  try {
    const apps = getSavedApps();
    const now = new Date().toISOString();
    const appId = app.appId || `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const existingIndex = apps.findIndex((a) => a.appId === appId || (a.title === app.title && a.template === app.template));
    const updatedApp: AppManifest = {
      ...app,
      appId,
      createdAt: existingIndex >= 0 ? apps[existingIndex].createdAt || now : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      apps[existingIndex] = updatedApp;
    } else {
      apps.unshift(updatedApp);
    }

    // Keep top 50 apps in localStorage to avoid quota overflow
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps.slice(0, 50)));
    
    // Dispatch custom event so App Studio modals/galleries update in real time
    window.dispatchEvent(new CustomEvent("nova:apps-updated", { detail: { apps } }));
    return updatedApp;
  } catch (e) {
    console.error("Failed to save app to workspace", e);
    return app;
  }
}

export function deleteAppFromWorkspace(appId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const apps = getSavedApps();
    const filtered = apps.filter((a) => a.appId !== appId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("nova:apps-updated", { detail: { apps: filtered } }));
    return true;
  } catch (e) {
    console.error("Failed to delete app from workspace", e);
    return false;
  }
}

export function getAppById(appId: string): AppManifest | undefined {
  const apps = getSavedApps();
  return apps.find((a) => a.appId === appId);
}

export function exportAppAsZipOrDownload(app: AppManifest) {
  if (typeof window === "undefined") return;
  
  // We can create a multi-file JSON/text structure or individual files downloaded
  // Or download as single consolidated project file / tar/zip simulation
  try {
    const projectSummary = {
      ...app,
      exportedAt: new Date().toISOString(),
      generator: "NOVA AI App Builder",
    };
    
    const blob = new Blob([JSON.stringify(projectSummary, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "nova-app"}-manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed", e);
  }
}
