import { useState, useEffect, useRef, useCallback } from "react";

// ── Widget definitions ───────────────────────────────────

export interface WidgetVisibility {
  digitalTwin: boolean;
  threatFeed: boolean;
  zonePanel: boolean;
  heatmap: boolean;
  shiftScorecard: boolean;
  flowFunnel: boolean;
  surgePrediction: boolean;
  roiCalculator: boolean;
}

const STORAGE_KEY = "soterion_widget_prefs";

const DEFAULT_VISIBILITY: WidgetVisibility = {
  digitalTwin: true,
  threatFeed: true,
  zonePanel: true,
  heatmap: true,
  shiftScorecard: true,
  flowFunnel: true,
  surgePrediction: true,
  roiCalculator: true,
};

const WIDGET_LABELS: Record<keyof WidgetVisibility, string> = {
  digitalTwin: "Digital Twin",
  threatFeed: "Threat Feed",
  zonePanel: "Zone Panel",
  heatmap: "Heatmap",
  shiftScorecard: "Shift Scorecard",
  flowFunnel: "Flow Funnel",
  surgePrediction: "Surge Prediction",
  roiCalculator: "ROI Calculator",
};

// ── Load / Save helpers ──────────────────────────────────

export function loadWidgetPrefs(): WidgetVisibility {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_VISIBILITY, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_VISIBILITY };
}

function saveWidgetPrefs(prefs: WidgetVisibility) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// ── Hook ─────────────────────────────────────────────────

export function useWidgetPrefs() {
  const [prefs, setPrefs] = useState<WidgetVisibility>(loadWidgetPrefs);

  const update = useCallback((key: keyof WidgetVisibility, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveWidgetPrefs(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveWidgetPrefs(DEFAULT_VISIBILITY);
    setPrefs({ ...DEFAULT_VISIBILITY });
  }, []);

  return { prefs, update, reset };
}

// ── Component ────────────────────────────────────────────

export function DashboardCustomizer({
  prefs,
  onToggle,
  onReset,
}: {
  prefs: WidgetVisibility;
  onToggle: (key: keyof WidgetVisibility, value: boolean) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const visibleCount = Object.values(prefs).filter(Boolean).length;
  const totalCount = Object.keys(prefs).length;

  return (
    <div className="relative" ref={ref}>
      {/* Settings icon button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded-md transition-colors ${
          open
            ? "bg-soterion-accent/10 text-soterion-accent"
            : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
        }`}
        title="Customize dashboard widgets"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-soterion-border bg-soterion-surface shadow-xl shadow-black/50 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-soterion-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
              Visible Widgets
            </span>
            <span className="text-[10px] font-mono text-soterion-accent">
              {visibleCount}/{totalCount}
            </span>
          </div>

          <div className="p-2 space-y-0.5">
            {(Object.keys(WIDGET_LABELS) as (keyof WidgetVisibility)[]).map(
              (key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => onToggle(key, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-soterion-border bg-[#0a0a0a] text-soterion-accent focus:ring-soterion-accent focus:ring-offset-0 accent-[#f59e0b]"
                  />
                  <span className="text-xs font-mono text-gray-300">
                    {WIDGET_LABELS[key]}
                  </span>
                </label>
              )
            )}
          </div>

          <div className="px-3 py-2 border-t border-soterion-border">
            <button
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="w-full text-center text-[10px] font-mono text-gray-500 hover:text-soterion-accent py-1.5 rounded hover:bg-white/5 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
