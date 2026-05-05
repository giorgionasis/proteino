"use client";

import Image from "next/image";
import { useOverlay } from "@/hooks/useOverlay";

export function CategorySuggestBox() {
  const { openSuggestion } = useOverlay();

  return (
    <section className="flex flex-col items-center gap-10 px-6 py-10">
      {/* Animated illustration */}
      <div className="w-[247px] h-[307px] relative overflow-hidden rounded-sm">
        <Image
          src="/images/suggest-cta.gif"
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Text + button */}
      <div className="flex flex-col items-center gap-10 w-full">
        <p
          className="text-center font-semibold leading-[140%]"
          style={{ fontSize: 22, color: "#333333" }}
        >
          Γνώρισες ένα νέο μαγαζί και θα ήθελες να το μοιραστείς;
        </p>

        <button
          onClick={() => openSuggestion()}
          className="w-full flex items-center justify-center rounded-[8px] active:opacity-80 transition-opacity"
          style={{
            height: 64,
            backgroundColor: "#27272A",
            border: "2px solid #F2F2F7",
            fontSize: 22,
            fontWeight: 700,
            color: "#F2F2F7",
          }}
        >
          Νέα πρόταση
        </button>
      </div>
    </section>
  );
}
