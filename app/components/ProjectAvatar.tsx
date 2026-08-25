"use client";

import Image from "next/image";
import { FolderKanban } from "lucide-react";
import type { Project } from "@/libs/projects";
import { cn } from "@/libs/cn";

type ProjectAvatarProps = {
  project: Pick<Project, "name" | "image_url">;
  size?: "sm" | "md" | "lg" | "cover";
  className?: string;
};

const sizes = {
  sm: { box: "h-10 w-10", text: "text-sm", icon: 16 },
  md: { box: "h-14 w-14", text: "text-lg", icon: 20 },
  lg: { box: "h-20 w-20", text: "text-2xl", icon: 24 },
  cover: { box: "h-full w-full", text: "text-3xl", icon: 32 },
} as const;

export function ProjectAvatar({ project, size = "md", className }: ProjectAvatarProps) {
  const spec = sizes[size];
  const initial = project.name.trim().charAt(0).toUpperCase() || "?";

  if (project.image_url) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-surface",
          size === "cover" ? "aspect-[16/10] w-full" : cn("shrink-0 rounded-xl", spec.box),
          className
        )}
      >
        <Image
          src={project.image_url}
          alt=""
          fill
          unoptimized
          className="object-cover"
          sizes={size === "cover" ? "400px" : "80px"}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-brand-teal/30 to-brand-mint/20 font-bold text-primary",
        size === "cover" ? "aspect-[16/10] w-full rounded-none" : cn("shrink-0 rounded-xl", spec.box),
        spec.text,
        className
      )}
    >
      {size === "cover" ? (
        <FolderKanban size={spec.icon} className="text-primary/70" />
      ) : (
        initial
      )}
    </div>
  );
}
