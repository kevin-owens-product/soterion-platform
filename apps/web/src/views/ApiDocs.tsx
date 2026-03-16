import { useState } from "react";

// ── Types ──────────────────────────────────────────────

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  request?: string;
  response: string;
  curl: string;
}

interface EndpointGroup {
  name: string;
  description: string;
  endpoints: Endpoint[];
}

// ── Endpoint data ──────────────────────────────────────

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    name: "Authentication",
    description: "Obtain and refresh JWT tokens for API access.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/auth/login",
        description: "Authenticate with email and password. Returns a JWT token.",
        request: `{
  "email": "operator@facility.io",
  "password": "your-password"
}`,
        response: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "operator": {
    "id": "uuid",
    "name": "Jane Operator",
    "email": "operator@facility.io",
    "role": "operator"
  }
}`,
        curl: `curl -X POST https://api.soterion.io/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"operator@facility.io","password":"your-password"}'`,
      },
      {
        method: "POST",
        path: "/api/v1/auth/refresh",
        description: "Refresh an expiring JWT token.",
        response: `{ "token": "eyJhbGciOiJIUzI1NiIs..." }`,
        curl: `curl -X POST https://api.soterion.io/api/v1/auth/refresh \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
  {
    name: "LiDAR Ingest",
    description: "Ingest point cloud batches from edge nodes. Requires API key authentication.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/lidar/ingest",
        description: "Ingest a batch of point cloud frames from an edge sensor node. Authenticated via API key.",
        request: `{
  "sensor_id": "uuid",
  "timestamp": "2026-03-16T10:30:00Z",
  "frame_count": 30,
  "tracks": [
    {
      "track_id": "uuid",
      "centroid": { "x": 51.4700, "y": -0.4543, "z": 1.2 },
      "velocity_ms": 1.4,
      "classification": "PERSON",
      "behavior_score": 12,
      "dwell_secs": 45
    }
  ]
}`,
        response: `{
  "accepted": true,
  "tracks_processed": 1,
  "anomalies_detected": 0
}`,
        curl: `curl -X POST https://api.soterion.io/api/v1/lidar/ingest \\
  -H "X-API-Key: sk_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d @batch.json`,
      },
    ],
  },
  {
    name: "Alerts",
    description: "Manage anomaly alerts: list, acknowledge, escalate, and view statistics.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/alerts",
        description: "List alerts with optional filters: zone, severity, acknowledged status, date range.",
        response: `{
  "alerts": [
    {
      "id": "uuid",
      "type": "LOITERING",
      "severity": 3,
      "confidence": 0.87,
      "zone_id": "uuid",
      "acknowledged": false,
      "created_at": "2026-03-16T10:00:00Z"
    }
  ]
}`,
        curl: `curl https://api.soterion.io/api/v1/alerts?severity=3&acknowledged=false \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "POST",
        path: "/api/v1/alerts/:id/acknowledge",
        description: "Acknowledge an alert. Records the operator and timestamp.",
        response: `{
  "id": "uuid",
  "acknowledged": true,
  "acknowledged_by": "uuid",
  "acknowledged_at": "2026-03-16T10:05:00Z"
}`,
        curl: `curl -X POST https://api.soterion.io/api/v1/alerts/<id>/acknowledge \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "POST",
        path: "/api/v1/alerts/:id/escalate",
        description: "Escalate an alert to supervisor level.",
        response: `{
  "id": "uuid",
  "escalated": true,
  "escalated_at": "2026-03-16T10:06:00Z"
}`,
        curl: `curl -X POST https://api.soterion.io/api/v1/alerts/<id>/escalate \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "GET",
        path: "/api/v1/alerts/stats",
        description: "Aggregated alert statistics for the current day.",
        response: `{
  "stats": {
    "total": 47,
    "by_type": {
      "LOITERING": 18,
      "CROWD_SURGE": 12,
      "INTRUSION": 8,
      "ABANDONED_OBJECT": 9
    },
    "avg_confidence": 0.84,
    "avg_response_secs": 14.2
  }
}`,
        curl: `curl https://api.soterion.io/api/v1/alerts/stats \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
  {
    name: "Zones",
    description: "Query spatial zones and real-time density data.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/zones",
        description: "List all zones for the authenticated facility with current density.",
        response: `{
  "zones": [
    {
      "id": "uuid",
      "name": "Security Checkpoint A",
      "type": "security_checkpoint",
      "current_density_pct": 72,
      "current_count": 145
    }
  ]
}`,
        curl: `curl https://api.soterion.io/api/v1/zones \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "GET",
        path: "/api/v1/lidar/zones/:zoneId/density",
        description: "Real-time density snapshot for a specific zone.",
        response: `{
  "zone_id": "uuid",
  "count": 145,
  "density_pct": 72.5,
  "avg_dwell_secs": 128,
  "timestamp": "2026-03-16T10:30:00Z"
}`,
        curl: `curl https://api.soterion.io/api/v1/lidar/zones/<zoneId>/density \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
  {
    name: "Sensors",
    description: "Monitor and manage the LiDAR sensor fleet.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/sensors",
        description: "List all sensors for the facility with health status.",
        response: `{
  "sensors": [
    {
      "id": "uuid",
      "label": "S-001",
      "model": "Hesai JT128",
      "health": "ONLINE",
      "zone_id": "uuid",
      "last_ping_at": "2026-03-16T10:29:55Z"
    }
  ]
}`,
        curl: `curl https://api.soterion.io/api/v1/sensors \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "GET",
        path: "/api/v1/sensors/:id",
        description: "Sensor detail including uptime history.",
        response: `{
  "id": "uuid",
  "label": "S-001",
  "model": "Hesai JT128",
  "health": "ONLINE",
  "fov_degrees": 360,
  "range_meters": 50,
  "uptime_pct_30d": 99.7
}`,
        curl: `curl https://api.soterion.io/api/v1/sensors/<id> \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
  {
    name: "Predictions",
    description: "AI-powered surge predictions and crowd flow forecasting.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/predictions/surge",
        description: "Get surge predictions for all zones with 15/30 minute forecasts.",
        response: `{
  "predictions": [
    {
      "zone_id": "uuid",
      "zone_name": "Security Checkpoint A",
      "current_density_pct": 65,
      "predicted_density_15m": 82,
      "predicted_density_30m": 91,
      "surge_risk": "HIGH",
      "surge_eta_minutes": 12,
      "confidence": 0.88,
      "recommended_actions": ["Open lane 4", "Deploy 2 additional staff"]
    }
  ],
  "generated_at": "2026-03-16T10:30:00Z"
}`,
        curl: `curl https://api.soterion.io/api/v1/predictions/surge \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
  {
    name: "Analytics",
    description: "ROI metrics and operational trend analysis.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/analytics/roi",
        description: "Operational ROI metrics including cost savings and detection lead time.",
        response: `{
  "incidents_detected_24h": 47,
  "avg_response_time_secs": 12.4,
  "queue_sla_compliance_pct": 94.2,
  "person_hours_saved_week": 31.5,
  "cost_savings_monthly_usd": 5670,
  "sensor_uptime_pct": 99.2
}`,
        curl: `curl https://api.soterion.io/api/v1/analytics/roi \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "GET",
        path: "/api/v1/analytics/trends",
        description: "Historical trend data for a given metric and time period.",
        response: `{
  "metric": "alert_count",
  "period": "7d",
  "data": [
    { "timestamp": "2026-03-10", "value": 42 },
    { "timestamp": "2026-03-11", "value": 38 }
  ],
  "comparison": {
    "previousValue": 45,
    "currentValue": 38,
    "changePct": -15.5,
    "trend": "down"
  }
}`,
        curl: `curl "https://api.soterion.io/api/v1/analytics/trends?metric=alert_count&period=7d" \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
];

// ── Method badge colors ────────────────────────────────

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]" },
  POST: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]" },
  PATCH: { bg: "bg-[#3b82f6]/15", text: "text-[#3b82f6]" },
  DELETE: { bg: "bg-[#ef4444]/15", text: "text-[#ef4444]" },
};

// ── Code block component ───────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a] rounded-t-md">
        <span className="text-[9px] font-mono text-gray-600 uppercase">{lang}</span>
        <button
          onClick={handleCopy}
          className="text-[9px] font-mono text-gray-600 hover:text-gray-300 transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-[#0a0a0a] rounded-b-md p-3 overflow-x-auto text-[11px] font-mono text-gray-300 leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

// ── Endpoint card ──────────────────────────────────────

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"curl" | "python" | "js">("curl");
  const mc = METHOD_COLORS[endpoint.method] ?? { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]" };

  const pythonCode = `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "https://api.soterion.io${endpoint.path}",
    headers={"Authorization": "Bearer <token>"}${endpoint.request ? `,
    json=${endpoint.request}` : ""}
)
print(response.json())`;

  const jsCode = `const response = await fetch("https://api.soterion.io${endpoint.path}", {
  method: "${endpoint.method}",
  headers: {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
  }${endpoint.request ? `,
  body: JSON.stringify(${endpoint.request})` : ""}
});
const data = await response.json();
console.log(data);`;

  return (
    <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className={`inline-flex items-center justify-center w-16 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${mc.bg} ${mc.text}`}>
          {endpoint.method}
        </span>
        <code className="text-xs font-mono text-gray-200 flex-1">{endpoint.path}</code>
        <span className="text-[10px] font-mono text-gray-500 hidden md:block max-w-xs truncate">
          {endpoint.description}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[#1a1a1a] px-4 py-4 space-y-4 bg-[#080808]">
          <p className="text-xs font-mono text-gray-400">{endpoint.description}</p>

          {endpoint.request && (
            <div>
              <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-2">Request Body</h5>
              <CodeBlock code={endpoint.request} lang="json" />
            </div>
          )}

          <div>
            <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-wide mb-2">Response</h5>
            <CodeBlock code={endpoint.response} lang="json" />
          </div>

          {/* Try it / Code examples */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              {(["curl", "python", "js"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-colors ${
                    tab === t
                      ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {t === "js" ? "JavaScript" : t === "python" ? "Python" : "cURL"}
                </button>
              ))}
            </div>
            <CodeBlock
              code={tab === "curl" ? endpoint.curl : tab === "python" ? pythonCode : jsCode}
              lang={tab === "curl" ? "bash" : tab}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ApiDocs component ────────────────────────────

export function ApiDocs() {
  const [activeGroup, setActiveGroup] = useState(ENDPOINT_GROUPS[0]?.name ?? "Authentication");

  return (
    <div className="min-h-screen bg-[#080808] text-gray-300" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top bar */}
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#f59e0b] font-bold text-sm tracking-wide">SOTERION</span>
            <span className="text-gray-600">|</span>
            <span className="text-xs text-gray-400">API Reference</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500">v1.0</span>
            <a href="/login" className="text-[10px] text-[#f59e0b] hover:underline underline-offset-4">
              Sign In
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar nav */}
        <aside className="w-56 shrink-0 border-r border-[#1a1a1a] py-6 px-4 sticky top-12 h-[calc(100vh-48px)] overflow-auto hidden md:block">
          <nav className="space-y-1">
            {ENDPOINT_GROUPS.map((g) => (
              <button
                key={g.name}
                onClick={() => setActiveGroup(g.name)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                  activeGroup === g.name
                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {g.name}
              </button>
            ))}

            <div className="pt-4 mt-4 border-t border-[#1a1a1a] space-y-1">
              <button
                onClick={() => setActiveGroup("_auth")}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                  activeGroup === "_auth" ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                Authentication Guide
              </button>
              <button
                onClick={() => setActiveGroup("_rate")}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                  activeGroup === "_rate" ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                Rate Limits
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-6 py-8 min-w-0">
          {/* Authentication guide */}
          {activeGroup === "_auth" && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg text-gray-200 font-semibold">Authentication</h2>
              <div className="space-y-4 text-xs text-gray-400 leading-relaxed">
                <p>
                  The Soterion API supports two authentication methods:
                </p>
                <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
                  <h3 className="text-gray-200 font-semibold">JWT Bearer Token</h3>
                  <p>
                    For operator-facing endpoints. Obtain a token via <code className="text-[#f59e0b]">POST /api/v1/auth/login</code>,
                    then include it in the Authorization header:
                  </p>
                  <CodeBlock code={`Authorization: Bearer eyJhbGciOiJIUzI1NiIs...`} lang="http" />
                  <p>Tokens expire after 15 minutes. Use <code className="text-[#f59e0b]">POST /api/v1/auth/refresh</code> to obtain a new token.</p>
                </div>
                <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
                  <h3 className="text-gray-200 font-semibold">API Key</h3>
                  <p>
                    For machine-to-machine integrations (edge nodes, data pipelines). Include the key in the <code className="text-[#f59e0b]">X-API-Key</code> header:
                  </p>
                  <CodeBlock code={`X-API-Key: sk_live_abc123def456...`} lang="http" />
                  <p>API keys are scoped to specific permissions (e.g., <code className="text-[#f59e0b]">lidar:ingest</code>, <code className="text-[#f59e0b]">sensors:read</code>). Manage keys in the Admin Dashboard.</p>
                </div>
              </div>
            </div>
          )}

          {/* Rate limits */}
          {activeGroup === "_rate" && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg text-gray-200 font-semibold">Rate Limits</h2>
              <div className="space-y-4 text-xs text-gray-400 leading-relaxed">
                <p>All API endpoints are rate-limited to protect system stability.</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#1a1a1a]">
                      <th className="text-left py-2 pr-4">Endpoint Group</th>
                      <th className="text-right py-2 pr-4">Limit</th>
                      <th className="text-right py-2">Window</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400">
                    <tr className="border-b border-[#1a1a1a]"><td className="py-2 pr-4">General API</td><td className="text-right py-2 pr-4">100 requests</td><td className="text-right py-2">1 minute</td></tr>
                    <tr className="border-b border-[#1a1a1a]"><td className="py-2 pr-4">LiDAR Ingest</td><td className="text-right py-2 pr-4">1,000 requests</td><td className="text-right py-2">1 minute</td></tr>
                    <tr className="border-b border-[#1a1a1a]"><td className="py-2 pr-4">Auth (login/refresh)</td><td className="text-right py-2 pr-4">5 requests</td><td className="text-right py-2">15 minutes</td></tr>
                    <tr><td className="py-2 pr-4">WebSocket connections</td><td className="text-right py-2 pr-4">10 concurrent</td><td className="text-right py-2">Per facility</td></tr>
                  </tbody>
                </table>
                <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-4">
                  <h3 className="text-gray-200 font-semibold mb-2">Rate Limit Headers</h3>
                  <p>Every response includes rate limit information:</p>
                  <CodeBlock code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1710590460`} lang="http" />
                </div>
              </div>
            </div>
          )}

          {/* Endpoint groups */}
          {ENDPOINT_GROUPS.filter((g) => g.name === activeGroup).map((group) => (
            <div key={group.name} className="space-y-4 max-w-3xl">
              <div>
                <h2 className="text-lg text-gray-200 font-semibold">{group.name}</h2>
                <p className="text-xs text-gray-500 mt-1">{group.description}</p>
              </div>
              <div className="space-y-2">
                {group.endpoints.map((ep) => (
                  <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
