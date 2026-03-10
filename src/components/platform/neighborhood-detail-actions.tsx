"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui-v3";

export function NeighborhoodDetailActions({
  neighborhoodId,
  neighborhoodName,
}: {
  neighborhoodId: string;
  neighborhoodName: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const removeNeighborhood = trpc.neighborhoods.remove.useMutation({
    onSuccess: () => {
      addToast("Neighborhood deleted.", "success");
      router.push("/platform");
      router.refresh();
    },
    onError: (error) => {
      addToast(error.message, "error");
    },
  });

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:border-rose-200"
        onClick={() => setConfirmOpen(true)}
        data-testid="platform-neighborhood-delete"
      >
        Delete neighborhood
      </button>
      {confirmOpen ? (
        <ConfirmDialog
          title="Delete neighborhood"
          body={`This will permanently delete ${neighborhoodName} and all of its groups, polls, posts, fundraising, events, and memberships.`}
          cancelLabel="Cancel"
          confirmLabel={removeNeighborhood.isPending ? "Deleting..." : "Delete neighborhood"}
          isLoading={removeNeighborhood.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => removeNeighborhood.mutate({ neighborhoodId })}
        />
      ) : null}
    </>
  );
}
