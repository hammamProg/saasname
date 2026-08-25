type RatingProps = {
  value: number;
  max?: number;
  className?: string;
};

export default function Rating({ value, max = 5, className = "" }: RatingProps) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, index) => (
        <span
          key={index}
          className={index < value ? "text-amber-400" : "text-slate-300"}
        >
          ★
        </span>
      ))}
    </div>
  );
}
