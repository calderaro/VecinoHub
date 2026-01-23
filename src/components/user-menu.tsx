"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import { authClient } from "@/lib/auth-client";

type GroupOption = {
  id: string;
  name: string;
};

type UserMenuProps = {
  user: {
    username: string | null;
    image: string | null;
    role: "user" | "admin";
  };
  groupName?: string | null;
  groups?: GroupOption[];
  selectedGroupId?: string;
};

export function UserMenu({ user, groupName, groups, selectedGroupId }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user.username || "User";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(18,26,26,0.6)] px-3 py-1.5 text-sm text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            className="h-6 w-6 rounded-full object-cover"
            width={24}
            height={24}
            sizes="24px"
            unoptimized
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(102,185,165,0.2)] text-xs font-medium uppercase text-[color:var(--muted-strong)]">
            {displayName.charAt(0)}
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="max-w-[120px] truncate leading-tight">{displayName}</span>
          {selectedGroupId && groupName && (
            <span className="max-w-[120px] truncate text-xs leading-tight text-[color:var(--muted)]">
              {groupName}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="py-1">
            {selectedGroupId && (
              <Link
                href={`/dashboard/${selectedGroupId}`}
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--muted-strong)] transition hover:bg-white/5 hover:text-[color:var(--accent-strong)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>
            )}

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--muted-strong)] transition hover:bg-white/5 hover:text-[color:var(--accent-strong)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </Link>

            {user.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--accent)] transition hover:bg-white/5 hover:text-[color:var(--accent-strong)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Admin Panel
              </Link>
            )}
          </div>

          {groups && groups.length > 0 && (
            <div className="border-t border-white/10 py-1">
              <p className="px-4 py-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
                {selectedGroupId ? "Switch Group" : "Groups"}
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/dashboard/${group.id}`);
                  }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition hover:bg-white/5 ${
                    selectedGroupId && group.id === selectedGroupId
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--muted-strong)] hover:text-[color:var(--accent-strong)]"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span className="truncate">{group.name}</span>
                  {selectedGroupId && group.id === selectedGroupId && (
                    <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-white/10 py-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[color:var(--muted-strong)] transition hover:bg-white/5 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
