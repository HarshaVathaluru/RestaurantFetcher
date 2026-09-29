import React, { useState } from 'react';
import {
  X,
  Star,
  MapPin,
  Phone,
  Globe,
  Navigation,
  Heart,
  Wine,
  Beer,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Flame,
  BadgeCheck,
  ExternalLink,
  ChefHat,
  ShoppingBag,
} from 'lucide-react';
import { NormalizedPlace } from '../../types';

interface RestaurantDetailsModalProps {
  place: NormalizedPlace | null;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave: (place: NormalizedPlace) => void;
  searchedFoodItems?: Array<{ name: string; quantity?: string }>;
  onShowDirections?: (place: NormalizedPlace) => void;
}

interface MustTryItem {
  name: string;
  price?: number;
  isVerified: boolean;
  tag: string;
  isSearchedMatch?: boolean;
  orderUrl?: string;
}

// Helper to pick contextual food emoji
const getFoodEmoji = (name: string, cuisine: string[] = []): string => {
  const text = `${name} ${cuisine.join(' ')}`.toLowerCase();
  if (text.includes('biryani') || text.includes('pulao') || text.includes('rice') || text.includes('mandi')) return '🍛';
  if (text.includes('pizza')) return '🍕';
  if (text.includes('pasta') || text.includes('spaghetti') || text.includes('noodles') || text.includes('ramen')) return '🍝';
  if (text.includes('burger')) return '🍔';
  if (text.includes('dosa') || text.includes('idli') || text.includes('vada') || text.includes('tiffin')) return '🥞';
  if (text.includes('cocktail') || text.includes('sangria') || text.includes('martini') || text.includes('mojito')) return '🍸';
  if (text.includes('beer') || text.includes('brew') || text.includes('ale')) return '🍺';
  if (text.includes('wine')) return '🍷';
  if (text.includes('coffee') || text.includes('cappuccino') || text.includes('cold brew') || text.includes('espresso')) return '☕';
  if (text.includes('tea') || text.includes('chai')) return '🍵';
  if (text.includes('kebab') || text.includes('tikka') || text.includes('tandoori') || text.includes('chicken') || text.includes('mutton') || text.includes('boti')) return '🍗';
  if (text.includes('fish') || text.includes('prawn') || text.includes('crab') || text.includes('seafood') || text.includes('lobster')) return '🍤';
  if (text.includes('dessert') || text.includes('cake') || text.includes('tiramisu') || text.includes('cheesecake') || text.includes('custard') || text.includes('sweet')) return '🍰';
  if (text.includes('salad') || text.includes('soup')) return '🥗';
  if (text.includes('sandwich') || text.includes('toast') || text.includes('wrap')) return '🥪';
  if (text.includes('nachos') || text.includes('taco')) return '🌮';
  if (text.includes('paneer') || text.includes('dal') || text.includes('curry') || text.includes('gravy')) return '🥘';
  return '🍽️';
};

