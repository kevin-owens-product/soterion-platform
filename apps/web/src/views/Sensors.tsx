import { W05_SensorGrid } from "@/widgets/W05_SensorGrid";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";
import { useSensorStatus } from "@/hooks/useSensorStatus";

function StatCard({
  label,
  value,
  color,
  isLoading,
}: {
  label: string;
  value: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-soterion-border bg-soterion-surface p-4">
      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
        {label}
      </p>
      {isLoading ? (
        <div className="h-7 w-12 bg-[#1a1a1a] rounded animate-pulse" />
      ) : (
        <p className={`text-2xl font-display tracking-wider ${color}`}>
          {value}
        </p>
      )}
    </div>
  );
}

export function Sensors() {
  const { sensors, onlineCount, degradedCount, offlineCount, isLoading } =
    useSensorStatus();

  const totalCount = sensors.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-gray-100">
          SENSORS
        </h1>
        <span className="text-xs font-mono text-gray-500">
          LiDAR sensor network health & diagnostics
        </span>
      </div>

      {/* 4 stat cards in a row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Online"
          value={String(onlineCount)}
          color="text-soterion-ok"
          isLoading={isLoading}
        />
        <StatCard
          label="Degraded"
          value={String(degradedCount)}
          color="text-soterion-high"
          isLoading={isLoading}
        />
        <StatCard
          label="Offline"
          value={String(offlineCount)}
          color="text-soterion-critical"
          isLoading={isLoading}
        />
        <StatCard
          label="Total"
          value={String(totalCount)}
          color="text-soterion-info"
          isLoading={isLoading}
        />
      </div>

      {/* Sensor Grid */}
      <div style={{ minHeight: "400px" }}>
        <WidgetErrorBoundary name="Sensor Grid">
          <W05_SensorGrid />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
