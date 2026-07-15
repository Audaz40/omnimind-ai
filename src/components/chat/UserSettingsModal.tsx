import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getNovaSettings, saveNovaSettings, type NovaSettings } from "@/lib/settings-storage";
import { Settings, Sparkles, Volume2, Palette, Sliders, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<NovaSettings>(getNovaSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getNovaSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveNovaSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Settings saved successfully!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[650px] p-6 bg-card border border-border shadow-xl rounded-2xl">
        <DialogHeader className="border-b pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Settings className="size-4.5" />
            </div>
            <span>NOVA Personalization & Settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Customize NOVA's behavior, voice narration preferences, and system prompt instructions across all your chats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="font-semibold flex items-center gap-2 text-foreground">
              <Sparkles className="size-4 text-primary" />
              <span>Custom System Instructions (Personal Prompt)</span>
            </label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tell NOVA how you want it to respond globally. E.g., &quot;Always write code in TypeScript&quot;, &quot;Explain like I&apos;m a beginner&quot;, or &quot;Be extremely concise and professional&quot;.
            </p>
            <textarea
              value={settings.customInstructions}
              onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
              placeholder="e.g. Always write code in TypeScript. For UI code, prefer React and Tailwind CSS..."
              rows={4}
              className="w-full rounded-xl border bg-muted/30 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed font-mono"
            />
          </div>

          {/* Voice Narration Settings */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-2 text-foreground">
                  <Volume2 className="size-4 text-blue-400" />
                  <span>Voice Narration & Speech Reader (TTS)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Enable the &quot;Read Aloud&quot; button on NOVA&apos;s responses and microphone speech input.
                </div>
              </div>
              <Switch
                checked={settings.voiceEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, voiceEnabled: v })}
              />
            </div>

            {settings.voiceEnabled && (
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="font-medium text-zinc-400">Speech Language Preset:</span>
                <select
                  value={settings.voiceLanguage}
                  onChange={(e) => setSettings({ ...settings, voiceLanguage: e.target.value as any })}
                  className="rounded-lg border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="auto">Auto Detect (Default)</option>
                  <option value="es-ES">Spanish (Español)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
            )}
          </div>

          {/* AI Behavior Preset */}
          <div className="space-y-3">
            <label className="font-semibold flex items-center gap-2 text-foreground">
              <Sliders className="size-4 text-purple-400" />
              <span>AI Agent Reasoning Preset</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "creative", label: "Creative / Ideation", desc: "Exploratory brainstorms & flexible apps" },
                { id: "balanced", label: "Balanced (Recommended)", desc: "Precise answers with thorough planning" },
                { id: "autonomous", label: "Autonomous Builder", desc: "Aggressive tool chaining & live coding" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, agentPreset: preset.id as any })}
                  className={`p-3 rounded-xl border text-left transition ${
                    settings.agentPreset === preset.id
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "bg-card hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className="text-xs">{preset.label}</div>
                  <div className="text-[10px] opacity-75 mt-1 font-normal leading-tight">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Auto Save Apps */}
          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
            <div className="space-y-0.5">
              <div className="font-semibold flex items-center gap-2 text-foreground">
                <Palette className="size-4 text-emerald-400" />
                <span>Auto-save Built Apps to Studio</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Automatically store all apps created via \`build_app\` in your persistent App Studio Workspace.
              </div>
            </div>
            <Switch
              checked={settings.autoSaveApps}
              onCheckedChange={(v) => setSettings({ ...settings, autoSaveApps: v })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="text-xs bg-primary text-primary-foreground gap-1.5 px-5"
          >
            {saved ? <Check className="size-3.5" /> : null}
            <span>Save Settings</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
