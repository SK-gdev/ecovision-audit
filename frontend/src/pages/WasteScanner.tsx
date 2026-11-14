import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AuditForm from '../components/scanner/AuditForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useBins } from '../hooks/useBins';

export default function WasteScanner() {
  const [searchParams] = useSearchParams();
  const binParam = searchParams.get('bin'); // Can be UUID or ID string
  const { data: bins = [], isLoading } = useBins();
  const [initialBinId, setInitialBinId] = useState<number | null>(null);

  useEffect(() => {
    if (binParam && bins.length > 0) {
      const match = bins.find(
        (b) => b.qr_code.toLowerCase() === binParam.toLowerCase() || String(b.id) === binParam,
      );
      if (match) {
        setInitialBinId(match.id);
      }
    }
  }, [binParam, bins]);

  if (isLoading) {
    return <LoadingSpinner message="Loading campus bin catalog..." />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-text-primary">Waste Audit & Scan</h1>
        <p className="text-xs text-text-secondary mt-1">
          Perform a verified campus bin audit. Scan QR code, weigh bag, and let AI detect plastic types.
        </p>
      </div>

      <AuditForm
        bins={bins}
        initialBinId={initialBinId}
      />
    </div>
  );
}
