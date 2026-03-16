import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getModels,
  retrainModel,
  getModelMetrics,
  type MLModel,
  type ModelMetrics,
} from "@/lib/api";

// ── Status badge ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", label: "Active" },
    training: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", label: "Training" },
    queued: { bg: "bg-[#06b6d4]/15", text: "text-[#06b6d4]", label: "Queued" },
  };
  const s = map[status] ?? { bg: "bg-[#06b6d4]/15", text: "text-[#06b6d4]", label: "Queued" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-[#22c55e]" : status === "training" ? "bg-[#f59e0b] animate-pulse" : "bg-[#06b6d4]"}`} />
      {s.label}
    </span>
  );
}

// ── Progress bar ───────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#f59e0b] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

// ── Accuracy bar chart (pure CSS) ─────────────────────

function AccuracyChart({ history }: { history: { version: string; accuracy: number; date: string }[] }) {
  if (!history?.length) return <p className="text-xs text-gray-500 font-mono">No history available</p>;
  const maxAcc = 1;
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wide">Accuracy Trend</h4>
      <div className="flex items-end gap-2 h-32">
        {history.map((pt) => {
          const heightPct = (pt.accuracy / maxAcc) * 100;
          const color = pt.accuracy >= 0.9 ? "#22c55e" : pt.accuracy >= 0.8 ? "#f59e0b" : "#ef4444";
          return (
            <div key={pt.version} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono text-gray-400">{(pt.accuracy * 100).toFixed(0)}%</span>
              <div className="w-full bg-[#1a1a1a] rounded-t relative" style={{ height: "100px" }}>
                <div
                  className="absolute bottom-0 w-full rounded-t transition-all duration-500"
                  style={{ height: `${heightPct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-[9px] font-mono text-gray-500">v{pt.version}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Confusion matrix grid ─────────────────────────────

function ConfusionMatrixGrid({ matrix }: { matrix: { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number } }) {
  if (!matrix) return null;
  const cells = [
    { label: "True +", value: matrix.truePositive, color: "#22c55e" },
    { label: "False +", value: matrix.falsePositive, color: "#ef4444" },
    { label: "False -", value: matrix.falseNegative, color: "#f97316" },
    { label: "True -", value: matrix.trueNegative, color: "#22c55e" },
  ];
  const max = Math.max(...cells.map((c) => c.value), 1);

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wide">Confusion Matrix</h4>
      <div className="grid grid-cols-2 gap-1.5">
        {cells.map((c) => {
          const opacity = 0.15 + (c.value / max) * 0.55;
          return (
            <div
              key={c.label}
              className="rounded-md p-3 text-center"
              style={{ backgroundColor: `${c.color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}` }}
            >
              <div className="text-lg font-mono font-bold" style={{ color: c.color }}>
                {c.value.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono text-gray-400 mt-1">{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top misclassifications table ──────────────────────

function MisclassificationsTable({ items }: { items: { predicted: string; actual: string; count: number }[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wide">Top Misclassifications</h4>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left py-1 pr-3">Predicted</th>
            <th className="text-left py-1 pr-3">Actual</th>
            <th className="text-right py-1">Count</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-t border-[#1a1a1a]">
              <td className="py-1.5 pr-3 text-[#ef4444]">{row.predicted}</td>
              <td className="py-1.5 pr-3 text-gray-300">{row.actual}</td>
              <td className="py-1.5 text-right text-gray-400">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Model detail panel ─────────────────────────────────

function ModelDetail({ model, onClose }: { model: MLModel; onClose: () => void }) {
  const { data: metrics, isLoading } = useQuery<ModelMetrics>({
    queryKey: ["model-metrics", model.id],
    queryFn: () => getModelMetrics(model.id),
  });

  return (
    <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-mono text-gray-200 font-semibold">
            {model.modelKey} <span className="text-gray-500">v{model.version}</span>
          </h3>
          <p className="text-[10px] font-mono text-gray-500 mt-0.5">{model.facilityType}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors text-xs font-mono"
        >
          Close
        </button>
      </div>

      {isLoading ? (
        <div className="text-xs font-mono text-gray-500 animate-pulse">Loading metrics...</div>
      ) : metrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AccuracyChart history={metrics.accuracyHistory} />
          <ConfusionMatrixGrid matrix={metrics.confusionMatrix} />
          <MisclassificationsTable items={metrics.topMisclassifications} />
        </div>
      ) : (
        <p className="text-xs font-mono text-gray-500">No metrics available for this model.</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────

export function ModelTraining() {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [retrainMessage, setRetrainMessage] = useState<string | null>(null);

  const { data: models, isLoading, error } = useQuery({
    queryKey: ["admin-models"],
    queryFn: getModels,
  });

  const retrainMutation = useMutation({
    mutationFn: (id: string) => retrainModel(id),
    onSuccess: (data) => {
      setRetrainMessage(`Retraining queued: Job ${data.jobId} (est. ${data.estimatedMinutes} min)`);
      queryClient.invalidateQueries({ queryKey: ["admin-models"] });
      setTimeout(() => setRetrainMessage(null), 5000);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display text-gray-200">Model Training Pipeline</h1>
          <p className="text-[11px] font-mono text-gray-500 mt-1">
            ML model registry, training status, and performance metrics
          </p>
        </div>
      </div>

      {/* Retrain notification */}
      {retrainMessage && (
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-md px-4 py-2.5 text-xs font-mono text-[#f59e0b]">
          {retrainMessage}
        </div>
      )}

      {/* Loading / Error */}
      {isLoading && (
        <div className="text-xs font-mono text-gray-500 animate-pulse">Loading model registry...</div>
      )}
      {error && (
        <div className="text-xs font-mono text-[#ef4444]">Failed to load models.</div>
      )}

      {/* Model registry table */}
      {models && models.length > 0 && (
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#1a1a1a]">
                <th className="text-left px-4 py-3">Model</th>
                <th className="text-left px-4 py-3">Facility Type</th>
                <th className="text-left px-4 py-3">Version</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Accuracy</th>
                <th className="text-right px-4 py-3">Samples</th>
                <th className="text-left px-4 py-3">Last Trained</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-[#1a1a1a] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => setSelectedModel(m)}
                >
                  <td className="px-4 py-3 text-gray-200 font-semibold">{m.modelKey}</td>
                  <td className="px-4 py-3 text-gray-400">{m.facilityType}</td>
                  <td className="px-4 py-3 text-gray-400">v{m.version}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                    {m.status === "training" && m.progress != null && (
                      <div className="mt-1 w-24">
                        <ProgressBar pct={m.progress} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.accuracy != null ? (
                      <span className={m.accuracy >= 0.9 ? "text-[#22c55e]" : m.accuracy >= 0.8 ? "text-[#f59e0b]" : "text-[#ef4444]"}>
                        {(m.accuracy * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-600">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {m.samplesUsed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {m.trainedAt ? new Date(m.trainedAt).toLocaleDateString() : "--"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retrainMutation.mutate(m.id);
                      }}
                      disabled={m.status === "training" || retrainMutation.isPending}
                      className="px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wide bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Retrain
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selectedModel && (
        <ModelDetail model={selectedModel} onClose={() => setSelectedModel(null)} />
      )}
    </div>
  );
}
