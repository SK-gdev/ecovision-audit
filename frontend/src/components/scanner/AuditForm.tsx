import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Send, User, FileText, AlertCircle, Scale, Brain, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import BinSelector from './BinSelector';
import QRScanner from './QRScanner';
import PhotoCapture from './PhotoCapture';
import { useCreateAudit, useClassifyAudit } from '../../hooks/useAudits';
import type { Bin } from '../../types';

interface AuditFormProps {
  bins: Bin[];
  initialBinId?: number | null;
  onScanQRRequest?: () => void;
}

export default function AuditForm({ bins, initialBinId }: AuditFormProps) {
  const navigate = useNavigate();
  const createAuditMutation = useCreateAudit();
  const classifyMutation = useClassifyAudit();

  const [selectedBinId, setSelectedBinId] = useState<number | null>(initialBinId ?? null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [weight, setWeight] = useState<number | ''>('');
  const [useAIWeight, setUseAIWeight] = useState(true); // default: let AI estimate
  const [auditorName, setAuditorName] = useState('Campus Auditor');
  const [notes, setNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQRSuccess = (text: string) => {
    let extractedQr = text.trim();
    try {
      if (text.includes('bin=')) {
        const url = new URL(text);
        const param = url.searchParams.get('bin');
        if (param) extractedQr = param;
      }
    } catch { /* not a standard url */ }

    const matchedBin = bins.find(
      (b) => b.qr_code.toLowerCase() === extractedQr.toLowerCase() || String(b.id) === extractedQr,
    );
    if (matchedBin) {
      setSelectedBinId(matchedBin.id);
      setShowScanner(false);
      setValidationError(null);
    } else {
      setValidationError(`Scanned code "${extractedQr}" did not match any active campus bin.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedBinId) { setValidationError('Please select or scan a bin.'); return; }
    if (!photo) { setValidationError('Please capture or upload a waste photo.'); return; }
    if (!useAIWeight && (weight === '' || Number(weight) <= 0)) {
      setValidationError('Please enter a valid weight greater than 0 kg, or use AI weight estimation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('bin_id', String(selectedBinId));
      formData.append('photo', photo);
      // Send 0.0 as placeholder when AI will estimate — backend will update after classification
      formData.append('measured_weight_kg', useAIWeight ? '0' : String(weight));
      formData.append('submitted_by', auditorName.trim() || 'Auditor');
      if (notes.trim()) formData.append('notes', notes.trim());

      const createdAudit = await createAuditMutation.mutateAsync(formData);

      try {
        await classifyMutation.mutateAsync(createdAudit.id);
      } catch (classifyErr) {
        console.warn('Auto-classify non-blocking error:', classifyErr);
      }

      navigate(`/audit/${createdAudit.id}/results`);
    } catch (err: unknown) {
      console.error('Audit submission error:', err);
      setValidationError(err instanceof Error ? err.message : 'Failed to submit audit. Check backend connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 max-w-2xl mx-auto shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-border mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">New Waste Audit</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Upload a bin photo — AI will detect items and estimate weight
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm"
          icon={<QrCode className="w-4 h-4 text-primary" />}
          onClick={() => setShowScanner(!showScanner)}>
          {showScanner ? 'Close Scanner' : 'Scan QR'}
        </Button>
      </div>

      {showScanner && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <QRScanner onScanSuccess={handleQRSuccess} onCancel={() => setShowScanner(false)} />
        </div>
      )}

      {validationError && (
        <div className="p-3.5 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <BinSelector bins={bins} selectedBinId={selectedBinId}
          onSelectBin={(bin) => setSelectedBinId(bin ? bin.id : null)} />

        <PhotoCapture selectedFile={photo} onPhotoSelected={(file) => setPhoto(file)} />

        {/* Weight section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-primary">Waste Weight</label>

          {/* Toggle: AI estimate vs manual */}
          <div className="flex gap-2">
            <button type="button"
              onClick={() => setUseAIWeight(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                useAIWeight
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface border-border text-text-secondary hover:border-primary/40'
              }`}>
              <Brain className="w-4 h-4" />
              AI Estimate (from photo)
              {useAIWeight && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
            </button>
            <button type="button"
              onClick={() => setUseAIWeight(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                !useAIWeight
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface border-border text-text-secondary hover:border-primary/40'
              }`}>
              <Scale className="w-4 h-4" />
              Enter Scale Weight
              {!useAIWeight && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
            </button>
          </div>

          {useAIWeight ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
              <Brain className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>AI will estimate the weight</strong> from the photo based on item count and type.
                You can verify or correct it on the results page.
              </span>
            </div>
          ) : (
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 2.35"
                className="w-full pl-10 pr-14 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-text-secondary text-sm">
                kg
              </div>
            </div>
          )}
        </div>

        {/* Auditor Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-primary">Auditor Name</label>
          <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
              <User className="w-4 h-4 text-primary" />
            </div>
            <input type="text" value={auditorName} onChange={(e) => setAuditorName(e.target.value)}
              placeholder="e.g. EcoClub Auditor 1"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-primary">Audit Notes (Optional)</label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 pointer-events-none text-text-secondary">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bin overflowing; heavy food residue observed."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full py-3" disabled={isSubmitting}
            icon={<Send className="w-4 h-4" />}>
            {isSubmitting ? 'Submitting & Running AI Vision...' : 'Submit Audit & Run AI Vision'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
