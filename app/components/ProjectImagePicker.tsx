"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_MAX_BYTES,
  validateProjectImageFile,
} from "@/libs/project-image";
import { cn } from "@/libs/cn";

type ProjectImagePickerProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  previewUrl?: string | null;
  className?: string;
};

export function ProjectImagePicker({
  file,
  onFileChange,
  previewUrl = null,
  className,
}: ProjectImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = localPreview ?? previewUrl;

  function handleSelect(selected: File | null) {
    setError(null);
    if (!selected) {
      onFileChange(null);
      setLocalPreview(null);
      return;
    }

    const validationError = validateProjectImageFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileChange(selected);
    setLocalPreview(URL.createObjectURL(selected));
  }

  function clearImage() {
    onFileChange(null);
    setLocalPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-sm font-semibold text-foreground">
        App image <span className="font-normal text-muted">(optional)</span>
      </span>

      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface transition-colors hover:border-primary/40 hover:bg-primary-soft/30",
            displayUrl && "border-solid border-primary/20"
          )}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={28} className="text-muted group-hover:text-primary" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <p className="text-sm text-muted">
            Square or landscape logo. Max {(PROJECT_IMAGE_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface"
            >
              {displayUrl ? "Replace image" : "Upload image"}
            </button>
            {displayUrl && (
              <button
                type="button"
                onClick={clearImage}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface"
              >
                <X size={12} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROJECT_IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => handleSelect(event.target.files?.[0] ?? null)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
