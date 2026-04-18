import React, { useRef } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  compact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, compact = false }) => {
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
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-32 md:h-40 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
      >
        <Plus className="w-8 h-8 mb-2" />
        <span className="text-xs font-medium">Add Photo</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
      </button>
    );
  }

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className="w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer"
    >
        <ImageIcon className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Upload Reference Image</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
    </div>
  );
};