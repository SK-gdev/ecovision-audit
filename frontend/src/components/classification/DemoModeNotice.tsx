import { AlertTriangle, Info } from 'lucide-react';

interface DemoModeNoticeProps {
  isDemoMode?: boolean;
  modelName?: string;
}

export default function DemoModeNotice({
  isDemoMode = true,
  modelName = 'demo-mode',
}: DemoModeNoticeProps) {
  if (!isDemoMode) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 flex items-center justify-between text-xs mb-6">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>
            AI Vision Model Active: <strong className="font-semibold">{modelName}</strong> (YOLOv8 Production)
          </span>
        </div>
        <span className="bg-emerald-200/60 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
          Live Model
        </span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-6 shadow-sm">
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5 sm:mt-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold uppercase tracking-wider text-[11px] bg-amber-200/80 px-2 py-0.5 rounded mr-2 text-amber-900">
            DEMO MODE ACTIVE
          </span>
          <span className="text-amber-800">
            Detections generated with realistic mock bounding boxes because custom weights{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">models/best.pt</code>{' '}
            were not found.
          </span>
        </div>
      </div>
      <div className="text-[11px] text-amber-700 font-medium whitespace-nowrap self-end sm:self-center">
        Synthetic Detections
      </div>
    </div>
  );
}
