// FacilitySwitcher.tsx — Multi-facility header dropdown switcher

import { useState, useRef, useEffect } from "react";
import { useFacilityStore } from "@/store/facilityStore";
import { FacilityTypeIndicator, getFacilityTypeConfig } from "@/components/FacilityTypeIndicator";
import { apiFetch } from "@/lib/api";
import { useAlertsStore } from "@/store/alertsStore";
import { useSensorStore } from "@/store/sensorStore";

interface FacilitySummary {
  id: string;
  name: string;
  type: string;
  shortCode: string;
}

export function FacilitySwitcher() {
  const facility = useFacilityStore((s) => s.facility);
  const fetchConfig = useFacilityStore((s) => s.fetchConfig);
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch list of facilities the operator has access to
  useEffect(() => {
    apiFetch<FacilitySummary[]>("/api/v1/facilities")
      .then(setFacilities)
      .catch(() => {
        // Fallback: show current facility only
        if (facility) {
          setFacilities([
            {
              id: facility.id,
              name: facility.name,
              type: facility.type,
              shortCode: "",
            },
          ]);
        }
      });
  }, [facility]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSwitch = async (id: string) => {
    setOpen(false);
    if (id === facility?.id) return;

    // Store selected facility ID for API to use
    localStorage.setItem("soterion_facility_id", id);

    // Reset stores
    useAlertsStore.getState().disconnectWebSocket();
    useAlertsStore.getState().setAlerts([]);
    useSensorStore.getState().setSensors([]);

    // Reload facility config (this will reconnect WebSockets via AppShell effect)
    await fetchConfig();
  };

  // Don't show switcher if only one facility
  if (facilities.length <= 1) return null;

  const currentConfig = getFacilityTypeConfig(facility?.type);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-soterion-border
          hover:bg-white/5 transition-colors"
      >
        <span style={{ color: currentConfig.color }}>{currentConfig.icon}</span>
        <span className="text-xs font-mono text-gray-300 max-w-[120px] truncate">
          {facility?.name ?? "Select Facility"}
        </span>
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-soterion-border
          bg-soterion-surface shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-soterion-border">
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">
              Switch Facility
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {facilities.map((f) => {
              const config = getFacilityTypeConfig(f.type);
              const isActive = f.id === facility?.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleSwitch(f.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-white/5 border-l-2"
                      : "hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                  style={isActive ? { borderLeftColor: config.color } : undefined}
                >
                  <span style={{ color: config.color }}>{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-200 truncate">{f.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {f.shortCode && (
                        <span className="text-[9px] font-mono text-gray-500">{f.shortCode}</span>
                      )}
                      <FacilityTypeIndicator type={f.type} size="xs" showLabel />
                    </div>
                  </div>
                  {isActive && (
                    <svg
                      className="w-4 h-4 shrink-0"
                      style={{ color: config.color }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
