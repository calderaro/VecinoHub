function SkeletonLine({ width = "w-full", height = "h-3" }: { width?: string; height?: string }) {
  return <div className={`dashboard-v2-skeleton rounded ${width} ${height}`} />;
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="dashboard-v2-skeleton mt-0.5 h-8 w-8 flex-shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 pt-0.5">
        <SkeletonLine width="w-3/4" />
        <SkeletonLine width="w-1/2" height="h-2.5" />
      </div>
    </div>
  );
}

type SkeletonCardProps = {
  rows?: number;
};

export function SkeletonCard({ rows = 4 }: SkeletonCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="dashboard-v2-skeleton h-5 w-5 rounded" />
          <SkeletonLine width="w-32" height="h-4" />
        </div>
        <SkeletonLine width="w-14" height="h-3" />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </article>
  );
}
