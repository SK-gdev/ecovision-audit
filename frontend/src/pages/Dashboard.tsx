import { Link } from 'react-router-dom';
import { ScanLine, RefreshCw } from 'lucide-react';
import StatsGrid from '../components/dashboard/StatsGrid';
import WasteCompositionChart from '../components/dashboard/WasteCompositionChart';
import MonthlyTrendsChart from '../components/dashboard/MonthlyTrendsChart';
import RecentAudits from '../components/dashboard/RecentAudits';
import ContaminationHotspots from '../components/dashboard/ContaminationHotspots';
import DemoModeNotice from '../components/classification/DemoModeNotice';
import Button from '../components/ui/Button';
import {
  useDashboardStats,
  useRecentAudits,
  useContaminationHotspots,
  useMonthlyTrends,
  useWasteComposition,
} from '../hooks/useDashboard';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: recentAudits, isLoading: auditsLoading } = useRecentAudits();
  const { data: hotspots, isLoading: hotspotsLoading } = useContaminationHotspots();
  const { data: trends, isLoading: trendsLoading } = useMonthlyTrends();
  const { data: composition, isLoading: compLoading } = useWasteComposition();

  const handleRefresh = () => {
    refetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Campus Audit Overview</h1>
          <p className="text-xs text-text-secondary mt-1">
            Real-time plastic waste metrics, AI classification analytics & contamination hotspots
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Link to="/scan">
            <Button
              variant="primary"
              size="sm"
              icon={<ScanLine className="w-3.5 h-3.5" />}
            >
              Start New Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Demo Mode Notice */}
      <DemoModeNotice isDemoMode={true} modelName="demo-mode / YOLOv8" />

      {/* Stat Cards */}
      <StatsGrid stats={stats} isLoading={statsLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WasteCompositionChart data={composition} isLoading={compLoading} />
        <MonthlyTrendsChart data={trends} isLoading={trendsLoading} />
      </div>

      {/* Tables & Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentAudits audits={recentAudits} isLoading={auditsLoading} />
        </div>
        <div className="lg:col-span-1">
          <ContaminationHotspots hotspots={hotspots} isLoading={hotspotsLoading} />
        </div>
      </div>
    </div>
  );
}
