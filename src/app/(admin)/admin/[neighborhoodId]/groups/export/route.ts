import { rowsToCsv } from "@/lib/csv";
import { formatPortDate } from "@/lib/port-time";
import { getSession } from "@/server/auth";
import { ServiceError } from "@/services/errors";
import { requireNeighborhoodAdminOrPlatform } from "@/services/guards";
import { getGroupMemberCounts, listGroupsForExport } from "@/services/groups";
import { getNeighborhoodById } from "@/services/neighborhoods";

const MEMBER_COUNT_BATCH_SIZE = 200;

function parseStatus(value: string | null): "active" | "inactive" | undefined {
  return value === "active" || value === "inactive" ? value : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ neighborhoodId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { neighborhoodId } = await params;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  // Route handlers do NOT inherit the (admin) layout guard, so authorization
  // must be enforced here: platform admin OR neighborhood_admin of this scope.
  try {
    await requireNeighborhoodAdminOrPlatform(serviceContext, neighborhoodId);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || undefined;
  const status = parseStatus(url.searchParams.get("status"));

  const [groupsList, neighborhood] = await Promise.all([
    listGroupsForExport(serviceContext, { neighborhoodId, query, status }),
    getNeighborhoodById(serviceContext, { neighborhoodId }),
  ]);

  const memberCounts = new Map<string, number>();
  for (let i = 0; i < groupsList.length; i += MEMBER_COUNT_BATCH_SIZE) {
    const batch = groupsList.slice(i, i + MEMBER_COUNT_BATCH_SIZE);
    const counts = await getGroupMemberCounts(serviceContext, {
      groupIds: batch.map((group) => group.id),
    });
    for (const [groupId, total] of counts) {
      memberCounts.set(groupId, total);
    }
  }

  const locale = session.user.preferredLanguage ?? "es";

  const header = [
    "Group name",
    "Address",
    "Neighborhood",
    "Member count",
    "Status",
    "Admin(s)",
    "Created date",
  ];

  const rows = groupsList.map((group) => {
    const memberCount = memberCounts.get(group.id) ?? 0;
    return [
      group.name,
      group.address ?? "",
      neighborhood.name,
      memberCount,
      memberCount > 0 ? "active" : "inactive",
      group.adminLabel ?? "",
      formatPortDate(group.createdAt, neighborhood.timeZone, locale),
    ];
  });

  // Prepend a UTF-8 BOM so Excel renders Spanish accents (ñ, á…) correctly.
  const csv = "\uFEFF" + rowsToCsv([header, ...rows]);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `groups-${neighborhood.slug ?? neighborhoodId}-${today}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
