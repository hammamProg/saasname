"use client";

import { useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
};

export default function Modal({
  isOpen,
  setIsOpen,
  title = "I'm a modal",
  children = "And here is my content",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close modal"
        onClick={() => setIsOpen(false)}
      />
      <div className="animate-popup relative w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-xl text-muted hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-4 text-muted">{children}</div>
      </div>
    </div>
  );
}
