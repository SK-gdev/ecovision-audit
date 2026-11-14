import { useState, useRef } from 'react';
import type { DetectedItem } from '../../types';

interface BoundingBoxOverlayProps {
  imageUrl: string;
  items: DetectedItem[];
  selectedItemId?: number | null;
  onSelectItem?: (item: DetectedItem) => void;
  confidenceThreshold?: number;
}

export default function BoundingBoxOverlay({
  imageUrl,
  items,
  selectedItemId,
  onSelectItem,
  confidenceThreshold = 0.7,
}: BoundingBoxOverlayProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
    setImageLoaded(true);
  };

  return (
    <div className="relative inline-block w-full overflow-hidden rounded-xl bg-gray-900 border border-gray-200 shadow-sm select-none">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Waste detection analysis"
        onLoad={handleImageLoad}
        className="w-full h-auto max-h-[500px] object-contain mx-auto block"
      />

      {/* Render bounding box overlays */}
      {imageLoaded && (
        <div className="absolute inset-0 pointer-events-none">
          {items.map((item) => {
            const isSelected = selectedItemId === item.id;
            const isLowConfidence = item.confidence < confidenceThreshold;

            // Determine if coordinates are normalized (0-1) or absolute pixels
            const isNormalized = item.bbox_w <= 1.0 && item.bbox_h <= 1.0;
            const leftPct = isNormalized
              ? item.bbox_x * 100
              : (item.bbox_x / naturalSize.width) * 100;
            const topPct = isNormalized
              ? item.bbox_y * 100
              : (item.bbox_y / naturalSize.height) * 100;
            const widthPct = isNormalized
              ? item.bbox_w * 100
              : (item.bbox_w / naturalSize.width) * 100;
            const heightPct = isNormalized
              ? item.bbox_h * 100
              : (item.bbox_h / naturalSize.height) * 100;

            // Color selection based on contamination, confidence, or selection
            let borderColor = 'border-accent';
            let badgeBg = 'bg-accent';

            if (item.is_contamination) {
              borderColor = 'border-error';
              badgeBg = 'bg-error';
            } else if (isLowConfidence) {
              borderColor = 'border-warning';
              badgeBg = 'bg-warning';
            }

            if (isSelected) {
              borderColor = 'border-white ring-4 ring-primary shadow-lg';
            }

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem?.(item);
                }}
                style={{
                  left: `${Math.max(0, Math.min(99, leftPct))}%`,
                  top: `${Math.max(0, Math.min(99, topPct))}%`,
                  width: `${Math.max(2, Math.min(100 - leftPct, widthPct))}%`,
                  height: `${Math.max(2, Math.min(100 - topPct, heightPct))}%`,
                }}
                className={`absolute border-2 ${borderColor} rounded transition-all duration-150 pointer-events-auto cursor-pointer group hover:bg-white/10`}
              >
                {/* Tag label on top */}
                <div
                  className={`absolute -top-6 left-0 ${badgeBg} text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1 z-10 transition-transform ${
                    isSelected ? 'scale-110' : 'scale-100 group-hover:scale-105'
                  }`}
                >
                  <span>{item.human_corrected_class || item.class_name}</span>
                  <span className="opacity-80">({Math.round(item.confidence * 100)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
