import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { AppManifestSchema, AppFileSchema, AppTemplateSchema } from "@/lib/apps.types";
import { getSavedApps, saveAppToWorkspace, deleteAppFromWorkspace, getAppById } from "@/lib/apps-storage";
import { getAvailableTools } from "@/lib/plugin-system.server";

// Setup browser storage mocks for node vitest environment
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

describe("App Builder Types & Schemas", () => {
  it("validates AppFileSchema correctly", () => {
    const validFile = {
      path: "src/App.tsx",
      language: "tsx",
      content: "export default function App() { return <div>Hello</div>; }",
      description: "Main application component",
    };
    expect(AppFileSchema.parse(validFile)).toEqual(validFile);

    expect(() => AppFileSchema.parse({ path: 123, language: "tsx", content: "" })).toThrow();
  });

  it("validates AppTemplateSchema correctly", () => {
    expect(AppTemplateSchema.parse("react")).toBe("react");
    expect(AppTemplateSchema.parse("html-js")).toBe("html-js");
    expect(AppTemplateSchema.parse("python")).toBe("python");
    expect(AppTemplateSchema.parse("rust")).toBe("rust");
    expect(AppTemplateSchema.parse("go")).toBe("go");
    expect(() => AppTemplateSchema.parse("invalid-template")).toThrow();
  });

  it("validates AppManifestSchema correctly", () => {
    const validManifest = {
      appId: "app-123",
      title: "Todo App",
      description: "Interactive task manager",
      template: "react" as const,
      files: [
        {
          path: "App.tsx",
          language: "tsx",
          content: "export default () => <div>Test</div>;",
        },
      ],
      dependencies: ["lucide-react", "tailwindcss"],
    };

    const parsed = AppManifestSchema.parse(validManifest);
    expect(parsed.title).toBe("Todo App");
    expect(parsed.files.length).toBe(1);
  });
});

describe("App Workspace Storage Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no apps are saved", () => {
    expect(getSavedApps()).toEqual([]);
  });

  it("saves and retrieves an app from workspace", () => {
    const app = {
      title: "Test App",
      description: "Test description",
      template: "react" as const,
      files: [{ path: "App.tsx", language: "tsx", content: "export default () => <h1>Hi</h1>;" }],
    };

    const saved = saveAppToWorkspace(app);
    expect(saved.appId).toBeDefined();
    expect(saved.createdAt).toBeDefined();

    const retrieved = getSavedApps();
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].appId).toBe(saved.appId);
    expect(retrieved[0].title).toBe("Test App");
  });

  it("updates an existing app in workspace when saved with same appId", () => {
    const app = saveAppToWorkspace({
      title: "Initial App",
      description: "Initial description",
      template: "html-js" as const,
      files: [{ path: "index.html", language: "html", content: "<div>Old</div>" }],
    });

    const updated = saveAppToWorkspace({
      ...app,
      title: "Updated App Title",
      files: [{ path: "index.html", language: "html", content: "<div>New</div>" }],
    });

    const apps = getSavedApps();
    expect(apps.length).toBe(1);
    expect(apps[0].title).toBe("Updated App Title");
    expect(apps[0].files[0].content).toBe("<div>New</div>");
  });

  it("deletes an app from workspace by appId", () => {
    const app1 = saveAppToWorkspace({
      title: "App 1",
      description: "Desc 1",
      template: "react" as const,
      files: [{ path: "App.tsx", language: "tsx", content: "" }],
    });
    const app2 = saveAppToWorkspace({
      title: "App 2",
      description: "Desc 2",
      template: "html-js" as const,
      files: [{ path: "index.html", language: "html", content: "" }],
    });

    expect(getSavedApps().length).toBe(2);

    const deleted = deleteAppFromWorkspace(app1.appId!);
    expect(deleted).toBe(true);

    const remaining = getSavedApps();
    expect(remaining.length).toBe(1);
    expect(remaining[0].appId).toBe(app2.appId);
  });

  it("finds app by id using getAppById", () => {
    const app = saveAppToWorkspace({
      title: "Lookup App",
      description: "Lookup desc",
      template: "web-app" as const,
      files: [{ path: "index.html", language: "html", content: "<p>Hello</p>" }],
    });

    const found = getAppById(app.appId!);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Lookup App");

    expect(getAppById("non-existent")).toBeUndefined();
  });
});

describe("Plugin System - Build App & Edit App Tools", () => {
  it("includes build_app and edit_app in available tools regardless of agentMode", () => {
    const toolsAgentOn = getAvailableTools(true);
    expect(toolsAgentOn.build_app).toBeDefined();
    expect(toolsAgentOn.edit_app).toBeDefined();
    expect(toolsAgentOn.web_search).toBeDefined();

    const toolsAgentOff = getAvailableTools(false);
    expect(toolsAgentOff.build_app).toBeDefined();
    expect(toolsAgentOff.edit_app).toBeDefined();
    expect(toolsAgentOff.web_search).toBeUndefined();
  });
});
