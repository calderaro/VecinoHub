type SkeletonRowsProps = {
  rows?: number;
};

export function SkeletonRows({ rows = 3 }: SkeletonRowsProps) {
  return (
    <div className="space-y-2 px-5 py-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="vh-v3-skeleton h-11 rounded-lg" />
      ))}
    </div>
  );
}
