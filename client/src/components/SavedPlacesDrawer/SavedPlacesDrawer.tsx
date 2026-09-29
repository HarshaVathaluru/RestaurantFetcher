import React from 'react';
import { X, Heart, Star, MapPin, Navigation, Trash2 } from 'lucide-react';
import { NormalizedPlace } from '../../types';

interface SavedPlacesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlaces: NormalizedPlace[];
  onSelectPlace: (place: NormalizedPlace) => void;
  onRemovePlace: (id: string) => void;
}

export const SavedPlacesDrawer: React.FC<SavedPlacesDrawerProps> = ({
  isOpen,
  onClose,
  savedPlaces,
  onSelectPlace,
  onRemovePlace,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-card border-l border-surface-border h-full flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
            <h3 className="font-extrabold text-lg text-white">Saved Places</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {savedPlaces.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {savedPlaces.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Heart className="w-10 h-10 stroke-1 text-slate-600 mb-3" />
              <p className="font-semibold text-white mb-1">No saved places yet</p>
              <p className="text-xs">Click the heart icon on any restaurant card to keep track of your favorites.</p>
            </div>
          ) : (
            savedPlaces.map(place => (
              <div
                key={place.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-dark border border-surface-border hover:border-slate-700 transition-all"
              >
                <img
                  src={place.image}
                  alt={place.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-pointer"
                  onClick={() => {
                    onSelectPlace(place);
                    onClose();
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4
                    onClick={() => {
                      onSelectPlace(place);
                      onClose();
                    }}
                    className="font-bold text-sm text-white hover:text-amber-400 transition-colors truncate cursor-pointer"
                  >
                    {place.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold mb-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{place.rating}</span>
                    <span className="text-slate-400 font-normal">({place.priceEstimatedText})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{place.address}</p>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {place.directionsUrl && (
                    <a
                      href={place.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      title="Directions"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemovePlace(place.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
