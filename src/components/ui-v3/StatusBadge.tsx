type StatusBadgeVariant =
  | "active"
  | "open"
  | "published"
  | "upcoming"
  | "ongoing"
  | "confirmed"
  | "completed"
  | "draft"
  | "scheduled"
  | "submitted"
  | "pending"
  | "paused"
  | "closed"
  | "ended"
  | "unpublished"
  | "inactive"
  | "canceled"
  | "rejected"
  | "suspended"
  | "admin"
  | "group_admin"
  | "group_member"
  | "platform_admin"
  | "moderator"
  | "resident"
  | "user";

const statusStyles: Record<StatusBadgeVariant, string> = {
  active: "bg-teal-50 text-teal-700 ring-teal-200",
  open: "bg-teal-50 text-teal-700 ring-teal-200",
  published: "bg-teal-50 text-teal-700 ring-teal-200",
  upcoming: "bg-blue-50 text-blue-700 ring-blue-200",
  ongoing: "bg-blue-50 text-blue-700 ring-blue-200",
  confirmed: "bg-teal-50 text-teal-700 ring-teal-200",
  completed: "bg-stone-100 text-stone-600 ring-stone-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  submitted: "bg-amber-50 text-amber-700 ring-amber-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paused: "bg-violet-50 text-violet-700 ring-violet-200",
  closed: "bg-stone-100 text-stone-600 ring-stone-200",
  ended: "bg-stone-100 text-stone-600 ring-stone-200",
  unpublished: "bg-stone-100 text-stone-600 ring-stone-200",
  inactive: "bg-stone-100 text-stone-500 ring-stone-200",
  canceled: "bg-red-50 text-red-600 ring-red-200",
  rejected: "bg-red-50 text-red-600 ring-red-200",
  suspended: "bg-red-50 text-red-600 ring-red-200",
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
  group_admin: "bg-violet-50 text-violet-700 ring-violet-200",
  group_member: "bg-stone-100 text-stone-600 ring-stone-200",
  platform_admin: "bg-violet-50 text-violet-700 ring-violet-200",
  moderator: "bg-blue-50 text-blue-700 ring-blue-200",
  resident: "bg-stone-100 text-stone-600 ring-stone-200",
  user: "bg-stone-100 text-stone-600 ring-stone-200",
};

type StatusBadgeProps = {
  variant: StatusBadgeVariant;
  label: string;
};

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusStyles[variant]}`}
    >
      {label}
    </span>
  );
}
