"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const usernamePattern = /^[a-zA-Z0-9._-]+$/;

export function ProfileForm({
  name,
  email,
  initialUsername,
  initialImage,
}: {
  name: string;
  email: string;
  initialUsername: string | null;
  initialImage: string | null;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [image, setImage] = useState(initialImage ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const usernameTrimmed = username.trim();
  const imageTrimmed = image.trim();
  const isUsernameValid =
    usernameTrimmed.length >= 3 &&
    usernameTrimmed.length <= 32 &&
    usernamePattern.test(usernameTrimmed);

  const isImageValid = useMemo(() => {
    if (!imageTrimmed) {
      return true;
    }
    try {
      new URL(imageTrimmed);
      return true;
    } catch {
      return false;
    }
  }, [imageTrimmed]);

  const canSubmit = isUsernameValid && isImageValid && !isSaving;

  const updateProfile = trpc.users.updateProfile.useMutation();

  return (
    <form
      className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSubmit) {
          addToast("Please fix the profile fields before saving.", "error");
          return;
        }
        setIsSaving(true);
        try {
          await updateProfile.mutateAsync({
            username: usernameTrimmed,
            image: imageTrimmed ? imageTrimmed : null,
          });
          addToast("Profile updated.", "success");
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to update profile.";
          addToast(message, "error");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold">Profile settings</h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Set a public username and profile photo for the neighborhood UI.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {imageTrimmed ? (
          <img
            className="h-16 w-16 rounded-full border border-white/10 object-cover"
            src={imageTrimmed}
            alt={usernameTrimmed || name}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[color:var(--surface-strong)] text-lg font-semibold text-[color:var(--muted-strong)]">
            {(usernameTrimmed?.[0] ?? name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm text-[color:var(--muted-strong)]">{name}</p>
          <p className="text-xs text-[color:var(--muted)]">{email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Username</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your.username"
            required
          />
          <p className="text-xs text-[color:var(--muted)]">
            Use 3-32 characters: letters, numbers, dots, underscores, or dashes.
          </p>
          {!isUsernameValid ? (
            <p className="text-xs text-rose-200">
              Enter a valid username before saving.
            </p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Profile photo URL</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="https://example.com/photo.jpg"
            type="url"
          />
          {!isImageValid ? (
            <p className="text-xs text-rose-200">
              Enter a valid URL or leave this field empty.
            </p>
          ) : null}
        </label>
      </div>

      <button
        className="mt-5 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!canSubmit}
      >
        {isSaving ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
