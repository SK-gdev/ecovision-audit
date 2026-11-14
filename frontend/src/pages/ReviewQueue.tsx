import { useNavigate } from 'react-router-dom';
import ReviewQueue from '../components/verification/ReviewQueue';
import { useReviewQueue, useVerifyItem } from '../hooks/useAudits';
import type { VerificationPayload } from '../types';

export default function ReviewQueuePage() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useReviewQueue();
  const verifyMutation = useVerifyItem();

  const handleVerify = async (itemId: number, payload: VerificationPayload) => {
    await verifyMutation.mutateAsync({ itemId, payload });
  };

  const handleInspectAudit = (auditId: number) => {
    navigate(`/audit/${auditId}/results`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Human Verification Queue</h1>
        <p className="text-xs text-text-secondary mt-1">
          Review detected waste items that fell below the confidence threshold (70%). Confirm or correct AI classification tags to refine audit accuracy.
        </p>
      </div>

      <ReviewQueue
        items={items}
        onVerify={handleVerify}
        onInspectAudit={handleInspectAudit}
        isLoading={isLoading}
      />
    </div>
  );
}
