// OnboardingWizard.tsx — Step-by-step facility onboarding wizard

import { useState, useEffect } from "react";
import { apiFetch, apiPost } from "@/lib/api";
import { FacilityTypeIndicator, getFacilityTypeConfig } from "@/components/FacilityTypeIndicator";
import type { ZoneTypeDefinition } from "@/types";

// ── Types ────────────────────────────────────────────────

type FacilityTypeKey = "AIRPORT" | "SEAPORT" | "STADIUM" | "TRANSIT_HUB" | "HOSPITAL";

interface ZoneEntry {
  key: string;
  name: string;
  label: string;
  boundary: string; // WKT or simple coordinates
}

interface SensorEntry {
  zoneIndex: number;
  label: string;
  model: string;
  position: { x: number; y: number; z: number };
}

interface OperatorEntry {
  name: string;
  email: string;
  role: "operator" | "supervisor" | "admin";
}

interface FacilityFormData {
  type: FacilityTypeKey | null;
  name: string;
  short_code: string;
  address: string;
  country: string;
  timezone: string;
  zones: ZoneEntry[];
  sensors: SensorEntry[];
  operators: OperatorEntry[];
}

const STEPS = [
  "Facility Type",
  "Details",
  "Zone Setup",
  "Sensors",
  "Operators",
  "Review",
];

const FACILITY_TYPES: FacilityTypeKey[] = [
  "AIRPORT",
  "SEAPORT",
  "STADIUM",
  "TRANSIT_HUB",
  "HOSPITAL",
];

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
];

// ── Step Components ──────────────────────────────────────

