import { describe, expect, it } from "vitest";

import {
  listContextHelpByScreen,
  resolveHelpRole,
  searchHelpArticles,
} from "@/lib/help-content";

describe("help content selectors", () => {
  it("resolves resident and admin help roles from account context", () => {
    expect(resolveHelpRole({ accountRole: "user" })).toBe("resident");
    expect(
      resolveHelpRole({
        accountRole: "user",
        viewerCanManage: true,
        viewerMembershipRole: "group_admin",
      })
    ).toBe("group_admin");
    expect(
      resolveHelpRole({
        accountRole: "admin",
        hasNeighborhoodAdminAccess: true,
      })
    ).toBe("neighborhood_admin");
  });

  it("ranks operational resource searches toward the reservation guide", () => {
    const results = searchHelpArticles({
      locale: "es",
      role: "resident",
      query: "reservar salon",
    });

    expect(results[0]?.slug).toBe("como-reservar-recursos-compartidos");
  });

  it("filters request-access contextual help by role", () => {
    const residentEntries = listContextHelpByScreen({
      locale: "es",
      screenKey: "dashboard-request-access",
      role: "resident",
    });
    const adminEntries = listContextHelpByScreen({
      locale: "es",
      screenKey: "dashboard-request-access",
      role: "neighborhood_admin",
    });

    expect(residentEntries.map((entry) => entry.id)).toContain("request-access-resident");
    expect(residentEntries.map((entry) => entry.id)).not.toContain("request-access-share-link");
    expect(adminEntries.map((entry) => entry.id)).toContain("request-access-share-link");
  });
});
