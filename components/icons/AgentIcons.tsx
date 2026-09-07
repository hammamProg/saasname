/**
 * Marks for AI coding agents without a real brand asset in
 * /public/analytics/agents — Claude Code and Cursor use their actual logo
 * PNGs there; this covers Codex-style CLI agents with a drawn glyph instead
 * of a guessed brand path.
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
