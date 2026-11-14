import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { Camera, UploadCloud, X, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';

interface PhotoCaptureProps {
  onPhotoSelected: (file: File | null) => void;
  selectedFile: File | null;
}

export default function PhotoCapture({ onPhotoSelected, selectedFile }: PhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onPhotoSelected(file);
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      onPhotoSelected(null);
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.type.startsWith('image/')) {
      handleFileChange(file);
    }
  };

  const handleRemove = () => {
    handleFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        Waste Photo <span className="text-error">*</span>
      </label>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onInputChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-gray-900 group">
          <img
            src={previewUrl}
            alt="Waste audit preview"
            className="w-full max-h-80 object-contain mx-auto"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
              title="Remove photo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{selectedFile?.name ?? 'Captured Image'}</span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors flex flex-col items-center justify-center cursor-pointer ${
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            Upload waste bag photo or take picture
          </p>
          <p className="text-xs text-text-secondary mt-1 max-w-xs">
            Supports PNG, JPG, or WEBP up to 15MB. Ensure good lighting for YOLO detection.
          </p>

          <div className="flex gap-2.5 mt-4" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Camera className="w-4 h-4 text-primary" />}
              onClick={() => cameraInputRef.current?.click()}
            >
              Camera
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<UploadCloud className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
