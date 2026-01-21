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
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
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
      <p className="mt-1 text-sm text-slate-400">
        Set a public username and profile photo for the neighborhood UI.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {imageTrimmed ? (
          <img
            className="h-16 w-16 rounded-full border border-slate-800 object-cover"
            src={imageTrimmed}
            alt={usernameTrimmed || name}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-lg font-semibold text-slate-300">
            {(usernameTrimmed?.[0] ?? name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm text-slate-300">{name}</p>
          <p className="text-xs text-slate-500">{email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Username</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your.username"
            required
          />
          <p className="text-xs text-slate-500">
            Use 3-32 characters: letters, numbers, dots, underscores, or dashes.
          </p>
          {!isUsernameValid ? (
            <p className="text-xs text-rose-200">
              Enter a valid username before saving.
            </p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Profile photo URL</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
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
        className="mt-5 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!canSubmit}
      >
        {isSaving ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
