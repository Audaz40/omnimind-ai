import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Table, ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface DataAnalysisPayload {
  title: string;
  summary: string;
  chartType: "bar" | "line" | "pie" | "table";
  xAxisKey: string;
  dataKeys: string[];
  data: ChartDataPoint[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

export function DataAnalyticsViewer({ payload }: { payload: DataAnalysisPayload }) {
  const [activeView, setActiveView] = useState<"bar" | "line" | "pie" | "table">(
    payload.chartType || "bar"
  );
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (!payload.data || !Array.isArray(payload.data) || payload.data.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground">No data available for analysis.</div>;
  }

  const sortedData = [...payload.data].sort((a, b) => {
    if (!sortField) return 0;
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const exportCsv = () => {
    const keys = Object.keys(payload.data[0]);
    const rows = payload.data.map((row) => keys.map((k) => `"${row[k] || ""}"`).join(","));
    const csv = [keys.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "data"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 rounded-2xl border bg-card/90 overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-muted/30 border-b gap-2">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span>{payload.title || "Tabular Data Analysis"}</span>
          </div>
          {payload.summary && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{payload.summary}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveView("bar")}
              className={`p-1.5 rounded-md transition ${activeView === "bar" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Bar Chart"
            >
              <BarChart3 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView("line")}
              className={`p-1.5 rounded-md transition ${activeView === "line" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Line Chart"
            >
              <LineIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView("pie")}
              className={`p-1.5 rounded-md transition ${activeView === "pie" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Pie Chart"
            >
              <PieIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView("table")}
              className={`p-1.5 rounded-md transition ${activeView === "table" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Data Table"
            >
              <Table className="size-3.5" />
            </button>
          </div>

          <Button type="button" size="sm" variant="outline" onClick={exportCsv} className="h-7 text-xs gap-1">
            <Download className="size-3" />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* Chart or Table Content */}
      <div className="p-4 bg-zinc-950/40 min-h-[300px] flex items-center justify-center text-xs">
        {activeView === "bar" && (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payload.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey={payload.xAxisKey} stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                />
                <Legend />
                {payload.dataKeys?.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeView === "line" && (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payload.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey={payload.xAxisKey} stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                />
                <Legend />
                {payload.dataKeys?.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeView === "pie" && (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                />
                <Legend />
                <Pie
                  data={payload.data}
                  dataKey={payload.dataKeys?.[0] || Object.keys(payload.data[0])[1]}
                  nameKey={payload.xAxisKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {payload.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeView === "table" && (
          <div className="w-full overflow-x-auto max-h-64">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {Object.keys(payload.data[0] || {}).map((key) => (
                    <th
                      key={key}
                      onClick={() => {
                        if (sortField === key) setSortAsc(!sortAsc);
                        else {
                          setSortField(key);
                          setSortAsc(true);
                        }
                      }}
                      className="p-2.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>{key}</span>
                        <ArrowUpDown className="size-3 opacity-60" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition">
                    {Object.keys(payload.data[0] || {}).map((key) => (
                      <td key={key} className="p-2.5 truncate max-w-xs">
                        {String(row[key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
