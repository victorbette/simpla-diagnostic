export function ClientCardSkeleton() {
  return (
    <div
      className="bg-white animate-pulse"
      style={{
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "0.5px solid #E5E7EB",
        padding: 20,
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Row 1: badge placeholder */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-[#DBEAFE] rounded-full" />
        <div className="h-8 w-8 bg-[#DBEAFE] rounded-md" />
      </div>

      {/* Row 2: avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-[#DBEAFE] shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-[#DBEAFE] rounded w-3/4 mb-2" />
          <div className="h-3 bg-[#DBEAFE] rounded w-1/2" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#F0F7FF] mb-4" />

      {/* Row 3: metrics */}
      <div className="grid grid-cols-2 gap-4 mb-5 flex-1">
        <div>
          <div className="h-2.5 bg-[#DBEAFE] rounded w-2/3 mb-2" />
          <div className="h-3.5 bg-[#DBEAFE] rounded w-1/2" />
        </div>
        <div>
          <div className="h-2.5 bg-[#DBEAFE] rounded w-2/3 mb-2" />
          <div className="h-3.5 bg-[#DBEAFE] rounded w-3/4" />
        </div>
      </div>

      {/* CTA button */}
      <div className="h-10 bg-[#DBEAFE] rounded-lg w-full" />
    </div>
  );
}
