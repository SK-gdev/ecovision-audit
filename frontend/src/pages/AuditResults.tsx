import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ClipboardCheck, CheckCircle2, Brain, Scale, AlertTriangle } from 'lucide-react';
import BoundingBoxOverlay from '../components/classification/BoundingBoxOverlay';
import DetectionResults from '../components/classification/DetectionResults';
import DemoModeNotice from '../components/classification/DemoModeNotice';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/ui/Card';
import { useAudit, useClassifyAudit, useMarkAuditVerified, useConfirmWeight } from '../hooks/useAudits';
import { getPhotoUrl } from '../api/client';
import type { DetectedItem } from '../types';

export default function AuditResults() {
  const { id } = useParams<{ id: string }>();
  const auditId = Number(id);

  const { data: audit, isLoading, refetch } = useAudit(auditId);
  const classifyMutation = useClassifyAudit();
  const markVerifiedMutation = useMarkAuditVerified();
  const confirmWeightMutation = useConfirmWeight();

  const [selectedItem, setSelectedItem] = useState<DetectedItem | null>(null);
  const [manualWeight, setManualWeight] = useState('');
  const [weightMode, setWeightMode] = useState<'ai' | 'manual'>('ai');

  if (isLoading) {
    return <LoadingSpinner message="Retrieving audit records and vision detections..." />;
  }

  if (!audit) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-bold text-text-primary">Audit Not Found</h2>
        <p className="text-xs text-text-secondary mt-1">
          Could not find audit #{auditId}. It may have been deleted.
        </p>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const prediction = audit.prediction;
  const items = prediction?.detected_items || [];
  const summary = audit.summary;
  const threshold = prediction?.confidence_threshold ?? 0.7;

  // Weight state
  const aiWeightKg = prediction?.estimated_weight_kg;
  const aiConfidence = prediction?.estimated_weight_kg != null ? (prediction?.weight_confidence ?? 0) : null;
  const aiReasoning = prediction?.weight_notes;
  const isWeightConfirmed = audit.weight_human_confirmed === true;
  const hasAiWeight = aiWeightKg != null && aiWeightKg > 0;
  const measuredWeight = audit.measured_weight_kg;
  const weightPending = !isWeightConfirmed && (!measuredWeight || measuredWeight === 0);

  // Unverified items that need review
  const pendingReviewCount = items.filter(
    (item) => !item.human_verified && item.confidence < threshold,
  ).length;

  const handleReclassify = async () => {
    await classifyMutation.mutateAsync(auditId);
    refetch();
  };

  const handleMarkVerified = async () => {
    await markVerifiedMutation.mutateAsync(auditId);
    refetch();
  };

  const handleConfirmWeight = async () => {
    let kg: number;
    if (weightMode === 'ai' && hasAiWeight) {
      kg = aiWeightKg!;
    } else {
      kg = parseFloat(manualWeight);
      if (isNaN(kg) || kg <= 0) return;
    }
    await confirmWeightMutation.mutateAsync({ auditId, weightKg: kg });
    refetch();
  };

  const photoUrl = getPhotoUrl(audit.photo_path);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-text-secondary hover:text-text-primary p-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-text-primary">
              Audit #{audit.id} Results
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">
              {audit.status}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1 pl-7">
            Bin: <strong>{audit.bin?.name || `Bin #${audit.bin_id}`}</strong> ({audit.bin?.building} •{' '}
            {audit.bin?.floor})
            {isWeightConfirmed && measuredWeight ? (
              <> | <Scale className="inline w-3 h-3 mx-0.5 text-green-500" />
                <strong className="text-green-600">{measuredWeight} kg</strong>
                <span className="text-green-500 ml-1">✓ Confirmed</span>
              </>
            ) : hasAiWeight ? (
              <> | <Brain className="inline w-3 h-3 mx-0.5 text-blue-500" />
                <strong className="text-blue-600">~{aiWeightKg!.toFixed(2)} kg</strong>
                <span className="text-blue-400 ml-1">(AI estimate)</span>
              </>
            ) : (
              <> | <AlertTriangle className="inline w-3 h-3 mx-0.5 text-amber-500" /><span className="text-amber-500">Weight pending</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${classifyMutation.isPending ? 'animate-spin' : ''}`} />}
            onClick={handleReclassify}
            disabled={classifyMutation.isPending}
          >
            {classifyMutation.isPending ? 'Classifying...' : 'Re-run AI Vision'}
          </Button>

          {pendingReviewCount > 0 ? (
            <Link to="/review">
              <Button
                variant="primary"
                size="sm"
                icon={<ClipboardCheck className="w-3.5 h-3.5" />}
              >
                Review ({pendingReviewCount})
              </Button>
            </Link>
          ) : audit.status !== 'verified' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleMarkVerified}
              disabled={markVerifiedMutation.isPending}
            >
              Sign-off & Complete Audit
            </Button>
          ) : null}
        </div>
      </div>

      {/* Demo Mode Notice */}
      <DemoModeNotice
        isDemoMode={prediction?.is_demo_mode ?? true}
        modelName={prediction?.model_name ?? 'demo-mode'}
      />

      {/* AI Weight Estimation Card */}
      {prediction && (
        <Card className="p-4 border border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-text-primary">AI Weight Estimation</span>
            {isWeightConfirmed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                ✓ Human Confirmed
              </span>
            )}
            {!isWeightConfirmed && weightPending && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                ⏳ Awaiting Confirmation
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Estimate column */}
            <div className="space-y-2">
              {hasAiWeight ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-600">{aiWeightKg!.toFixed(2)}</span>
                    <span className="text-sm text-text-secondary">kg (AI estimate)</span>
                    {aiConfidence != null && (
                      <span className="text-xs text-text-secondary ml-auto">
                        {Math.round(aiConfidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  {/* Confidence bar */}
                  {aiConfidence != null && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round(aiConfidence * 100)}%` }}
                      />
                    </div>
                  )}
                  {aiReasoning && (
                    <p className="text-[11px] text-text-secondary italic leading-relaxed">
                      {aiReasoning}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-secondary">
                  No AI weight estimate available. Re-run AI Vision to get one.
                </p>
              )}

              {isWeightConfirmed && measuredWeight && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Scale className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 font-semibold">{measuredWeight} kg</span>
                  <span className="text-text-secondary text-xs">— confirmed scale weight</span>
                </div>
              )}
            </div>

            {/* Human override column */}
            {!isWeightConfirmed && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Override / Confirm Weight</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWeightMode('ai')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      weightMode === 'ai'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-surface text-text-secondary border-border hover:border-blue-300'
                    }`}
                  >
                    Use AI Estimate
                  </button>
                  <button
                    onClick={() => setWeightMode('manual')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      weightMode === 'manual'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-surface text-text-secondary border-border hover:border-green-300'
                    }`}
                  >
                    Enter Scale Weight
                  </button>
                </div>

                {weightMode === 'manual' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 1.35"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(e.target.value)}
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-text-secondary">kg</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  onClick={handleConfirmWeight}
                  disabled={
                    confirmWeightMutation.isPending ||
                    (weightMode === 'ai' && !hasAiWeight) ||
                    (weightMode === 'manual' && (!manualWeight || parseFloat(manualWeight) <= 0))
                  }
                >
                  {confirmWeightMutation.isPending ? 'Saving...' : 'Confirm Weight'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Grid: Left image overlay, Right detections list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Image with Bounding Boxes */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-4 bg-surface">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                AI Vision Detection Map
              </span>
              <span className="text-[11px] text-text-secondary">
                Latency: {prediction?.processing_time_ms ?? 0} ms
              </span>
            </div>
            <BoundingBoxOverlay
              imageUrl={photoUrl}
              items={items}
              selectedItemId={selectedItem?.id}
              onSelectItem={(item) => setSelectedItem(item)}
              confidenceThreshold={threshold}
            />
          </Card>

          {audit.notes && (
            <Card className="p-4 text-xs">
              <h4 className="font-semibold text-text-primary mb-1">Auditor Field Notes:</h4>
              <p className="text-text-secondary">{audit.notes}</p>
            </Card>
          )}
        </div>

        {/* Right: Items list & Breakdown */}
        <div className="lg:col-span-5">
          <DetectionResults
            items={items}
            summary={summary}
            selectedItemId={selectedItem?.id}
            onSelectItem={(item) => setSelectedItem(item)}
            confidenceThreshold={threshold}
          />
        </div>
      </div>
    </div>
  );
}
