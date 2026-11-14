import { useState } from 'react';
import AnalyticsFilters, { type AnalyticsFilterState } from '../components/analytics/AnalyticsFilters';
import WasteBreakdown from '../components/analytics/WasteBreakdown';
import ContaminationTrend from '../components/analytics/ContaminationTrend';
import AuditHistoryTable from '../components/analytics/AuditHistoryTable';
import {
  useAnalyticsComposition,
  useAnalyticsContaminationTrend,
  useAnalyticsAudits,
} from '../hooks/useAudits';
import { useBins } from '../hooks/useBins';
import { getExportCsvUrl } from '../api/client';

export default function Analytics() {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    date_from: '',
    date_to: '',
    building: '',
    bin_id: '',
  });

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: bins = [] } = useBins();

  const queryParams = {
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    building: filters.building || undefined,
    bin_id: filters.bin_id ? Number(filters.bin_id) : undefined,
  };

  const { data: composition, isLoading: compLoading } = useAnalyticsComposition(queryParams);
  const { data: contaminationTrend, isLoading: trendLoading } =
    useAnalyticsContaminationTrend(queryParams);
  const { data: auditHistory, isLoading: tableLoading } = useAnalyticsAudits({
    ...queryParams,
    page,
    page_size: pageSize,
  });

  const handleFilterChange = (newFilters: AnalyticsFilterState) => {
    setFilters(newFilters);
    setPage(1); // reset to first page on filter change
  };

  const handleResetFilters = () => {
    setFilters({
      date_from: '',
      date_to: '',
      building: '',
      bin_id: '',
    });
    setPage(1);
  };

  const handleExportCsv = () => {
    const url = getExportCsvUrl(queryParams);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Campus Waste Analytics</h1>
        <p className="text-xs text-text-secondary mt-1">
          In-depth audit metrics, composition breakdown by campus building, contamination trends, and raw export logs
        </p>
      </div>

      {/* Filter Control Bar */}
      <AnalyticsFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onExportCsv={handleExportCsv}
        bins={bins}
      />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WasteBreakdown data={composition} isLoading={compLoading} />
        <ContaminationTrend data={contaminationTrend} isLoading={trendLoading} />
      </div>

      {/* Paginated Audit Log Table */}
      <AuditHistoryTable
        items={auditHistory?.items || []}
        page={auditHistory?.page || 1}
        totalPages={auditHistory?.total_pages || 1}
        total={auditHistory?.total || 0}
        onPageChange={(newPage) => setPage(newPage)}
        isLoading={tableLoading}
      />
    </div>
  );
}
