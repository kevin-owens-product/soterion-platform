import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { signup, getOnboardingStatus, type SignupRequest, type SignupResponse } from "@/lib/api";

// ── Facility type cards ────────────────────────────────

const FACILITY_TYPES = [
  {
    type: "AIRPORT",
    label: "Airport",
    description: "Terminals, security checkpoints, gates, and baggage claim zones.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
      </svg>
    ),
  },
  {
    type: "SEAPORT",
    label: "Seaport",
    description: "Berths, container yards, customs, and gate operations.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
      </svg>
    ),
  },
  {
    type: "STADIUM",
    label: "Stadium",
    description: "Turnstiles, concourses, stands, and concession areas.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-7.54 0" />
      </svg>
    ),
  },
  {
    type: "HOSPITAL",
    label: "Hospital",
    description: "Emergency, wards, reception, and restricted operating areas.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    type: "TRANSIT_HUB",
    label: "Transit Hub",
    description: "Platforms, concourses, ticket halls, and fare barriers.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5 0v-.375c0-.621.504-1.125 1.125-1.125H18.75m-7.5 0H6.375c-.621 0-1.125.504-1.125 1.125v3.5" />
      </svg>
    ),
  },
];

// ── Step indicator ─────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Facility Type", "Details", "Ready"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`w-8 h-px ${isDone ? "bg-[#f59e0b]" : "bg-[#1a1a1a]"}`} />}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                isActive ? "bg-[#f59e0b] text-black" : isDone ? "bg-[#f59e0b]/20 text-[#f59e0b]" : "bg-[#1a1a1a] text-gray-600"
              }`}>
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : stepNum}
              </div>
              <span className={`text-[10px] font-mono ${isActive ? "text-gray-200" : "text-gray-600"}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Onboarding checklist ───────────────────────────────

