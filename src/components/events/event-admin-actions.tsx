"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function EventAdminActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const removeEvent = trpc.events.remove.useMutation({
    onSuccess: () => {
      addToast("Event deleted.", "success");
      router.push("/admin/events");
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <>
      <button
        className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200"
        type="button"
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </button>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Delete event
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              This will permanently remove the event from the calendar.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={removeEvent.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => removeEvent.mutate({ eventId })}
                disabled={removeEvent.isLoading}
              >
                {removeEvent.isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
