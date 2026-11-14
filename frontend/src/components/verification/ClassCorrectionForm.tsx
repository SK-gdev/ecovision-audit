import { useState } from 'react';
import { Check, User, AlertOctagon } from 'lucide-react';
import Button from '../ui/Button';
import type { DetectedItem, VerificationPayload } from '../../types';

interface ClassCorrectionFormProps {
  item: DetectedItem;
  onVerify: (payload: VerificationPayload) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const AVAILABLE_CLASSES = [
  'PET Bottle',
  'HDPE Container',
  'Plastic Wrapper',
  'Foam Cup',
  'Paper',
  'Other',
];

export default function ClassCorrectionForm({
  item,
  onVerify,
  onCancel,
  isSubmitting = false,
}: ClassCorrectionFormProps) {
  const [selectedClass, setSelectedClass] = useState<string>(
    item.human_corrected_class || item.class_name,
  );
  const [isContamination, setIsContamination] = useState<boolean>(item.is_contamination);
  const [verifierName, setVerifierName] = useState<string>('Auditor Reviewer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onVerify({
      human_corrected_class: selectedClass !== item.class_name ? selectedClass : null,
      is_contamination: isContamination,
      verified_by: verifierName.trim() || 'Reviewer',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Classification dropdown */}
      <div>
        <label className="block font-medium text-text-primary mb-1">
          Correct Waste Classification
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {AVAILABLE_CLASSES.map((cls) => (
            <option key={cls} value={cls}>
              {cls} {cls === item.class_name ? '(AI Detected)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Contamination flag */}
      <div className="flex items-center gap-2 pt-1">
        <input
          id={`contam-check-${item.id}`}
          type="checkbox"
          checked={isContamination}
          onChange={(e) => setIsContamination(e.target.checked)}
          className="w-4 h-4 rounded text-error border-border focus:ring-error/20"
        />
        <label
          htmlFor={`contam-check-${item.id}`}
          className="flex items-center gap-1.5 font-medium text-text-primary cursor-pointer select-none"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-error" />
          Mark as Bin Contamination
        </label>
      </div>

      {/* Verifier name */}
      <div>
        <label className="block font-medium text-text-primary mb-1">
          Verifier Name / ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-secondary">
            <User className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={verifierName}
            onChange={(e) => setVerifierName(e.target.value)}
            required
            placeholder="e.g. Jane Doe"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={isSubmitting}
          icon={<Check className="w-3.5 h-3.5" />}
        >
          {isSubmitting ? 'Saving...' : 'Confirm Verification'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
