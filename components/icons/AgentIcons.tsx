/**
 * Marks for the AI coding agents the install prompt targets.
 *
 * These are drawn glyphs, not traced brand logos — the shapes rendered by
 * BrandIcons.tsx come from Simple Icons paths that can be checked against the
 * source; guessing an agent's exact logo path from memory risks a subtly
 * wrong (or malformed) trademark on screen, which is worse than a plain
 * glyph. Each still reads as the right idea: a starburst for Claude, a
 * pointer for Cursor, a prompt for Codex-style CLI agents.
 */

type AgentIconProps = {
  size?: number;
  className?: string;
  title?: string;
};

function svgProps({ size = 16, className, title }: AgentIconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    role: title ? ("img" as const) : undefined,
    "aria-hidden": title ? undefined : (true as const),
  };
}

export function ClaudeAgentIcon(props: AgentIconProps) {
  return (
    <svg {...svgProps(props)} fill="none">
      {props.title && <title>{props.title}</title>}
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="12" x2="22" y2="12" />
        <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
        <line x1="12" y1="16" x2="12" y2="22" />
        <line x1="9.17" y1="14.83" x2="4.93" y2="19.07" />
        <line x1="8" y1="12" x2="2" y2="12" />
        <line x1="9.17" y1="9.17" x2="4.93" y2="4.93" />
        <line x1="12" y1="8" x2="12" y2="2" />
        <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      </g>
    </svg>
  );
}

export function CursorAgentIcon(props: AgentIconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor">
      {props.title && <title>{props.title}</title>}
      <polygon points="4,2 4,18 8,14.5 10.5,20 13,19 10.5,13.7 16,13.7" />
    </svg>
  );
}

export function CodexAgentIcon(props: AgentIconProps) {
  return (
    <svg {...svgProps(props)} fill="none">
      {props.title && <title>{props.title}</title>}
      <rect
        x="2.5"
        y="4.5"
        width="19"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 9.5L9.5 12L6.5 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="11.5"
        y1="14.5"
        x2="15.5"
        y2="14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
