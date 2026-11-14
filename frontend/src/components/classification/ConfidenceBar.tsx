interface ConfidenceBarProps {
  confidence: number; // 0 to 1
  threshold?: number;
  showText?: boolean;
}

export default function ConfidenceBar({
  confidence,
  threshold = 0.7,
  showText = true,
}: ConfidenceBarProps) {
  const percent = Math.round(confidence * 100);

  let barColor = 'bg-accent';
  let textColor = 'text-accent';

  if (confidence < 0.5) {
    barColor = 'bg-error';
    textColor = 'text-error';
  } else if (confidence < threshold) {
    barColor = 'bg-warning';
    textColor = 'text-warning';
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showText && (
        <span className={`text-[11px] font-semibold tabular-nums min-w-[34px] text-right ${textColor}`}>
          {percent}%
        </span>
      )}
    </div>
  );
}
