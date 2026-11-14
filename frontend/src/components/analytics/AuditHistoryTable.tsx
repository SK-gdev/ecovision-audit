import { Link } from 'react-router-dom';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import Badge, { statusToBadgeVariant } from '../ui/Badge';
import Button from '../ui/Button';
import type { AuditHistoryItem } from '../../types';

interface AuditHistoryTableProps {
  items: AuditHistoryItem[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export default function AuditHistoryTable({
  items,
  page,
  totalPages,
  total,
  onPageChange,
  isLoading,
}: AuditHistoryTableProps) {
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Audit Log & Records</h3>
          <p className="text-xs text-text-secondary">
            Showing {items.length} of {total} total audits
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-text-secondary animate-pulse">
            Loading audit history...
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-text-secondary">
            No audits match the selected filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="pb-2.5 font-medium">Audit ID</th>
                <th className="pb-2.5 font-medium">Bin & Location</th>
                <th className="pb-2.5 font-medium">Weight</th>
                <th className="pb-2.5 font-medium">Items</th>
                <th className="pb-2.5 font-medium">Contam. Rate</th>
                <th className="pb-2.5 font-medium">Status</th>
                <th className="pb-2.5 font-medium">Submitted By</th>
                <th className="pb-2.5 font-medium">Date</th>
                <th className="pb-2.5 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row) => {
                const dateStr = row.created_at
                  ? new Date(row.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A';

                return (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 font-mono font-medium text-text-primary">#{row.id}</td>
                    <td className="py-3">
                      <div className="font-medium text-text-primary">{row.bin_name}</div>
                      <div className="text-[11px] text-text-secondary">{row.building}</div>
                    </td>
                    <td className="py-3 font-medium text-text-primary">
                      {row.measured_weight_kg.toFixed(1)} kg
                    </td>
                    <td className="py-3">{row.total_items} items</td>
                    <td className="py-3">
                      <span
                        className={`font-semibold ${
                          row.contamination_rate > 0.25 ? 'text-error' : 'text-accent'
                        }`}
                      >
                        {Math.round(row.contamination_rate * 100)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge variant={statusToBadgeVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="py-3 text-text-secondary">{row.submitted_by}</td>
                    <td className="py-3 text-text-secondary">{dateStr}</td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/audit/${row.id}/results`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
          <span className="text-xs text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
