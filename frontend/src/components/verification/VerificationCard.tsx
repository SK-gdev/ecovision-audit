import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, ExternalLink } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ConfidenceBar from '../classification/ConfidenceBar';
import ClassCorrectionForm from './ClassCorrectionForm';
import type { ReviewQueueItem, VerificationPayload } from '../../types';

interface VerificationCardProps {
  item: ReviewQueueItem;
  onVerify: (itemId: number, payload: VerificationPayload) => Promise<void>;
  onInspectAudit?: (auditId: number) => void;
}

export default function VerificationCard({
  item,
  onVerify,
  onInspectAudit,
}: VerificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async (payload: VerificationPayload) => {
    setIsSubmitting(true);
    try {
      await onVerify(item.id, payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-text-primary">
                {item.human_corrected_class || item.class_name}
              </span>
              <Badge variant="warning">
                Low Confidence: {Math.round(item.confidence * 100)}%
              </Badge>
              {item.is_contamination && <Badge variant="error">Contamination</Badge>}
            </div>

            <p className="text-xs text-text-secondary mt-1">
              Detection ID #{item.id} • Audit #{item.audit_id ?? item.prediction_id}
              {item.bin_name && ` • ${item.bin_name}`}
              {item.building && ` (${item.building})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {item.audit_id && onInspectAudit && (
            <button
              onClick={() => onInspectAudit(item.audit_id!)}
              className="text-xs text-text-secondary hover:text-primary flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Audit</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <span>{isExpanded ? 'Hide Review' : 'Verify & Correct'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Verification & Correction form */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-lg border border-gray-100">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
              Detection Specs
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>AI Confidence Score:</span>
                <span className="font-semibold text-text-primary">
                  {(item.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <ConfidenceBar confidence={item.confidence} threshold={0.7} />
              <div className="flex justify-between text-text-secondary pt-1">
                <span>BBox Geometry:</span>
                <span className="font-mono text-[11px] text-text-primary">
                  [{Math.round(item.bbox_x)}, {Math.round(item.bbox_y)}, {Math.round(item.bbox_w)}x
                  {Math.round(item.bbox_h)}]
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3.5 rounded-lg border border-gray-100">
            <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-accent" />
              Human Correction & Audit Sign-off
            </h4>
            <ClassCorrectionForm
              item={item}
              onVerify={handleVerify}
              onCancel={() => setIsExpanded(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
