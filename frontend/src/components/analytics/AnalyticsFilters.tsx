import { Calendar, Building, Trash2, Download, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import type { Bin } from '../../types';

export interface AnalyticsFilterState {
  date_from: string;
  date_to: string;
  building: string;
  bin_id: string;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  onReset: () => void;
  onExportCsv: () => void;
  bins: Bin[];
  isExporting?: boolean;
}

export default function AnalyticsFilters({
  filters,
  onChange,
  onReset,
  onExportCsv,
  bins,
  isExporting = false,
}: AnalyticsFiltersProps) {
  // Extract distinct buildings from bins list
  const buildings = Array.from(new Set(bins.map((b) => b.building))).sort();

  // Filter bins based on selected building if any
  const filteredBins = filters.building
    ? bins.filter((b) => b.building === filters.building)
    : bins;

  return (
    <div className="bg-surface p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            From Date
          </label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            To Date
          </label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Building */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-primary" />
            Building Location
          </label>
          <select
            value={filters.building}
            onChange={(e) =>
              onChange({
                ...filters,
                building: e.target.value,
                bin_id: '', // reset bin if building changes
              })
            }
            className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Buildings</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Bin */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5 text-primary" />
            Specific Bin
          </label>
          <select
            value={filters.bin_id}
            onChange={(e) => onChange({ ...filters, bin_id: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Bins</option>
            {filteredBins.map((bin) => (
              <option key={bin.id} value={bin.id}>
                {bin.name} ({bin.floor})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onReset}
        >
          Reset Filters
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={<Download className="w-3.5 h-3.5" />}
          onClick={onExportCsv}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Filtered CSV'}
        </Button>
      </div>
    </div>
  );
}
