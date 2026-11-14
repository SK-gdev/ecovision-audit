import { Scale } from 'lucide-react';

interface WeightInputProps {
  value: number | '';
  onChange: (val: number | '') => void;
  error?: string;
}

export default function WeightInput({ value, onChange, error }: WeightInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary">
        Enter measured weight from scale (kg) <span className="text-error">*</span>
      </label>
      <div className="relative rounded-lg shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
          <Scale className="w-4 h-4 text-primary" />
        </div>
        <input
          type="number"
          step="0.1"
          min="0.1"
          max="50"
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange('');
            } else {
              const num = parseFloat(raw);
              onChange(isNaN(num) ? '' : num);
            }
          }}
          placeholder="e.g. 2.4"
          className={`w-full pl-10 pr-12 py-2.5 text-sm bg-surface border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
            error ? 'border-error' : 'border-border'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-semibold text-text-secondary">
          kg
        </div>
      </div>
      {error ? (
        <p className="text-xs text-error mt-1">{error}</p>
      ) : (
        <p className="text-xs text-text-secondary">
          Acceptable range: 0.1 kg to 50.0 kg
        </p>
      )}
    </div>
  );
}
