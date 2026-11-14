import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Edit2, Trash, MapPin, ScanLine } from 'lucide-react';
import Card from '../ui/Card';
import { getBinQrImageUrl } from '../../api/client';
import type { Bin } from '../../types';

interface BinCardProps {
  bin: Bin;
  onEdit: (bin: Bin) => void;
  onDelete: (id: number) => void;
  onViewQr: (bin: Bin) => void;
}

export default function BinCard({ bin, onEdit, onDelete, onViewQr }: BinCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typesList = bin.accepted_waste_types.split(',').map((s) => s.trim());

  return (
    <Card className="p-5 flex flex-col justify-between hover:border-gray-300 transition-all">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-base text-text-primary">{bin.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>{bin.building}</span>
              <span className="text-gray-300">•</span>
              <span>{bin.floor}</span>
            </div>
          </div>

          {/* QR thumbnail trigger */}
          <button
            onClick={() => onViewQr(bin)}
            className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors flex-shrink-0"
            title="View Full QR Code"
          >
            <img
              src={getBinQrImageUrl(bin.id)}
              alt="QR preview"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // fallback icon if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
            <QrCode className="w-5 h-5 text-primary mx-auto my-2.5 hidden only:block" />
          </button>
        </div>

        {bin.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3">
            {bin.description}
          </p>
        )}

        {/* Accepted waste badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {typesList.map((type) => (
            <span
              key={type}
              className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <Link
          to={`/scan?bin=${bin.qr_code}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          <ScanLine className="w-3.5 h-3.5" />
          Audit Bin
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewQr(bin)}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="View QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(bin)}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit Bin"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg">
              <span className="text-[10px] text-error font-medium">Delete?</span>
              <button
                onClick={() => onDelete(bin.id)}
                className="text-[11px] font-bold text-white bg-error px-1.5 py-0.5 rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-text-secondary px-1"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-text-secondary hover:text-error hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Bin"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
