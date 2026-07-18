import React, { useMemo, useState } from 'react';
import { Check, FolderHeart, Shirt, Sparkles, Image as ImageIcon, Trash2, Loader2, Plus } from 'lucide-react';
import Button from '../Button';
import { ImageUploader } from '../ImageUploader';

interface WardrobePageProps {
  wardrobeLibrary: string[];
  onAddWardrobeItem: (base64: string) => Promise<string>;
  onRemoveWardrobeItem: (base64: string) => void;
  onPlanSuggestion: (selectedPhotos: string[]) => void;
  onNavigateHome: () => void;
}

export const WardrobePage: React.FC<WardrobePageProps> = ({
  wardrobeLibrary,
  onAddWardrobeItem,
  onRemoveWardrobeItem,
  onPlanSuggestion,
  onNavigateHome,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleToggleSelect = (photo: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photo) ? prev.filter((item) => item !== photo) : [...prev, photo]
    );
  };

  const handleSelectAll = () => {
    if (selectedPhotos.length === wardrobeLibrary.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos([...wardrobeLibrary]);
    }
  };

  const handleUploadSelected = async (base64: string) => {
    setIsUploading(true);
    try {
      const finalCutout = await onAddWardrobeItem(base64);
      // Auto-select the newly added item for convenience
      setSelectedPhotos((prev) => [...prev, finalCutout]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePlanSuggestionClick = () => {
    onPlanSuggestion(selectedPhotos);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {/* Header Info */}
      <div className="mb-10 flex flex-col justify-between gap-6 border-b border-stone-200 pb-6 md:flex-row md:items-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl flex items-center gap-3">
            <FolderHeart className="h-8 w-8 text-teal-600" />
            My Wardrobe Collection
          </h1>
          <p className="text-base text-stone-500">
            Manage your clothes library. Upload photos to extract items with your selected AI provider, then select pieces to get outfit suggestions.
          </p>
        </div>

        {selectedPhotos.length > 0 && (
          <Button
            onClick={handlePlanSuggestionClick}
            className="flex items-center gap-2 px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg shadow-teal-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5" />
            Plan Suggestion with {selectedPhotos.length} Selected
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900">
          All Clothes ({wardrobeLibrary.length})
        </h2>
        {wardrobeLibrary.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition"
          >
            {selectedPhotos.length === wardrobeLibrary.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {/* Upload Card Slot */}
        <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-stone-200 bg-white p-4 text-center hover:border-teal-400 hover:bg-teal-50/10 transition duration-300">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="text-xs font-semibold text-stone-700">Gemini extracting cutout...</p>
            </div>
          ) : (
            <ImageUploader onImageSelected={handleUploadSelected} compact label="Add to Wardrobe" />
          )}
        </div>

        {/* Existing Wardrobe Items */}
        {wardrobeLibrary.map((photo, index) => {
          const isSelected = selectedPhotos.includes(photo);
          return (
            <article
              key={`wardrobe-item-${index}`}
              onClick={() => handleToggleSelect(photo)}
              className={`group relative overflow-hidden rounded-[2rem] border bg-white p-2 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer ${
                isSelected ? 'border-teal-600 ring-2 ring-teal-100 ring-offset-2' : 'border-stone-200'
              }`}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-stone-50">
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt={`Wardrobe item ${index + 1}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />

                {/* Selected Indicator Overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-teal-900/10 transition-opacity duration-200 ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white text-white transition-all duration-300 ${
                      isSelected ? 'bg-teal-600 scale-100' : 'bg-black/40 scale-90 group-hover:scale-100'
                    }`}
                  >
                    <Check className="h-5 w-5" />
                  </div>
                </div>

                {/* Delete button (hover overlay) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid triggering selection
                    onRemoveWardrobeItem(photo);
                    setSelectedPhotos((prev) => prev.filter((p) => p !== photo));
                  }}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition duration-200"
                  aria-label="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3">
                <h3 className="truncate text-sm font-semibold text-stone-800">Item #{index + 1}</h3>
                <p className="mt-0.5 text-xs text-stone-500">Click to select</p>
              </div>
            </article>
          );
        })}
      </div>

      {wardrobeLibrary.length === 0 && !isUploading && (
        <div className="mt-8 rounded-[2.5rem] border border-dashed border-stone-300 bg-white py-12 text-center text-stone-500">
          No items added to your wardrobe library yet. Click the card above to upload an item and have your selected provider extract it.
        </div>
      )}
    </div>
  );
};