function OnboardingChecklist({ facilityId }: { facilityId: string }) {
  const { data } = useQuery({
    queryKey: ["onboarding-status", facilityId],
    queryFn: () => getOnboardingStatus(facilityId),
    refetchInterval: 10_000,
  });

  const stepLabels: Record<string, string> = {
    account_created: "Account Created",
    zones_configured: "Zones Configured",
    sensors_registered: "Sensors Registered",
    first_ingest_received: "First Data Ingest",
    first_alert_generated: "First Alert Generated",
  };

  if (!data) return null;

  return (
    <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-gray-300 font-semibold">Onboarding Progress</h3>
        <span className="text-[10px] font-mono text-[#f59e0b]">{data.completionPct}% complete</span>
      </div>
      <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
          style={{ width: `${data.completionPct}%` }}
        />
      </div>
      <div className="space-y-2">
        {data.steps.map((s) => (
          <div key={s.step} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              s.completed ? "bg-[#22c55e]/20" : "bg-[#1a1a1a]"
            }`}>
              {s.completed ? (
                <svg className="w-3 h-3 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              )}
            </div>
            <span className={`text-xs font-mono ${s.completed ? "text-gray-300" : "text-gray-600"}`}>
              {stepLabels[s.step] ?? s.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Signup component ─────────────────────────────

export function Signup() {
  const [step, setStep] = useState(1);
  const [facilityType, setFacilityType] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<SignupResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const signupMutation = useMutation({
    mutationFn: (data: SignupRequest) => signup(data),
    onSuccess: (data) => {
      setResult(data);
      setStep(3);
    },
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = () => {
    signupMutation.mutate({
      facilityName,
      facilityType,
      contactName,
      contactEmail,
      password,
    });
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#f59e0b] font-bold text-sm tracking-wide">SOTERION</span>
            <span className="text-gray-600 text-xs">|</span>
            <span className="text-xs text-gray-400">Get Started</span>
          </div>
          <a href="/login" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
            Already have an account?
          </a>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center py-12 px-6">
        <div className="w-full max-w-2xl">
          <StepIndicator current={step} />

          {/* Step 1: Facility type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h1 className="text-xl text-gray-200 font-semibold mb-1">Select your facility type</h1>
                <p className="text-xs text-gray-500">This determines your zone taxonomy, anomaly types, and compliance frameworks.</p>
              </div>
              <div className="space-y-2">
                {FACILITY_TYPES.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => { setFacilityType(ft.type); setStep(2); }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-lg border transition-all text-left ${
                      facilityType === ft.type
                        ? "border-[#f59e0b] bg-[#f59e0b]/5"
                        : "border-[#1a1a1a] bg-[#0e0e0e] hover:border-[#2a2a2a] hover:bg-[#111111]"
                    }`}
                  >
                    <div className={`${facilityType === ft.type ? "text-[#f59e0b]" : "text-gray-500"}`}>
                      {ft.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 font-medium">{ft.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{ft.description}</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details form */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-xl text-gray-200 font-semibold mb-1">Facility details</h1>
                <p className="text-xs text-gray-500">
                  Setting up a{" "}
                  <button onClick={() => setStep(1)} className="text-[#f59e0b] hover:underline underline-offset-4">
                    {FACILITY_TYPES.find((f) => f.type === facilityType)?.label ?? facilityType}
                  </button>
                </p>
              </div>

              <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-1.5">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="e.g. London Heathrow T2"
                    className="w-full bg-[#080808] border border-[#1a1a1a] rounded-md px-3 py-2.5 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-1.5">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full bg-[#080808] border border-[#1a1a1a] rounded-md px-3 py-2.5 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jane@facility.io"
                    className="w-full bg-[#080808] border border-[#1a1a1a] rounded-md px-3 py-2.5 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 12 characters"
                    className="w-full bg-[#080808] border border-[#1a1a1a] rounded-md px-3 py-2.5 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
                  />
                </div>

                {signupMutation.isError && (
                  <div className="text-[10px] font-mono text-[#ef4444]">
                    Signup failed. Please try again.
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-md text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!facilityName || !contactName || !contactEmail || !password || signupMutation.isPending}
                    className="flex-1 px-4 py-2.5 rounded-md text-xs font-mono font-bold bg-[#f59e0b] text-black hover:bg-[#f59e0b]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {signupMutation.isPending ? "Creating sandbox..." : "Create Sandbox"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && result && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h1 className="text-xl text-gray-200 font-semibold mb-1">Your sandbox is ready!</h1>
                <p className="text-xs text-gray-500">Here are your credentials and API key to get started.</p>
              </div>

              <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-5 space-y-4">
                {/* Login credentials */}
                <div>
                  <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-2">Login Credentials</h3>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="text-gray-200">{contactEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Password:</span>
                      <span className="text-gray-400">(as entered)</span>
                    </div>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-2">API Key</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-[11px] font-mono text-[#f59e0b] overflow-x-auto">
                      {result.apiKey}
                    </code>
                    <button
                      onClick={() => handleCopy(result.apiKey, "apiKey")}
                      className="px-3 py-2 rounded border border-[#1a1a1a] text-[10px] font-mono text-gray-400 hover:text-gray-200 hover:border-[#2a2a2a] transition-colors shrink-0"
                    >
                      {copied === "apiKey" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Edge SDK install */}
                <div>
                  <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-2">Edge SDK</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#080808] border border-[#1a1a1a] rounded px-3 py-2 text-[11px] font-mono text-gray-300">
                      npm install @soterion/edge-sdk
                    </code>
                    <button
                      onClick={() => handleCopy("npm install @soterion/edge-sdk", "sdk")}
                      className="px-3 py-2 rounded border border-[#1a1a1a] text-[10px] font-mono text-gray-400 hover:text-gray-200 hover:border-[#2a2a2a] transition-colors shrink-0"
                    >
                      {copied === "sdk" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* IDs */}
                <div className="text-[10px] font-mono text-gray-600 space-y-1 pt-2 border-t border-[#1a1a1a]">
                  <div>Facility ID: {result.facilityId}</div>
                  <div>Operator ID: {result.operatorId}</div>
                </div>
              </div>

              {/* Go to Dashboard */}
              <div className="flex items-center gap-3">
                <a
                  href="/login"
                  className="flex-1 text-center px-4 py-3 rounded-md text-xs font-mono font-bold bg-[#f59e0b] text-black hover:bg-[#f59e0b]/90 transition-colors"
                >
                  Go to Dashboard
                </a>
                <a
                  href="/docs/api"
                  className="px-4 py-3 rounded-md text-xs font-mono text-gray-400 border border-[#1a1a1a] hover:text-gray-200 hover:border-[#2a2a2a] transition-colors"
                >
                  API Docs
                </a>
              </div>

              {/* Onboarding checklist */}
              <OnboardingChecklist facilityId={result.facilityId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
