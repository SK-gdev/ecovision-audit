import { useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import BinCard from './BinCard';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import type { Bin } from '../../types';

interface BinListProps {
  bins: Bin[];
  onAddBin: () => void;
  onEditBin: (bin: Bin) => void;
  onDeleteBin: (id: number) => void;
  onViewQr: (bin: Bin) => void;
  isLoading?: boolean;
}

export default function BinList({
  bins,
  onAddBin,
  onEditBin,
  onDeleteBin,
  onViewQr,
  isLoading,
}: BinListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');

  const buildings = Array.from(new Set(bins.map((b) => b.building))).sort();

  const filteredBins = bins.filter((bin) => {
    const matchesSearch =
      bin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.floor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = selectedBuilding ? bin.building === selectedBuilding : true;
    return matchesSearch && matchesBuilding;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, building, floor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {buildings.length > 0 && (
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={onAddBin}
        >
          Add New Bin
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-text-secondary animate-pulse">
          Loading campus waste bins...
        </div>
      ) : filteredBins.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="w-8 h-8 text-text-secondary" />}
          title={searchTerm || selectedBuilding ? 'No matching bins found' : 'No bins created yet'}
          description={
            searchTerm || selectedBuilding
              ? 'Try adjusting your search criteria or clearing building filters.'
              : 'Add your first waste collection bin to start deploying QR codes across campus.'
          }
          actionLabel="Add Campus Bin"
          onAction={onAddBin}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBins.map((bin) => (
            <BinCard
              key={bin.id}
              bin={bin}
              onEdit={onEditBin}
              onDelete={onDeleteBin}
              onViewQr={onViewQr}
            />
          ))}
        </div>
      )}
    </div>
  );
}