// Generates verified items + smart cuisine-tailored signature recommendations
const getMustTryItems = (
  place: NormalizedPlace,
  searchedFoodItems?: Array<{ name: string; quantity?: string }>
): MustTryItem[] => {
  const items: MustTryItem[] = [];
  const existingNames = new Set<string>();

  const isMatched = (dishName: string): boolean => {
    if (!searchedFoodItems || searchedFoodItems.length === 0) return false;
    const lower = dishName.toLowerCase();
    return searchedFoodItems.some(
      s => s?.name && (lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower))
    );
  };

  // 1. Explicit verified food items from place data
  if (place.foodItems && place.foodItems.length > 0) {
    for (const f of place.foodItems) {
      if (!f?.name) continue;
      const lower = f.name.toLowerCase();
      if (existingNames.has(lower)) continue;
      existingNames.add(lower);

      const orderUrl = place.links?.swiggy
        ? `https://www.swiggy.com/search?query=${encodeURIComponent(`${place.name} ${f.name}`)}`
        : (place.links?.zomato ? `https://www.zomato.com/search?q=${encodeURIComponent(`${place.name} ${f.name}`)}` : undefined);

      items.push({
        name: f.name,
        price: f.price,
        isVerified: f.verified ?? true,
        tag: f.verified ? 'Bestseller' : 'Popular Dish',
        isSearchedMatch: isMatched(f.name),
        orderUrl,
      });
    }
  }

  // 2. Also check if place matchedFoodItems were computed by ranking engine
  if ((place as any).matchedFoodItems && Array.isArray((place as any).matchedFoodItems)) {
    for (const mf of (place as any).matchedFoodItems) {
      if (!mf?.name) continue;
      const lower = mf.name.toLowerCase();
      if (!existingNames.has(lower)) {
        existingNames.add(lower);
        items.push({
          name: mf.name,
          price: mf.price,
          isVerified: true,
          tag: 'Exact Search Match',
          isSearchedMatch: true,
          orderUrl: place.links?.swiggy
            ? `https://www.swiggy.com/search?query=${encodeURIComponent(`${place.name} ${mf.name}`)}`
            : undefined,
        });
      }
    }
  }

  // 3. If fewer than 3 items, provide intelligent culinary signatures matching cuisine & category
  if (items.length < 3) {
    const allCuisines = (place.cuisine || []).concat(place.categories || []).map(c => c.toLowerCase());
    const isItalian = allCuisines.some(c => c.includes('italian') || c.includes('pizza') || c.includes('pasta') || c.includes('mediterranean'));
    const isBiryani = allCuisines.some(c => c.includes('biryani') || c.includes('hyderabadi') || c.includes('mughlai'));
    const isSouthIndian = allCuisines.some(c => c.includes('south indian') || c.includes('andhra') || c.includes('tiffin') || c.includes('vegetarian'));
    const isNorthIndian = allCuisines.some(c => c.includes('north indian') || c.includes('punjabi'));
    const isCafe = allCuisines.some(c => c.includes('cafe') || c.includes('coffee') || c.includes('bakery'));
    const isPub = allCuisines.some(c => c.includes('pub') || c.includes('brewery') || c.includes('bar'));
    const isChinese = allCuisines.some(c => c.includes('chinese') || c.includes('asian') || c.includes('thai'));
    const isSeafood = allCuisines.some(c => c.includes('seafood') || c.includes('fish'));

    const candidateSuggestions: Array<{ name: string; price: number; tag: string }> = [];

    if (isItalian) {
      candidateSuggestions.push(
        { name: 'Woodfired Sourdough Pizza', price: 540, tag: "Chef's Signature" },
        { name: 'Truffle Mushroom Pasta', price: 490, tag: 'House Special' },
        { name: 'Classic Espresso Tiramisu', price: 320, tag: 'Must Try' }
      );
    } else if (isBiryani) {
      candidateSuggestions.push(
        { name: 'Special Dum Biryani', price: 340, tag: 'House Signature' },
        { name: 'Tandoori Murgh & Kebabs', price: 290, tag: 'Bestseller' },
        { name: 'Shahi Tukda & Mirchi Salan', price: 160, tag: 'Must Try' }
      );
    } else if (isSouthIndian) {
      candidateSuggestions.push(
        { name: 'Ghee Podi Masala Dosa', price: 160, tag: 'House Favorite' },
        { name: 'Crispy Button Vada & Sambar', price: 110, tag: 'Must Try' },
        { name: 'Traditional Filter Coffee', price: 50, tag: 'Iconic Brew' }
      );
    } else if (isNorthIndian) {
      candidateSuggestions.push(
        { name: 'Dal Makhani & Butter Naan', price: 280, tag: 'Signature' },
        { name: 'Paneer Tikka / Butter Chicken', price: 340, tag: 'Bestseller' },
        { name: 'Gulab Jamun with Rabri', price: 140, tag: 'Must Try' }
      );
    } else if (isCafe) {
      candidateSuggestions.push(
        { name: 'Artisanal Cold Brew Coffee', price: 220, tag: 'Specialty Coffee' },
        { name: 'Grilled Sourdough Sandwich', price: 280, tag: 'House Special' },
        { name: 'Baked Basque Cheesecake', price: 260, tag: 'Must Try' }
      );
    } else if (isPub) {
      candidateSuggestions.push(
        { name: 'Fresh Craft Brew Sampler', price: 340, tag: 'Brewer Special' },
        { name: 'Loaded Cheese & Jalapeño Nachos', price: 290, tag: 'Bar Favorite' },
        { name: 'Signature House Cocktails', price: 420, tag: 'Must Try' }
      );
    } else if (isChinese) {
      candidateSuggestions.push(
        { name: 'Steamed Crystal Dim Sums', price: 260, tag: 'Chef Special' },
        { name: 'Chilli Garlic Hakka Noodles', price: 220, tag: 'Popular Choice' },
        { name: 'Crispy Pepper Salt Toss', price: 270, tag: 'Must Try' }
      );
    } else if (isSeafood) {
      candidateSuggestions.push(
        { name: 'Butter Garlic Tiger Prawns', price: 520, tag: 'Signature Catch' },
        { name: 'Coastal Tawa Fish Fry', price: 420, tag: 'Chef Pick' },
        { name: 'Malabar Prawn Curry & Rice', price: 480, tag: 'Must Try' }
      );
    } else {
      const avg = place.averageCostPerPerson || 400;
      candidateSuggestions.push(
        { name: "Chef's Signature House Platter", price: Math.round(avg * 0.45), tag: "Chef's Recommendation" },
        { name: 'Crispy Specialty Starter', price: Math.round(avg * 0.35), tag: 'Popular Choice' },
        { name: 'Signature House Dessert', price: Math.round(avg * 0.22), tag: 'Must Try' }
      );
    }

    for (const sug of candidateSuggestions) {
      if (items.length >= 4) break;
      const lower = sug.name.toLowerCase();
      if (!existingNames.has(lower)) {
        existingNames.add(lower);
        const orderUrl = place.links?.swiggy
          ? `https://www.swiggy.com/search?query=${encodeURIComponent(`${place.name} ${sug.name}`)}`
          : (place.links?.zomato ? `https://www.zomato.com/search?q=${encodeURIComponent(`${place.name} ${sug.name}`)}` : undefined);

        items.push({
          name: sug.name,
          price: sug.price,
          isVerified: false,
          tag: sug.tag,
          isSearchedMatch: isMatched(sug.name),
          orderUrl,
        });
      }
    }
  }

  // Prioritize searched match items first
  return items.sort((a, b) => (b.isSearchedMatch ? 1 : 0) - (a.isSearchedMatch ? 1 : 0));
};

