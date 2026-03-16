// FacilityTypeIndicator.tsx — Shows facility type icon and color badge

interface FacilityTypeConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: JSX.Element;
}

const FACILITY_TYPE_MAP: Record<string, FacilityTypeConfig> = {
  AIRPORT: {
    label: "Airport",
    color: "#f59e0b",
    bgClass: "bg-[#f59e0b]/10",
    textClass: "text-[#f59e0b]",
    borderClass: "border-[#f59e0b]/30",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
      </svg>
    ),
  },
  SEAPORT: {
    label: "Seaport",
    color: "#06b6d4",
    bgClass: "bg-[#06b6d4]/10",
    textClass: "text-[#06b6d4]",
    borderClass: "border-[#06b6d4]/30",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 0l-3 3m3-3l3 3m-9 3c0 3.5 2.5 6 6 6s6-2.5 6-6M6 15l-3 1.5M18 15l3 1.5" />
      </svg>
    ),
  },
  STADIUM: {
    label: "Stadium",
    color: "#8b5cf6",
    bgClass: "bg-[#8b5cf6]/10",
    textClass: "text-[#8b5cf6]",
    borderClass: "border-[#8b5cf6]/30",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  TRANSIT_HUB: {
    label: "Transit Hub",
    color: "#10b981",
    bgClass: "bg-[#10b981]/10",
    textClass: "text-[#10b981]",
    borderClass: "border-[#10b981]/30",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  HOSPITAL: {
    label: "Hospital",
    color: "#ef4444",
    bgClass: "bg-[#ef4444]/10",
    textClass: "text-[#ef4444]",
    borderClass: "border-[#ef4444]/30",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
};

export function getFacilityTypeConfig(type: string | undefined): FacilityTypeConfig {
  if (!type) {
    return FACILITY_TYPE_MAP.AIRPORT!;
  }
  return FACILITY_TYPE_MAP[type.toUpperCase()] ?? FACILITY_TYPE_MAP.AIRPORT!;
}

export function getFacilityTypeColor(type: string | undefined): string {
  return getFacilityTypeConfig(type).color;
}

export function FacilityTypeIndicator({
  type,
  size = "sm",
  showLabel = true,
}: {
  type: string | undefined;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const config = getFacilityTypeConfig(type);

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[8px] gap-1",
    sm: "px-2 py-1 text-[9px] gap-1.5",
    md: "px-3 py-1.5 text-[10px] gap-2",
  };

  const iconSizes = {
    xs: "[&_svg]:w-3 [&_svg]:h-3",
    sm: "[&_svg]:w-3.5 [&_svg]:h-3.5",
    md: "[&_svg]:w-4 [&_svg]:h-4",
  };

  return (
    <span
      className={`
        inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-full
        border ${config.bgClass} ${config.textClass} ${config.borderClass}
        ${sizeClasses[size]} ${iconSizes[size]}
      `}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export { FACILITY_TYPE_MAP };
export type { FacilityTypeConfig };
