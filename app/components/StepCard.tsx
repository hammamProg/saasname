"use client";

import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import { Step, StepId } from "../types";
import { ServiceLogo } from "./ServiceLogo";
import { SETUP_SERVICE_LOGOS } from "../lib/serviceBrands";
import { StepResetButton } from "./StepResetButton";

interface StepCardProps {
  step: Step;
  idx: number;
  isCompleted: boolean;
  isLocked?: boolean;
  summary?: string;
  onToggleComplete: (id: StepId) => void;
  onReset?: (id: StepId) => void | Promise<void>;
  canReset?: boolean;
  extraContent?: React.ReactNode;
}

const CodePreview = ({ commands }: { commands: string[] }) => {
  const [copied, setCopied] = useState(false);
  const text = commands.join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md bg-slate-900 overflow-hidden mt-4">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-white/10">
        <span className="text-xs font-mono text-slate-400">terminal</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="text-xs text-slate-400 hover:text-white"
        >
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      <div className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
        {commands.map((cmd, cmdIdx) => (
          <div key={cmdIdx} className="flex">
            <span className="text-slate-600 mr-4 select-none">
              {cmd.startsWith("#") ? " " : "$"}
            </span>
            <span>{cmd}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StepCard: React.FC<StepCardProps> = ({
  step,
  idx,
  isCompleted,
  isLocked = false,
  summary,
  onToggleComplete,
  onReset,
  canReset = false,
  extraContent,
}) => {
  const [isExpanded, setIsExpanded] = useState(!isCompleted);
  const wasCompleted = useRef(isCompleted);
  const badgeLogo = step.badge ? SETUP_SERVICE_LOGOS[step.badge] : step.logoUrl;
  const StepIcon = step.icon;

  useEffect(() => {
    if (wasCompleted.current && !isCompleted) {
      setIsExpanded(true);
    } else if (isCompleted) {
      setIsExpanded(false);
    }
    wasCompleted.current = isCompleted;
  }, [isCompleted]);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
        isCompleted ? "border-blue-100 bg-blue-50/20" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3 p-4 md:p-5">
        <button
          type="button"
          onClick={() => onToggleComplete(step.id)}
          disabled={isLocked}
          className="mt-0.5 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          aria-label={isLocked ? "Step completed" : isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          {isCompleted ? (
            <CheckCircle2 size={24} className="text-blue-600" />
          ) : (
            <Circle size={24} className="text-slate-300 hover:text-blue-400" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            type="button"
            onClick={toggleExpanded}
            className="min-w-0 flex-1 text-left"
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-3">
              <ServiceLogo
                src={step.logoUrl}
                name={step.badge ?? step.title}
                size={36}
                connected={isCompleted}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={`text-lg font-semibold tracking-tight ${
                      isCompleted ? "text-slate-600" : "text-slate-900"
                    }`}
                  >
                    {step.title}
                  </h3>
                  {step.badge && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      {step.badge}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                      Done
                    </span>
                  )}
                </div>
                {!isExpanded && (
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {summary ?? step.description}
                  </p>
                )}
              </div>
              <ChevronDown
                size={20}
                className={`shrink-0 text-slate-400 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {canReset && onReset && (
            <StepResetButton stepId={step.id} stepTitle={step.title} onReset={onReset} />
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 pb-6 pt-2 md:px-5 md:pl-16">
              <p className="text-slate-600 leading-relaxed mb-4">{step.description}</p>

              {extraContent}

              {step.commands && step.commands.length > 0 && (
                <div className="mb-6">
                  <CodePreview commands={step.commands} />
                </div>
              )}

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 mb-5 space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <StepIcon size={14} className="text-blue-600" /> Action Items
                </h4>
                {step.instructions.split("\n").map((line, i) => (
                  <p key={i} className="text-sm text-slate-700 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>

              {step.links && step.links.length > 0 && !isLocked && (
                <div className="flex flex-wrap gap-3">
                  {step.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target={link.url.startsWith("/") ? undefined : "_blank"}
                      rel={link.url.startsWith("/") ? undefined : "noopener noreferrer"}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
