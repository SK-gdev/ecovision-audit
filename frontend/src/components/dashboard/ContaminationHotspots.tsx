import { MapPin, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import type { ContaminationHotspot } from '../../types';

interface ContaminationHotspotsProps {
  hotspots?: ContaminationHotspot[];
  isLoading?: boolean;
}

export default function ContaminationHotspots({
  hotspots = [],
  isLoading,
}: ContaminationHotspotsProps) {
  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">Contamination Hotspots</h3>
        <p className="text-xs text-text-secondary">Locations with highest contamination rates</p>
      </div>

      <div className="flex-1 space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-secondary animate-pulse">
            Analyzing hotspots...
          </div>
        ) : hotspots.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-secondary">
            No hotspot data recorded yet.
          </div>
        ) : (
          hotspots.map((spot, idx) => {
            const rawRate = spot.avg_contamination_rate ?? spot.contamination_rate ?? 0;
            const percentage = Math.round(rawRate * 100);

            // Severity color
            let barColor = 'bg-accent';
            let textColor = 'text-accent';
            if (percentage > 35) {
              barColor = 'bg-error';
              textColor = 'text-error';
            } else if (percentage > 20) {
              barColor = 'bg-warning';
              textColor = 'text-warning';
            }

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-text-primary">
                    <MapPin className="w-3.5 h-3.5 text-text-secondary" />
                    <span>{spot.building}</span>
                    <span className="text-text-secondary font-normal">({spot.bin_name})</span>
                  </div>
                  <span className={`font-semibold ${textColor}`}>
                    {percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-text-secondary">
                  <span>Audits: {spot.audit_count}</span>
                  {percentage > 30 && (
                    <span className="flex items-center gap-0.5 text-error">
                      <AlertCircle className="w-3 h-3" /> Needs Attention
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
