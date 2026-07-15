import { z } from "zod";

export const AppFileSchema = z.object({
  path: z.string().describe("Relative path inside the app (e.g. 'src/App.tsx', 'index.html', 'styles.css', 'main.rs', 'main.py')"),
  language: z.string().describe("Language for syntax highlighting and compilation (e.g. 'tsx', 'jsx', 'html', 'css', 'python', 'rust', 'go', 'cpp', 'sql', 'bash', 'java')"),
  content: z.string().describe("Source code of the file"),
  description: z.string().optional().describe("Short explanation of what this file does"),
});

export type AppFile = z.infer<typeof AppFileSchema>;

export const AppTemplateSchema = z.enum([
  "react",
  "html-js",
  "nextjs",
  "python",
  "node",
  "vue",
  "svelte",
  "web-app",
  "rust",
  "go",
  "c",
  "cpp",
  "java",
  "csharp",
  "ruby",
  "php",
  "sql",
  "bash",
  "swift",
  "kotlin",
  "r",
  "universal-code",
]);

export type AppTemplate = z.infer<typeof AppTemplateSchema>;

export const AppManifestSchema = z.object({
  appId: z.string().optional().describe("Unique identifier for the app"),
  title: z.string().describe("Clear, catchy title of the application"),
  description: z.string().describe("Comprehensive overview of what the app does and its key interactive features"),
  template: AppTemplateSchema.describe("Framework or runtime template best suited for this application"),
  files: z.array(AppFileSchema).min(1).describe("Complete list of source code files required to run the app"),
  entryPoint: z.string().optional().describe("Main file to run or preview first (default: 'index.html', 'App.tsx', 'main.py', 'main.rs')"),
  dependencies: z.union([z.record(z.string()), z.array(z.string())]).optional().describe("List or map of external dependencies or packages needed"),
  instructions: z.string().optional().describe("Any setup instructions or usage tips for the user"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AppManifest = z.infer<typeof AppManifestSchema>;

export interface LivePreviewLog {
  id: string;
  type: "log" | "warn" | "error" | "info" | "stdout" | "stderr";
  message: string;
  timestamp: number;
}
