"use client";

import { AlertTriangleIcon, XIcon } from "lucide-react";
import { useEffect } from "react";

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isLoading, onCancel]);

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : variant === "warning"
        ? "bg-amber-500 hover:bg-amber-600 text-white"
        : "bg-teal-600 hover:bg-teal-700 text-white";
  const iconClass =
    variant === "danger"
      ? "bg-red-50 text-red-500"
      : variant === "warning"
        ? "bg-amber-50 text-amber-500"
        : "bg-teal-50 text-teal-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
            >
              <AlertTriangleIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 id="confirm-dialog-title" className="text-sm font-semibold text-stone-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="vh-v3-focus rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-40"
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-stone-600">{body}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 bg-stone-50 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="vh-v3-focus rounded-lg px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`vh-v3-focus rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
