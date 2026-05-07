"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { Modal } from "@/components/ui/Modal";
import { ConfirmDeleteDialog } from "@/components/profile/ConfirmDeleteDialog";
import { DeleteSuccessDialog } from "@/components/profile/DeleteSuccessDialog";

export function ModalTab() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [open4, setOpen4] = useState(false);
  const [open5, setOpen5] = useState(false);

  return (
    <>
      <ShowcaseSection
        name="Modal (primitive)"
        filePath="components/ui/Modal.tsx"
        description="Bottom-sheet style modal with backdrop, slide-up animation, Esc to close. Sizes: sm / md / lg / full. Optional title + drag handle."
      >
        <Variant label="Default (md size, with title + handle)">
          <button
            onClick={() => setOpen1(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Open modal
          </button>
          <Modal open={open1} onClose={() => setOpen1(false)} title="Παράδειγμα Modal" size="md">
            <div className="p-6 space-y-4">
              <p className="text-zinc-700 text-sm leading-[150%]">
                Αυτό είναι ένα παράδειγμα modal. Πατάς Esc ή το backdrop για να κλείσει.
              </p>
              <button
                onClick={() => setOpen1(false)}
                className="w-full h-12 rounded-[12px] bg-zinc-900 text-white font-semibold"
              >
                ΟΚ
              </button>
            </div>
          </Modal>
        </Variant>
        <Variant label="Small size">
          <button
            onClick={() => setOpen2(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Open small
          </button>
          <Modal open={open2} onClose={() => setOpen2(false)} title="Σύντομο" size="sm">
            <div className="p-6 text-sm text-zinc-700">Σύντομη ερώτηση εδώ.</div>
          </Modal>
        </Variant>
        <Variant label="Full screen (no handle)">
          <button
            onClick={() => setOpen3(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Open full
          </button>
          <Modal open={open3} onClose={() => setOpen3(false)} size="full" showHandle={false}>
            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Full-screen modal</h2>
              <p className="text-zinc-700">Καλύπτει σχεδόν όλη την οθόνη — για forms ή flows.</p>
              <button
                onClick={() => setOpen3(false)}
                className="px-4 h-10 rounded-full bg-zinc-100 text-zinc-700 text-sm font-semibold"
              >
                Κλείσιμο
              </button>
            </div>
          </Modal>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ConfirmDeleteDialog"
        filePath="components/profile/ConfirmDeleteDialog.tsx"
        description="Destructive-confirm dialog. Coral-danger primary button, body scroll locked, Esc dismisses."
        contextLinks={[{ label: "Live (profile suggestions)", href: "/profile" }]}
      >
        <Variant label="Open the dialog">
          <button
            onClick={() => setOpen4(true)}
            className="px-4 h-10 rounded-full bg-red-600 text-white text-sm font-semibold"
          >
            Delete suggestion
          </button>
          {open4 && (
            <ConfirmDeleteDialog
              title="Διαγραφή πρότασης"
              itemTitle="Inception"
              message="Είσαι σίγουρος; Δεν μπορεί να αναιρεθεί."
              confirmLabel="Διαγραφή"
              pending={false}
              onCancel={() => setOpen4(false)}
              onConfirm={() => setOpen4(false)}
            />
          )}
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="DeleteSuccessDialog"
        filePath="components/profile/DeleteSuccessDialog.tsx"
        description="Confirmation dialog after a destructive action — coral-tinted circle + trash icon. Auto-dismisses after 1.8s by default."
        contextLinks={[{ label: "Live (after deleting a suggestion)", href: "/profile" }]}
      >
        <Variant label="Show success">
          <button
            onClick={() => setOpen5(true)}
            className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
          >
            Show success
          </button>
          {open5 && (
            <DeleteSuccessDialog
              message="Η πρόταση διαγράφηκε."
              autoCloseMs={2500}
              onClose={() => setOpen5(false)}
            />
          )}
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="ReportFlowModal"
        filePath="components/report/ReportFlowModal.tsx"
        description="3-step modal for reporting a comment or suggestion: reason → description → confirmation. Wired in detail-page review cards + comment threads."
        contextLinks={[
          { label: "Live (review card αναφορά link)", href: "/books/agries-anemones" },
        ]}
      >
        <Variant label="Pending — interactive demo requires real targetId" note="See live link →">
          <div className="text-xs text-zinc-400 italic text-center">
            Ζωντανό demo στο link πιο πάνω
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="EditSuggestionModal"
        filePath="components/profile/EditSuggestionModal.tsx"
        description="Edit own suggestion (rating + reflection). Owner-only. Opens from profile suggestions row menu."
        contextLinks={[{ label: "Live (own suggestion · Edit menu)", href: "/profile" }]}
      >
        <Variant label="Pending — needs real suggestionId" note="See live link →">
          <div className="text-xs text-zinc-400 italic text-center">
            Ζωντανό demo στο link πιο πάνω
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}
