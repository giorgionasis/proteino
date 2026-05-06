"use client";

import { useState } from "react";
import { ReportFlowModal, type ReportTargetType } from "./ReportFlowModal";

interface ReportLinkProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Visible label of the link. Defaults to "αναφορά". */
  label?: string;
  className?: string;
  /** Called after the user successfully submits the report. */
  onReported?: () => void;
}

/**
 * Trigger link for the report modal — used inline on review/comment cards.
 * Self-contains the modal open/close state so call sites stay tiny.
 */
export function ReportLink({
  targetType,
  targetId,
  label = "αναφορά",
  className = "text-[12px] font-medium text-zinc-500 underline",
  onReported,
}: ReportLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <ReportFlowModal
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
          onReported={onReported}
        />
      )}
    </>
  );
}
