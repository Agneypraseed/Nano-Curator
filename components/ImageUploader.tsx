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
        className="group flex h-32 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white text-stone-700 transition-all hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 md:h-40"
      >
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-stone-900 text-white transition group-hover:bg-teal-700"><Plus className="h-5 w-5" /></span>
        <span className="px-3 text-center text-xs font-semibold">{label}</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="group flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white text-stone-700 transition-all hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
    >
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-900 text-white transition group-hover:bg-teal-700"><ImageIcon className="h-5 w-5" /></span>
        <span className="px-4 text-center text-sm font-semibold">{label}</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
    </button>
  );
};
