import { useRef, useState } from 'react';
import { ImagePlus, Plus } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void | Promise<void>;
  compact?: boolean;
  disabled?: boolean;
  label?: string;
}

export function ImageUploader({ onImageSelected, compact = false, disabled = false, label = 'Upload image' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const reading = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const processFile = (file?: File) => {
    if (!file || disabled || reading.current) return;
    if (file.size === 0 || !file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }

    setError('');
    reading.current = true;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] : '';
      if (base64) void onImageSelected(base64);
      else setError('This image could not be opened. Try another file.');
    };
    reader.onerror = () => setError('This image could not be opened. Try another file.');
    reader.onloadend = () => { reading.current = false; };
    reader.readAsDataURL(file);
  };

  const Icon = compact ? Plus : ImagePlus;

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          processFile(event.dataTransfer.files[0]);
        }}
        className={'flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-center transition-colors disabled:opacity-50 ' +
          (compact ? 'min-h-24 ' : 'min-h-36 ') +
          (dragging ? 'border-plum-600 bg-plum-100 text-plum-900' : 'border-plum-400 bg-white text-plum-800 enabled:hover:border-plum-700 enabled:hover:bg-plum-50')}
      >
        <Icon className={compact ? 'size-5' : 'mb-1 size-7'} strokeWidth={1.5} aria-hidden="true" />
        <span className="text-sm font-semibold">{label}</span>
        {!compact && <span className="text-xs text-stone-600">Drag and drop or choose a file</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        disabled={disabled}
        accept="image/*"
        onChange={(event) => {
          processFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
