import { Download, Printer } from 'lucide-react';
import Button from '../ui/Button';
import { getBinQrImageUrl } from '../../api/client';
import type { Bin } from '../../types';

interface QRCodeDisplayProps {
  bin: Bin;
}

export default function QRCodeDisplay({ bin }: QRCodeDisplayProps) {
  const qrImageUrl = getBinQrImageUrl(bin.id);
  const scanTargetUrl = `http://localhost:5173/scan?bin=${bin.qr_code}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>EcoVision Bin QR - ${bin.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            p { color: #666; font-size: 14px; margin-top: 0; }
            img { width: 300px; height: 300px; margin: 20px auto; }
            .details { margin-top: 20px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>${bin.name}</h1>
          <p>${bin.building} • ${bin.floor}</p>
          <img src="${qrImageUrl}" alt="Bin QR Code" />
          <div class="details">
            <p><strong>Accepted Waste:</strong> ${bin.accepted_waste_types}</p>
            <p><strong>Scan URL:</strong> ${scanTargetUrl}</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center text-center p-2">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
        <img
          src={qrImageUrl}
          alt={`QR Code for ${bin.name}`}
          className="w-56 h-56 object-contain"
        />
      </div>

      <h3 className="font-bold text-base text-text-primary">{bin.name}</h3>
      <p className="text-xs text-text-secondary mt-0.5">
        {bin.building} • {bin.floor}
      </p>

      <div className="mt-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-border w-full text-left">
        <span className="text-[10px] uppercase font-semibold text-text-secondary block">
          QR Encoded Target
        </span>
        <code className="text-xs font-mono text-primary break-all">{scanTargetUrl}</code>
      </div>

      <div className="flex gap-2.5 mt-5 w-full">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          icon={<Printer className="w-3.5 h-3.5" />}
          onClick={handlePrint}
        >
          Print Sign
        </Button>
        <a
          href={qrImageUrl}
          download={`qr-${bin.name.toLowerCase().replace(/\s+/g, '-')}.png`}
          className="flex-1"
        >
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="w-full"
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Download PNG
          </Button>
        </a>
      </div>
    </div>
  );
}
