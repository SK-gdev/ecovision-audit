import { AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ConfidenceBar from './ConfidenceBar';
import type { DetectedItem, AuditSummary } from '../../types';

interface DetectionResultsProps {
  items: DetectedItem[];
  summary?: AuditSummary;
  selectedItemId?: number | null;
  onSelectItem?: (item: DetectedItem) => void;
  confidenceThreshold?: number;
}

export default function DetectionResults({
  items,
  summary,
  selectedItemId,
  onSelectItem,
  confidenceThreshold = 0.7,
}: DetectionResultsProps) {
  return (
    <div className="space-y-6">
      {/* Summary KPI Badges */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 text-center">
            <span className="text-xs text-text-secondary block">Total Items</span>
            <span className="text-xl font-bold text-text-primary mt-0.5">
              {summary.total_items_detected}
            </span>
          </Card>
          <Card className="p-3.5 text-center">
            <span className="text-xs text-text-secondary block">Plastic Items</span>
            <span className="text-xl font-bold text-amber-600 mt-0.5">
              {summary.plastic_items}
            </span>
          </Card>
          <Card className="p-3.5 text-center">
            <span className="text-xs text-text-secondary block">Recyclable</span>
            <span className="text-xl font-bold text-accent mt-0.5">
              {summary.recyclable_items}
            </span>
          </Card>
          <Card className="p-3.5 text-center">
            <span className="text-xs text-text-secondary block">Contamination</span>
            <span className="text-xl font-bold text-error mt-0.5">
              {Math.round(summary.contamination_rate * 100)}%
            </span>
          </Card>
        </div>
      )}

      {/* Items List */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Detected Waste Objects</h3>
            <p className="text-xs text-text-secondary">
              Click an item to locate its bounding box on the image
            </p>
          </div>
          <span className="text-xs bg-gray-100 text-text-secondary px-2.5 py-1 rounded-full font-medium">
            {items.length} objects
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-secondary">
            No items detected in this image.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const isSelected = selectedItemId === item.id;
              const isLowConfidence = item.confidence < confidenceThreshold;
              const displayName = item.human_corrected_class || item.class_name;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => onSelectItem?.(item)}
                  className={`py-3 px-2 rounded-lg cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-secondary w-5">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {displayName}
                        </span>
                        {item.human_corrected_class && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-medium px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                        {item.is_contamination && (
                          <Badge variant="error">Contamination</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {isLowConfidence ? (
                          <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                            <AlertTriangle className="w-3 h-3" /> Needs Review (&lt;
                            {Math.round(confidenceThreshold * 100)}%)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-accent font-medium">
                            <CheckCircle className="w-3 h-3" /> Confident Detection
                          </span>
                        )}
                        {item.human_verified && (
                          <span className="text-[11px] text-text-secondary">
                            • Verified by {item.verified_by || 'Staff'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-36 flex-shrink-0">
                    <ConfidenceBar
                      confidence={item.confidence}
                      threshold={confidenceThreshold}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
