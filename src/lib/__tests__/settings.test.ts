import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { getNovaSettings, saveNovaSettings } from "@/lib/settings-storage";
import { getAvailableTools } from "@/lib/plugin-system.server";

beforeAll(() => {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => {
      for (const k in store) delete store[k];
    },
    length: 0,
    key: () => null,
  };
  if (typeof globalThis.window === "undefined") {
    (globalThis as unknown as Record<string, unknown>).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
});

describe("Nova User Settings Storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default settings when localStorage is empty", () => {
    const settings = getNovaSettings();
    expect(settings.theme).toBe("dark");
    expect(settings.voiceEnabled).toBe(true);
    expect(settings.agentPreset).toBe("balanced");
  });

  it("saves and loads updated settings", () => {
    saveNovaSettings({
      customInstructions: "Always write clean TypeScript",
      theme: "emerald",
      voiceLanguage: "es-ES",
    });

    const loaded = getNovaSettings();
    expect(loaded.customInstructions).toBe("Always write clean TypeScript");
    expect(loaded.theme).toBe("emerald");
    expect(loaded.voiceLanguage).toBe("es-ES");
  });
});

describe("New Advanced Plugins - Diagram & Tabular Data Tools", () => {
  it("registers and makes generate_diagram and analyze_tabular_data available", () => {
    const tools = getAvailableTools(true);
    expect(tools.generate_diagram).toBeDefined();
    expect(tools.analyze_tabular_data).toBeDefined();
    expect(tools.build_app).toBeDefined();
    expect(tools.edit_app).toBeDefined();
  });
});
