import { Link } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import Card from '../ui/Card';
import Badge, { statusToBadgeVariant } from '../ui/Badge';
import type { RecentAudit } from '../../types';

interface RecentAuditsProps {
  audits?: RecentAudit[];
  isLoading?: boolean;
}

export default function RecentAudits({ audits = [], isLoading }: RecentAuditsProps) {
  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Recent Audits</h3>
          <p className="text-xs text-text-secondary">Latest audit submissions & status</p>
        </div>
        <Link
          to="/analytics"
          className="text-xs font-medium text-accent hover:text-accent-light inline-flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-secondary animate-pulse">
            Loading recent audits...
          </div>
        ) : audits.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-secondary">
            No recent audits recorded yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="pb-2 font-medium">Bin & Location</th>
                <th className="pb-2 font-medium">Weight</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audits.map((audit) => {
                const dateStr = audit.created_at
                  ? new Date(audit.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';

                return (
                  <tr key={audit.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5">
                      <div className="font-medium text-text-primary">{audit.bin_name}</div>
                      <div className="text-[11px] text-text-secondary">{audit.building}</div>
                    </td>
                    <td className="py-2.5 font-medium text-text-primary">
                      {audit.measured_weight_kg.toFixed(1)} kg
                    </td>
                    <td className="py-2.5 text-text-secondary">{dateStr}</td>
                    <td className="py-2.5">
                      <Badge variant={statusToBadgeVariant(audit.status)}>
                        {audit.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        to={`/audit/${audit.id}/results`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-primary hover:bg-primary/10 transition-colors"
                        title="View Audit"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
