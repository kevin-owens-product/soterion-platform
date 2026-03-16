export function LoadingSkeleton({ width = "100%", height = "20px", className = "" }: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: "#1a1a1a",
        borderRadius: 4,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}
