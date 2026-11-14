import { Trash2 } from 'lucide-react';
import type { Bin } from '../../types';

interface BinSelectorProps {
  bins: Bin[];
  selectedBinId: number | null;
  onSelectBin: (bin: Bin | null) => void;
  isLoading?: boolean;
}

export default function BinSelector({
  bins,
  selectedBinId,
  onSelectBin,
  isLoading,
}: BinSelectorProps) {
  const selectedBin = bins.find((b) => b.id === selectedBinId);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        Target Audit Bin <span className="text-error">*</span>
      </label>
      <div className="relative">
        <select
          value={selectedBinId ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            const found = bins.find((b) => b.id === val) || null;
            onSelectBin(found);
          }}
          disabled={isLoading}
          className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
        >
          <option value="">-- Select a Campus Bin --</option>
          {bins.map((bin) => (
            <option key={bin.id} value={bin.id}>
              {bin.name} • {bin.building} ({bin.floor})
            </option>
          ))}
        </select>
      </div>

      {selectedBin && (
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-start gap-3 mt-2">
          <div className="p-2 bg-primary/10 rounded-md text-primary mt-0.5">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-text-primary">{selectedBin.name}</div>
            <div className="text-text-secondary">
              Location: {selectedBin.building}, {selectedBin.floor}
            </div>
            <div className="text-text-secondary mt-0.5">
              Accepted types: <span className="font-medium text-text-primary">{selectedBin.accepted_waste_types}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
