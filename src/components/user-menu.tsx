"use client";

import {
  Building2,
  Check,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

type GroupOption = {
  id: string;
  name: string;
};

type NeighborhoodOption = {
  id: string;
  name: string;
};

type UserMenuVariant = "default" | "dashboard-v2";

type UserMenuProps = {
  user: {
    username: string | null;
    image: string | null;
    role: "user" | "admin" | "platform_admin";
  };
  groups?: GroupOption[];
  selectedGroupId?: string;
  neighborhoods?: NeighborhoodOption[];
  selectedNeighborhoodId?: string | null;
  showAdminLink?: boolean;
  variant?: UserMenuVariant;
};

type VariantStyles = {
  trigger: string;
  triggerAvatarFallback: string;
  menu: string;
  menuHeader: string;
  menuHeaderName: string;
  menuHeaderEmail: string;
  sectionDivider: string;
  sectionLabel: string;
  item: string;
  itemAccent: string;
  itemDanger: string;
  itemIcon: string;
  activeGroupItem: string;
  groupCheck: string;
};

const variantStyles: Record<UserMenuVariant, VariantStyles> = {
  default: {
    trigger:
      "vh-v3-focus flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-100",
    triggerAvatarFallback:
      "flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold uppercase text-white",
    menu:
      "vh-v3-scrollbar absolute right-0 top-full z-50 mt-1.5 min-w-[240px] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-900/10",
    menuHeader: "border-b border-stone-100 px-4 py-3",
    menuHeaderName: "truncate text-sm font-semibold text-stone-900",
    menuHeaderEmail: "truncate text-xs text-stone-400",
    sectionDivider: "border-t border-stone-100 py-1",
    sectionLabel:
      "px-4 py-2 text-xs font-medium uppercase tracking-widest text-stone-400",
    item:
      "vh-v3-focus flex w-full items-center gap-3 rounded-sm px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50",
    itemAccent:
      "vh-v3-focus flex w-full items-center gap-3 rounded-sm px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50",
    itemDanger:
      "vh-v3-focus flex w-full items-center gap-3 rounded-sm px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
    itemIcon: "h-4 w-4 opacity-70",
    activeGroupItem: "text-teal-700",
    groupCheck: "ml-auto h-4 w-4 text-teal-600",
  },
  "dashboard-v2": {
    trigger:
      "dashboard-v2-focus flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50",
    triggerAvatarFallback:
      "flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold uppercase text-white",
    menu:
      "dashboard-v2-scrollbar absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-900/10",
    menuHeader: "border-b border-stone-100 px-4 py-3",
    menuHeaderName: "truncate text-sm font-semibold text-stone-900",
    menuHeaderEmail: "truncate text-xs text-stone-400",
    sectionDivider: "border-t border-stone-100 py-1",
    sectionLabel: "px-4 py-2 text-xs font-medium uppercase tracking-widest text-stone-400",
    item:
      "dashboard-v2-focus flex w-full items-center gap-3 rounded-sm px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50",
    itemAccent:
      "dashboard-v2-focus flex w-full items-center gap-3 rounded-sm px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50",
    itemDanger:
      "dashboard-v2-focus flex w-full items-center gap-3 rounded-sm px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
    itemIcon: "h-4 w-4 opacity-70",
    activeGroupItem: "text-teal-700",
    groupCheck: "ml-auto h-4 w-4 text-teal-600",
  },
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function UserMenu({
  user,
  groups,
  selectedGroupId,
  neighborhoods,
  selectedNeighborhoodId,
  showAdminLink,
  variant = "default",
}: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("userMenu");
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const styles = variantStyles[variant];
  const canSeeAdminLink =
    showAdminLink ?? (user.role === "admin" || user.role === "platform_admin");
  const canSeePlatformLink = user.role === "admin" || user.role === "platform_admin";
  const selectedAdminNeighborhoodId =
    pathname.match(/^\/admin\/([0-9a-fA-F-]{36})(?:\/|$)/)?.[1] ?? selectedNeighborhoodId ?? null;

  const displayName = user.username || t("defaultUser");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        data-testid="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={styles.trigger}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            className="h-7 w-7 rounded-full object-cover"
            width={28}
            height={28}
            sizes="28px"
            unoptimized
          />
        ) : (
          <div className={styles.triggerAvatarFallback}>{displayName.charAt(0)}</div>
        )}

        <div className="hidden flex-col items-start leading-tight sm:flex">
          <span className={classNames("max-w-[120px] truncate", variant === "dashboard-v2" ? "font-medium text-stone-900" : "font-medium text-stone-900")}>
            {displayName}
          </span>
        </div>

        <ChevronDown
          className={classNames(styles.itemIcon, "transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div role="menu" className={styles.menu}>
          <div className={styles.menuHeader}>
            <p className={styles.menuHeaderName}>{displayName}</p>
          </div>

          <div className="py-1" role="group" aria-label="navigation">
            <Link
              href={selectedGroupId ? `/dashboard/${selectedGroupId}` : "/dashboard"}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className={styles.item}
            >
              <LayoutDashboard className={styles.itemIcon} aria-hidden="true" />
              {t("dashboard")}
            </Link>

            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className={styles.item}
            >
              <User className={styles.itemIcon} aria-hidden="true" />
              {t("profile")}
            </Link>

            {canSeeAdminLink ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className={styles.itemAccent}
              >
                <Shield className={styles.itemIcon} aria-hidden="true" />
                {t("adminPanel")}
              </Link>
            ) : null}

            {canSeePlatformLink ? (
              <Link
                href="/platform"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className={styles.itemAccent}
              >
                <Settings className={styles.itemIcon} aria-hidden="true" />
                {t("platformPanel")}
              </Link>
            ) : null}
          </div>

          {canSeeAdminLink && neighborhoods && neighborhoods.length > 0 ? (
            <div className={styles.sectionDivider} role="group" aria-label="switch-admin-neighborhood">
              <p className={styles.sectionLabel}>{t("adminNeighborhoods")}</p>
              {neighborhoods.map((neighborhood) => {
                const isSelected = neighborhood.id === selectedAdminNeighborhoodId;

                return (
                  <button
                    key={neighborhood.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/admin/${neighborhood.id}`);
                    }}
                    className={classNames(styles.item, isSelected && styles.activeGroupItem)}
                    data-testid={`user-menu-admin-neighborhood-${neighborhood.id}`}
                  >
                    <Shield className={styles.itemIcon} aria-hidden="true" />
                    <span className="flex-1 truncate text-left">{neighborhood.name}</span>
                    {isSelected ? <Check className={styles.groupCheck} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {groups && groups.length > 0 ? (
            <div className={styles.sectionDivider} role="group" aria-label="switch-group">
              <p className={styles.sectionLabel}>{t("groups")}</p>
              {groups.map((group) => {
                const isSelected = selectedGroupId ? group.id === selectedGroupId : false;

                return (
                  <button
                    key={group.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/dashboard/${group.id}`);
                    }}
                    className={classNames(styles.item, isSelected && styles.activeGroupItem)}
                  >
                    <Building2 className={styles.itemIcon} aria-hidden="true" />
                    <span className="flex-1 truncate text-left">{group.name}</span>
                    {isSelected ? <Check className={styles.groupCheck} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className={styles.sectionDivider}>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={isSigningOut}
              data-testid="user-menu-signout"
              className={styles.itemDanger}
            >
              <LogOut className={styles.itemIcon} aria-hidden="true" />
              {isSigningOut ? t("signingOut") : t("signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