function StepFacilityType({
  selected,
  onSelect,
}: {
  selected: FacilityTypeKey | null;
  onSelect: (t: FacilityTypeKey) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-display text-gray-200 mb-2">Select Facility Type</h2>
      <p className="text-xs font-mono text-gray-500 mb-6">
        Choose the type of facility you are onboarding. This determines zone types, KPIs, and compliance frameworks.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FACILITY_TYPES.map((ft) => {
          const config = getFacilityTypeConfig(ft);
          const isSelected = selected === ft;
          return (
            <button
              key={ft}
              onClick={() => onSelect(ft)}
              className={`
                flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all
                ${isSelected
                  ? `border-[${config.color}] bg-[${config.color}]/5`
                  : "border-soterion-border bg-soterion-surface hover:bg-white/5"
                }
              `}
              style={isSelected ? { borderColor: config.color, background: `${config.color}10` } : undefined}
            >
              <span style={{ color: config.color }} className="[&_svg]:w-8 [&_svg]:h-8">
                {config.icon}
              </span>
              <span className="text-sm font-mono font-bold text-gray-200">{config.label}</span>
              <FacilityTypeIndicator type={ft} size="xs" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDetails({
  data,
  onChange,
}: {
  data: FacilityFormData;
  onChange: (patch: Partial<FacilityFormData>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-display text-gray-200 mb-2">Facility Details</h2>
      <p className="text-xs font-mono text-gray-500 mb-6">
        Provide basic information about the facility.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="col-span-2">
          <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Facility Name</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. London Heathrow Airport"
            className="w-full bg-[#0e0e0e] border border-soterion-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-soterion-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Short Code</label>
          <input
            type="text"
            value={data.short_code}
            onChange={(e) => onChange({ short_code: e.target.value.toUpperCase() })}
            placeholder="e.g. LHR"
            maxLength={10}
            className="w-full bg-[#0e0e0e] border border-soterion-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-soterion-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Country Code</label>
          <input
            type="text"
            value={data.country}
            onChange={(e) => onChange({ country: e.target.value.toUpperCase() })}
            placeholder="e.g. GB"
            maxLength={2}
            className="w-full bg-[#0e0e0e] border border-soterion-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-soterion-accent"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Address</label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Full address"
            className="w-full bg-[#0e0e0e] border border-soterion-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-soterion-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Timezone</label>
          <select
            value={data.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="w-full bg-[#0e0e0e] border border-soterion-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-soterion-accent"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function StepZones({
  data,
  zoneTypeDefs,
  onChange,
}: {
  data: FacilityFormData;
  zoneTypeDefs: ZoneTypeDefinition[];
  onChange: (patch: Partial<FacilityFormData>) => void;
}) {
  const addZone = () => {
    onChange({
      zones: [
        ...data.zones,
        { key: zoneTypeDefs[0]?.key ?? "general", name: "", label: "", boundary: "" },
      ],
    });
  };

  const updateZone = (idx: number, patch: Partial<ZoneEntry>) => {
    const zones = [...data.zones];
    zones[idx] = { ...zones[idx]!, ...patch } as ZoneEntry;
    onChange({ zones });
  };

  const removeZone = (idx: number) => {
    onChange({ zones: data.zones.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <h2 className="text-lg font-display text-gray-200 mb-2">Zone Setup</h2>
      <p className="text-xs font-mono text-gray-500 mb-4">
        Configure zones for your facility. Zone types are loaded from the {data.type} template.
      </p>

      {zoneTypeDefs.length > 0 && (
        <div className="mb-4">
          <span className="text-[9px] font-mono uppercase text-gray-500">Available zone types: </span>
          <span className="text-[9px] font-mono text-gray-400">
            {zoneTypeDefs.map((z) => z.label).join(", ")}
          </span>
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {data.zones.map((zone, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 bg-[#0e0e0e] border border-soterion-border rounded-md"
          >
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Type</label>
                <select
                  value={zone.key}
                  onChange={(e) => updateZone(idx, { key: e.target.value })}
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200"
                >
                  {zoneTypeDefs.map((zt) => (
                    <option key={zt.key} value={zt.key}>{zt.label}</option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={zone.name}
                  onChange={(e) => updateZone(idx, { name: e.target.value })}
                  placeholder="Zone name"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={zone.label}
                  onChange={(e) => updateZone(idx, { label: e.target.value })}
                  placeholder="Display label"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600"
                />
              </div>
            </div>
            <button
              onClick={() => removeZone(idx)}
              className="mt-5 p-1 text-gray-600 hover:text-[#ef4444] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addZone}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium
          bg-soterion-accent/10 text-soterion-accent border border-soterion-accent/20 rounded-md
          hover:bg-soterion-accent/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Zone
      </button>
    </div>
  );
}

function StepSensors({
  data,
  onChange,
}: {
  data: FacilityFormData;
  onChange: (patch: Partial<FacilityFormData>) => void;
}) {
  const addSensor = () => {
    onChange({
      sensors: [
        ...data.sensors,
        { zoneIndex: 0, label: "", model: "Hesai JT128", position: { x: 0, y: 0, z: 3.5 } },
      ],
    });
  };

  const updateSensor = (idx: number, patch: Partial<SensorEntry>) => {
    const sensors = [...data.sensors];
    sensors[idx] = { ...sensors[idx]!, ...patch } as SensorEntry;
    onChange({ sensors });
  };

  const removeSensor = (idx: number) => {
    onChange({ sensors: data.sensors.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <h2 className="text-lg font-display text-gray-200 mb-2">Sensor Registration</h2>
      <p className="text-xs font-mono text-gray-500 mb-4">
        Register LiDAR sensors and assign them to zones.
      </p>

      <div className="space-y-3 max-w-3xl">
        {data.sensors.map((sensor, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 bg-[#0e0e0e] border border-soterion-border rounded-md"
          >
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Zone</label>
                <select
                  value={sensor.zoneIndex}
                  onChange={(e) => updateSensor(idx, { zoneIndex: parseInt(e.target.value) })}
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200"
                >
                  {data.zones.map((z, zi) => (
                    <option key={zi} value={zi}>
                      {z.name || z.label || `Zone ${zi + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={sensor.label}
                  onChange={(e) => updateSensor(idx, { label: e.target.value })}
                  placeholder="S-001"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Model</label>
                <input
                  type="text"
                  value={sensor.model}
                  onChange={(e) => updateSensor(idx, { model: e.target.value })}
                  placeholder="Hesai JT128"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Height (m)</label>
                <input
                  type="number"
                  value={sensor.position.z}
                  onChange={(e) =>
                    updateSensor(idx, {
                      position: { ...sensor.position, z: parseFloat(e.target.value) || 0 },
                    })
                  }
                  step="0.5"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200"
                />
              </div>
            </div>
            <button
              onClick={() => removeSensor(idx)}
              className="mt-5 p-1 text-gray-600 hover:text-[#ef4444] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addSensor}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium
          bg-soterion-accent/10 text-soterion-accent border border-soterion-accent/20 rounded-md
          hover:bg-soterion-accent/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Sensor
      </button>
    </div>
  );
}

function StepOperators({
  data,
  onChange,
}: {
  data: FacilityFormData;
  onChange: (patch: Partial<FacilityFormData>) => void;
}) {
  const addOperator = () => {
    onChange({
      operators: [...data.operators, { name: "", email: "", role: "operator" }],
    });
  };

  const updateOperator = (idx: number, patch: Partial<OperatorEntry>) => {
    const operators = [...data.operators];
    operators[idx] = { ...operators[idx]!, ...patch } as OperatorEntry;
    onChange({ operators });
  };

  const removeOperator = (idx: number) => {
    onChange({ operators: data.operators.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <h2 className="text-lg font-display text-gray-200 mb-2">Operator Accounts</h2>
      <p className="text-xs font-mono text-gray-500 mb-4">
        Create initial operator accounts for this facility. Passwords will be auto-generated and emailed.
      </p>

      <div className="space-y-3 max-w-2xl">
        {data.operators.map((op, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 bg-[#0e0e0e] border border-soterion-border rounded-md"
          >
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={op.name}
                  onChange={(e) => updateOperator(idx, { name: e.target.value })}
                  placeholder="Full name"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={op.email}
                  onChange={(e) => updateOperator(idx, { email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Role</label>
                <select
                  value={op.role}
                  onChange={(e) => updateOperator(idx, { role: e.target.value as OperatorEntry["role"] })}
                  className="w-full bg-[#080808] border border-soterion-border rounded px-2 py-1.5 text-xs font-mono text-gray-200"
                >
                  <option value="operator">Operator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => removeOperator(idx)}
              className="mt-5 p-1 text-gray-600 hover:text-[#ef4444] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addOperator}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium
          bg-soterion-accent/10 text-soterion-accent border border-soterion-accent/20 rounded-md
          hover:bg-soterion-accent/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Operator
      </button>
    </div>
  );
}

function StepReview({
  data,
}: {
  data: FacilityFormData;
}) {
  const config = getFacilityTypeConfig(data.type ?? undefined);

  return (
    <div>
      <h2 className="text-lg font-display text-gray-200 mb-2">Review & Confirm</h2>
      <p className="text-xs font-mono text-gray-500 mb-6">
        Review all details before creating the facility.
      </p>

      <div className="space-y-4 max-w-2xl">
        {/* Facility info */}
        <div className="p-4 bg-[#0e0e0e] border border-soterion-border rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <span style={{ color: config.color }}>{config.icon}</span>
            <span className="text-sm font-mono font-bold text-gray-200">{data.name || "Unnamed"}</span>
            <FacilityTypeIndicator type={data.type ?? undefined} size="xs" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-gray-500">Short Code: </span>
              <span className="text-gray-300">{data.short_code || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500">Country: </span>
              <span className="text-gray-300">{data.country || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500">Address: </span>
              <span className="text-gray-300">{data.address || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500">Timezone: </span>
              <span className="text-gray-300">{data.timezone}</span>
            </div>
          </div>
        </div>

        {/* Zones */}
        <div className="p-4 bg-[#0e0e0e] border border-soterion-border rounded-lg">
          <h3 className="text-xs font-mono font-bold uppercase text-gray-400 mb-2">
            Zones ({data.zones.length})
          </h3>
          {data.zones.length === 0 ? (
            <span className="text-[10px] font-mono text-gray-600">No zones configured</span>
          ) : (
            <div className="space-y-1">
              {data.zones.map((z, i) => (
                <div key={i} className="text-[10px] font-mono text-gray-300">
                  {z.name || z.label || `Zone ${i + 1}`} ({z.key})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sensors */}
        <div className="p-4 bg-[#0e0e0e] border border-soterion-border rounded-lg">
          <h3 className="text-xs font-mono font-bold uppercase text-gray-400 mb-2">
            Sensors ({data.sensors.length})
          </h3>
          {data.sensors.length === 0 ? (
            <span className="text-[10px] font-mono text-gray-600">No sensors registered</span>
          ) : (
            <div className="space-y-1">
              {data.sensors.map((s, i) => (
                <div key={i} className="text-[10px] font-mono text-gray-300">
                  {s.label || `Sensor ${i + 1}`} - {s.model} (Zone: {data.zones[s.zoneIndex]?.name || s.zoneIndex + 1})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operators */}
        <div className="p-4 bg-[#0e0e0e] border border-soterion-border rounded-lg">
          <h3 className="text-xs font-mono font-bold uppercase text-gray-400 mb-2">
            Operators ({data.operators.length})
          </h3>
          {data.operators.length === 0 ? (
            <span className="text-[10px] font-mono text-gray-600">No operators added</span>
          ) : (
            <div className="space-y-1">
              {data.operators.map((op, i) => (
                <div key={i} className="text-[10px] font-mono text-gray-300">
                  {op.name} ({op.email}) - {op.role}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard ──────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneTypeDefs, setZoneTypeDefs] = useState<ZoneTypeDefinition[]>([]);

  const [data, setData] = useState<FacilityFormData>({
    type: null,
    name: "",
    short_code: "",
    address: "",
    country: "",
    timezone: "UTC",
    zones: [],
    sensors: [],
    operators: [],
  });

  const update = (patch: Partial<FacilityFormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  // Fetch zone type definitions when facility type changes
  useEffect(() => {
    if (!data.type) return;
    apiFetch<ZoneTypeDefinition[]>(`/api/v1/facilities/zone-types/${data.type}`)
      .then(setZoneTypeDefs)
      .catch(() => {
        // Fallback: use some defaults
        setZoneTypeDefs([]);
      });
  }, [data.type]);

  const canNext = () => {
    switch (step) {
      case 0: return data.type !== null;
      case 1: return data.name.trim().length > 0 && data.short_code.trim().length > 0;
      case 2: return true; // zones optional
      case 3: return true; // sensors optional
      case 4: return true; // operators optional
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/api/v1/facilities", {
        type: data.type,
        name: data.name,
        short_code: data.short_code,
        address: data.address,
        country_code: data.country,
        timezone: data.timezone,
        zones: data.zones,
        sensors: data.sensors,
        operators: data.operators,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create facility");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-display text-gray-200">Facility Created</h2>
        <p className="text-xs font-mono text-gray-500">
          {data.name} has been successfully onboarded.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setStep(0);
            setData({
              type: null,
              name: "",
              short_code: "",
              address: "",
              country: "",
              timezone: "UTC",
              zones: [],
              sensors: [],
              operators: [],
            });
          }}
          className="px-4 py-2 text-xs font-mono bg-soterion-accent/10 text-soterion-accent border border-soterion-accent/20 rounded-md hover:bg-soterion-accent/20 transition-colors"
        >
          Onboard Another
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono transition-colors ${
                i === step
                  ? "bg-soterion-accent/10 text-soterion-accent border border-soterion-accent/30"
                  : i < step
                    ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 cursor-pointer"
                    : "bg-soterion-surface text-gray-600 border border-soterion-border"
              }`}
            >
              <span className="font-bold">{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < step ? "bg-[#22c55e]/30" : "bg-soterion-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 0 && (
          <StepFacilityType
            selected={data.type}
            onSelect={(t) => update({ type: t })}
          />
        )}
        {step === 1 && <StepDetails data={data} onChange={update} />}
        {step === 2 && <StepZones data={data} zoneTypeDefs={zoneTypeDefs} onChange={update} />}
        {step === 3 && <StepSensors data={data} onChange={update} />}
        {step === 4 && <StepOperators data={data} onChange={update} />}
        {step === 5 && <StepReview data={data} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-soterion-border mt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-xs font-mono text-gray-400 border border-soterion-border rounded-md
            hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {error && (
          <span className="text-[10px] font-mono text-[#ef4444]">{error}</span>
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="px-6 py-2 text-xs font-mono font-medium bg-soterion-accent text-[#080808] rounded-md
              hover:bg-soterion-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-xs font-mono font-medium bg-[#22c55e] text-[#080808] rounded-md
              hover:bg-[#22c55e]/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Facility"}
          </button>
        )}
      </div>
    </div>
  );
}
