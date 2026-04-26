import React, { useRef } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  compact?: boolean;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, compact = false, label = 'Upload image' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        onImageSelected(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  if (compact) {
    return (
      <button 
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex h-32 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 text-slate-400 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-500 md:h-40"
      >
        <Plus className="w-8 h-8 mb-2" />
        <span className="text-xs font-medium">{label}</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
      </button>
    );
  }

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 text-slate-400 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-500"
    >
        <ImageIcon className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">{label}</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
    </div>
  );
};
