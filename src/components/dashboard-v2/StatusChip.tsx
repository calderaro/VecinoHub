type StatusChipVariant = "active" | "draft" | "closed" | "admin" | "user" | "open";

type StatusChipProps = {
  variant: StatusChipVariant;
  label?: string;
};

const variantStyles: Record<StatusChipVariant, string> = {
  active: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  draft: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
  closed: "bg-red-50 text-red-600 ring-1 ring-red-200",
  admin: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  user: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
  open: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
};

export function StatusChip({ variant, label }: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