export const RestaurantDetailsModal: React.FC<RestaurantDetailsModalProps> = ({
  place,
  onClose,
  isSaved,
  onToggleSave,
  searchedFoodItems,
  onShowDirections,
}) => {
  if (!place) return null;

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const images = place.images && place.images.length > 0 ? place.images : [place.image];
  const mustTryItems = getMustTryItems(place, searchedFoodItems);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#111622] rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-all">
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/80 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Gallery */}
        <div className="relative h-60 sm:h-72 w-full shrink-0 bg-slate-900 overflow-hidden">
          <img
            src={images[activePhotoIdx]}
            alt={place.name}
            className="w-full h-full object-cover transition-all duration-500 ease-out"
          />
          {/* Subtle vignette gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111622] via-transparent to-black/50" />

          {/* Photo indicator dots if multiple */}
          {images.length > 1 && (
            <div className="absolute bottom-4 right-5 flex items-center gap-1.5 z-20 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === activePhotoIdx ? 'w-5 bg-amber-400' : 'w-2 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Floating Match Badge */}
          {place.matchScore !== undefined && (
            <div className="absolute bottom-4 left-5 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-amber-500/40 backdrop-blur-md text-amber-300 text-xs font-bold shadow-lg">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{place.matchScore}% Match for your preferences</span>
            </div>
          )}
        </div>

        {/* Scrollable Details Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">{place.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate max-w-sm sm:max-w-md">{place.address}</span>
                </span>
                {place.distance !== undefined && (
                  <span className="text-amber-400 font-semibold shrink-0">• {place.distance} km away</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold shadow-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{place.rating}</span>
                <span className="text-xs text-slate-400 font-normal">({place.reviewCount.toLocaleString()})</span>
              </div>

              <button
                type="button"
                onClick={() => onToggleSave(place)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                    : 'bg-surface-dark text-slate-300 border-surface-border hover:text-rose-400 hover:border-rose-500/30'
                }`}
                title={isSaved ? 'Saved to favorites' : 'Save place'}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-dark/90 border border-surface-border text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Estimated Cost</span>
              <span className="text-white font-semibold text-sm">{place.priceEstimatedText}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Operating Hours</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-sm">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{place.openingHours || 'Open Now'}</span>
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-1">Primary Cuisine</span>
              <span className="text-white font-semibold capitalize text-sm truncate block">
                {place.cuisine && place.cuisine.length > 0 ? place.cuisine.slice(0, 2).join(', ') : 'Regional Specialty'}
              </span>
            </div>
          </div>

          {/* Overview */}
          {place.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overview</h4>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">{place.description}</p>
            </div>
          )}

          {/* 🔥 MUST-TRY ITEMS & HOUSE SIGNATURES */}
          <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-surface-dark/80 to-surface-dark border border-amber-500/25 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Flame className="w-4 h-4 fill-amber-400/20" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Must-Try Items & House Signatures</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Crowd favorites & top-rated specialties at {place.name}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                {mustTryItems.some(i => i.isVerified) ? 'Verified Signatures' : 'Top Suggestions'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {mustTryItems.map((item, idx) => {
                const emoji = getFoodEmoji(item.name, place.cuisine);
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                      item.isSearchedMatch
                        ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                        : 'bg-surface-card/90 border-surface-border hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0 p-1.5 rounded-lg bg-surface-dark border border-surface-border">
                          {emoji}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-white text-sm truncate">{item.name}</h5>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {item.isSearchedMatch && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40">
                                🎯 Exact Match
                              </span>
                            )}
                            {item.isVerified ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3" /> {item.tag}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {item.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {item.price && (
                        <div className="text-right shrink-0">
                          <span className="text-amber-400 font-extrabold text-sm">₹{item.price}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Order Shortcut */}
                    {item.orderUrl && (
                      <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-orange-400" />
                          Order online
                        </span>
                        <a
                          href={item.orderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                        >
                          <span>Order on App</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Why This Matches Your Search */}
          {place.matchEvidence && place.matchEvidence.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>AI Match Evidence Breakdown</span>
              </div>
              <ul className="space-y-1.5">
                {place.matchEvidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span className="text-slate-200">{ev.replace(/^✓\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Beverage Program */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Verified Beverage Program</h4>
            {place.servesAlcohol ? (
              <div className="flex flex-wrap gap-2">
                {place.alcohol.cocktails && (
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs flex items-center gap-1.5">
                    <Wine className="w-3.5 h-3.5" /> Craft Cocktails Available
                  </span>
                )}
                {place.alcohol.beer && (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-600/10 text-amber-300 border border-amber-600/30 text-xs flex items-center gap-1.5">
                    <Beer className="w-3.5 h-3.5" /> Draught & Craft Beer Available
                  </span>
                )}
                {place.alcohol.wine && (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-600/10 text-rose-300 border border-rose-600/30 text-xs flex items-center gap-1.5">
                    Wine Cellar Available
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-surface-dark px-3 py-2 rounded-xl border border-surface-border">
                Non-alcoholic venue / Family dining establishment
              </p>
            )}
          </div>

          {/* Features and Dietary Tags */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Atmosphere & Amenities</h4>
            <div className="flex flex-wrap gap-1.5">
              {place.features.map((f, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-surface-dark text-slate-300 border border-surface-border capitalize">
                  {f}
                </span>
              ))}
              {place.dietaryOptions.map((d, i) => (
                <span key={`d-${i}`} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 capitalize">
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Authentic Guest Reviews */}
          {place.reviews && place.reviews.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Authentic Guest Reviews</h4>
              <div className="space-y-2.5">
                {place.reviews.map((rev, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-surface-dark border border-surface-border text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-white">{rev.author}</span>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <span>★ {rev.rating}</span>
                        <span className="text-[10px] text-slate-400 font-normal">• {rev.date}</span>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed italic">&ldquo;{rev.text}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Online & Table Booking */}
          {(place.links?.swiggy || place.links?.zomato || place.links?.magicpin || (place.tableBooking && place.tableBooking.available)) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-dark border border-surface-border space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Order Delivery & Table Booking
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {place.links?.swiggy && (
                  <a
                    href={place.links.swiggy}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <span>🛵 Order on Swiggy</span>
                  </a>
                )}
                {place.links?.zomato && (
                  <a
                    href={place.links.zomato}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <span>🍽 Order on Zomato</span>
                  </a>
                )}
                {place.links?.magicpin && (
                  <a
                    href={place.links.magicpin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <span>✨ Save on Magicpin</span>
                  </a>
                )}
                {place.tableBooking && place.tableBooking.available && (
                  <a
                    href={place.tableBooking.directReservationUrl || place.website || place.links?.googleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Reserve Table ({place.tableBooking.provider || 'Direct'})</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-4 border-t border-surface-border flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onShowDirections) {
                  onShowDirections(place);
                }
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>📍 View Route in Application</span>
            </button>

            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="py-3 px-4 rounded-2xl bg-surface-dark hover:bg-surface-hover text-white font-semibold text-xs border border-surface-border flex items-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call Restaurant</span>
              </a>
            )}

            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-surface-dark hover:bg-surface-hover text-white font-semibold text-xs border border-surface-border flex items-center gap-2 transition-colors"
              >
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Official Website</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
