type ButtonGradientProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function ButtonGradient({
  children = "Gradient Button",
  className = "",
  onClick,
}: ButtonGradientProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl bg-gradient-to-r from-brand-teal to-brand-mint px-8 py-3 text-sm font-bold text-brand-navy shadow-lg transition hover:opacity-90 ${className}`}
    >
      {children}
    </button>
  );
}
