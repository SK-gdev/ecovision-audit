import { ClipboardCheck, Sparkles } from 'lucide-react';
import VerificationCard from './VerificationCard';
import EmptyState from '../ui/EmptyState';
import type { ReviewQueueItem, VerificationPayload } from '../../types';

interface ReviewQueueProps {
  items: ReviewQueueItem[];
  onVerify: (itemId: number, payload: VerificationPayload) => Promise<void>;
  onInspectAudit?: (auditId: number) => void;
  isLoading?: boolean;
}

export default function ReviewQueue({
  items,
  onVerify,
  onInspectAudit,
  isLoading,
}: ReviewQueueProps) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-text-secondary animate-pulse">
        Fetching pending verification items...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="w-8 h-8 text-accent" />}
        title="Review Queue is Clean!"
        description="All low-confidence waste detections have been verified and processed by human reviewers."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">
            Pending Human Verifications ({items.length})
          </h2>
        </div>
        <p className="text-xs text-text-secondary">
          Items below confidence threshold (70%) requiring sign-off
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <VerificationCard
            key={item.id}
            item={item}
            onVerify={onVerify}
            onInspectAudit={onInspectAudit}
          />
        ))}
      </div>
    </div>
  );
}
