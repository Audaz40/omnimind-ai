/**
 * Storage and manager for User Personalization & AI Settings
 */
export interface NovaSettings {
  customInstructions: string;
  theme: "dark" | "midnight" | "emerald" | "light";
  voiceEnabled: boolean;
  voiceLanguage: "es-ES" | "en-US" | "auto";
  agentPreset: "creative" | "balanced" | "autonomous";
  autoSaveApps: boolean;
}

const SETTINGS_KEY = "nova_user_settings_v1";

const DEFAULT_SETTINGS: NovaSettings = {
  customInstructions: "",
  theme: "dark",
  voiceEnabled: true,
  voiceLanguage: "auto",
  agentPreset: "balanced",
  autoSaveApps: true,
};

export function getNovaSettings(): NovaSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Failed to load Nova settings", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveNovaSettings(settings: Partial<NovaSettings>): NovaSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const current = getNovaSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("nova:settings-updated", { detail: { settings: updated } }));
    return updated;
  } catch (e) {
    console.error("Failed to save Nova settings", e);
    return DEFAULT_SETTINGS;
  }
}
