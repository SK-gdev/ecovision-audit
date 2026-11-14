import { useState } from 'react';
import Button from '../ui/Button';
import type { Bin, BinCreate, BinUpdate } from '../../types';

interface BinFormProps {
  initialBin?: Bin | null;
  onSubmit: (data: BinCreate | BinUpdate) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const COMMON_WASTE_TYPES = ['plastic', 'paper', 'general', 'organic', 'glass', 'metal'];

export default function BinForm({
  initialBin,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BinFormProps) {
  const [name, setName] = useState(initialBin?.name || '');
  const [building, setBuilding] = useState(initialBin?.building || '');
  const [floor, setFloor] = useState(initialBin?.floor || '');
  const [description, setDescription] = useState(initialBin?.description || '');

  // Parse accepted waste types as array of strings
  const initialTypes = initialBin?.accepted_waste_types
    ? initialBin.accepted_waste_types.split(',').map((s) => s.trim())
    : ['plastic', 'paper', 'general'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [error, setError] = useState<string | null>(null);

  const toggleType = (t: string) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((x) => x !== t));
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !building.trim() || !floor.trim()) {
      setError('Name, building, and floor are required.');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        building: building.trim(),
        floor: floor.trim(),
        description: description.trim() || undefined,
        accepted_waste_types: selectedTypes.join(','),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save bin.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 bg-red-50 text-error rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block font-medium text-text-primary mb-1">
          Bin Name <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Science Complex Bin 2"
          required
          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-text-primary mb-1">
            Building Location <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="e.g. Library Wing"
            required
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block font-medium text-text-primary mb-1">
            Floor / Area <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="e.g. 2nd Floor East"
            required
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium text-text-primary mb-1">
          Accepted Waste Types (Multi-select)
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          {COMMON_WASTE_TYPES.map((t) => {
            const isSelected = selectedTypes.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block font-medium text-text-primary mb-1">
          Description / Additional Location Notes
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Located right next to the vending machines."
          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      <div className="flex gap-2.5 pt-3 border-t border-border">
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialBin ? 'Update Bin' : 'Create Bin'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
