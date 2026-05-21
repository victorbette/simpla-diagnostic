export function ClientCardSkeleton() {
  return (
    <div
      className="bg-white animate-pulse"
      style={{
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderLeft: "4px solid #E2DCC8",
        padding: 20,
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Row 1: badge placeholder */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-[#EDE9DC] rounded-full" />
        <div className="h-8 w-8 bg-[#EDE9DC] rounded-md" />
      </div>

      {/* Row 2: avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-[#EDE9DC] shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-[#EDE9DC] rounded w-3/4 mb-2" />
          <div className="h-3 bg-[#EDE9DC] rounded w-1/2" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#F5F3EE] mb-4" />

      {/* Row 3: metrics */}
      <div className="grid grid-cols-2 gap-4 mb-5 flex-1">
        <div>
          <div className="h-2.5 bg-[#EDE9DC] rounded w-2/3 mb-2" />
          <div className="h-3.5 bg-[#EDE9DC] rounded w-1/2" />
        </div>
        <div>
          <div className="h-2.5 bg-[#EDE9DC] rounded w-2/3 mb-2" />
          <div className="h-3.5 bg-[#EDE9DC] rounded w-3/4" />
        </div>
      </div>

      {/* CTA button */}
      <div className="h-10 bg-[#EDE9DC] rounded-lg w-full" />
    </div>
  );
}
