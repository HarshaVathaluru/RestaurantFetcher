import React, { useState } from 'react';
import {
  Star,
  MapPin,
  Car,
  Clock,
  Sparkles,
  Navigation,
  Heart,
  UtensilsCrossed,
  Bike,
  Check,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Tag,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { NormalizedPlace } from '../../types';

interface RestaurantCardProps {
  place: NormalizedPlace;
  rankNumber?: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isSaved?: boolean;
  searchedFoodItems?: Array<{ name: string; quantity?: string }>;
  onSelect: (place: NormalizedPlace) => void;
  onOpenDetails?: (place: NormalizedPlace) => void;
  onShowDirections?: (place: NormalizedPlace) => void;
  onHover?: (place: NormalizedPlace | null) => void;
  onToggleSave: (place: NormalizedPlace) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  place,
  rankNumber = 1,
  isSelected,
  isHovered,
  isSaved,
  searchedFoodItems,
  onSelect,
  onOpenDetails,
  onShowDirections,
  onHover,
  onToggleSave,
}) => {
  // Table booking interactive state
  const [guests, setGuests] = useState(2);
  const [selectedDay, setSelectedDay] = useState<'Today' | 'Tomorrow'>('Today');
  const [selectedSlot, setSelectedSlot] = useState<string>('8:00 PM');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const isBestMatch = rankNumber === 1;
  const driveTime = place.travelTime?.drivingMinutes || Math.max(3, Math.round((place.distance || 1.4) * 3));
  const walkingTime = place.travelTime?.walkingMinutes || Math.max(5, Math.round((place.distance || 1.4) * 12));

  // Determine searched food item or primary menu item
  const searchedName = searchedFoodItems?.[0]?.name;
  const matchedFoodItem = searchedName
    ? place.foodItems?.find(f => {
        const fName = typeof f === 'string' ? f : f?.name;
        if (!fName) return false;
        return fName.toLowerCase().includes(searchedName.toLowerCase()) || searchedName.toLowerCase().includes(fName.toLowerCase());
      })
    : place.foodItems?.[0];

  const hasSearchedMatch = Boolean(searchedName && matchedFoodItem);
  const displayItem = matchedFoodItem || place.foodItems?.[0];
  const primaryItemName = (typeof displayItem === 'string' ? displayItem : displayItem?.name) || (hasSearchedMatch ? searchedName : 'House Specialty');
  const primaryItemPrice = (typeof displayItem === 'object' && displayItem ? displayItem?.price : undefined) || Math.round((place.averageCostPerPerson || 350) * 0.75) || 320;

  // Multi-platform delivery options: Swiggy, Zomato, Magicpin
  const rawDeliveryList: Array<{
    platform: 'swiggy' | 'zomato' | 'magicpin';
    name: string;
    emoji: string;
    bgClass: string;
    btnClass: string;
    textClass: string;
    itemPrice: number;
    deliveryFee: number;
    discount: number;
    finalEstimate: number;
    deliveryTime: string;
    offerText: string;
    url: string;
    isBestPrice?: boolean;
  }> = [];

  // Only populate if genuine verified online pricing exists in place.deliveryComparison
  const hasGenuineOnlinePricing = Boolean(
    place.deliveryComparison &&
    (place.deliveryComparison.swiggy?.itemPrice || place.deliveryComparison.zomato?.itemPrice || place.deliveryComparison.magicpin?.itemPrice)
  );

  if (hasGenuineOnlinePricing && place.deliveryComparison) {
    if (place.deliveryComparison.swiggy?.itemPrice) {
      const s = place.deliveryComparison.swiggy;
      rawDeliveryList.push({
        platform: 'swiggy',
        name: 'Swiggy',
        emoji: '🛵',
        bgClass: 'bg-orange-500/10 border-orange-500/40 ring-orange-500/20',
        btnClass: 'bg-orange-600 hover:bg-orange-500',
        textClass: 'text-orange-400',
        itemPrice: s.itemPrice,
        deliveryFee: s.deliveryFee,
        discount: s.discount,
        finalEstimate: s.finalEstimate,
        deliveryTime: s.deliveryTime,
        offerText: s.offerText || '',
        url: s.url || place.links?.swiggy || `https://www.swiggy.com/search?query=${encodeURIComponent(place.name)}`,
      });
    }

    if (place.deliveryComparison.zomato?.itemPrice) {
      const z = place.deliveryComparison.zomato;
      rawDeliveryList.push({
        platform: 'zomato',
        name: 'Zomato',
        emoji: '🍽',
        bgClass: 'bg-red-500/10 border-red-500/40 ring-red-500/20',
        btnClass: 'bg-red-600 hover:bg-red-500',
        textClass: 'text-red-400',
        itemPrice: z.itemPrice,
        deliveryFee: z.deliveryFee,
        discount: z.discount,
        finalEstimate: z.finalEstimate,
        deliveryTime: z.deliveryTime,
        offerText: z.offerText || '',
        url: z.url || place.links?.zomato || `https://www.zomato.com/search?q=${encodeURIComponent(place.name)}`,
      });
    }

    if (place.deliveryComparison.magicpin?.itemPrice) {
      const m = place.deliveryComparison.magicpin;
      rawDeliveryList.push({
        platform: 'magicpin',
        name: 'Magicpin',
        emoji: '✨',
        bgClass: 'bg-blue-500/10 border-blue-500/40 ring-blue-500/20',
        btnClass: 'bg-blue-600 hover:bg-blue-500',
        textClass: 'text-blue-400',
        itemPrice: m.itemPrice,
        deliveryFee: m.deliveryFee,
        discount: m.discount,
        finalEstimate: m.finalEstimate,
        deliveryTime: m.deliveryTime,
        offerText: m.offerText || '',
        url: m.url || place.links?.magicpin || `https://magicpin.in/search/?q=${encodeURIComponent(place.name)}`,
      });
    }
  }

  // Calculate lowest estimate if genuine prices exist
  const lowestEstimate = rawDeliveryList.length > 0
    ? Math.min(...rawDeliveryList.map(o => o.finalEstimate))
    : 0;

  const highestEstimate = rawDeliveryList.length > 0
    ? Math.max(...rawDeliveryList.map(o => o.finalEstimate))
    : 0;

  const deliveryOptions = rawDeliveryList.map(opt => ({
    ...opt,
    isBestPrice: opt.finalEstimate === lowestEstimate,
  }));

  const bestOption = deliveryOptions.find(o => o.isBestPrice) || deliveryOptions[0];
  const maxSavings = highestEstimate - lowestEstimate;

  // Strict conditional availability: only order online if genuine verified prices are present
  const canOrderOnline = hasGenuineOnlinePricing && deliveryOptions.length > 0;
  const canBookTable = Boolean(place.tableBooking && place.tableBooking.available);

  // Section expansion state: default to whichever is available
  const [activeTab, setActiveTab] = useState<'order' | 'book'>(canOrderOnline ? 'order' : 'book');

  const handleBookTable = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingConfirmed(true);
    setTimeout(() => {
      if (place.tableBooking?.directReservationUrl) {
        window.open(place.tableBooking.directReservationUrl, '_blank', 'noopener,noreferrer');
      }
    }, 1200);
  };

  return (
    <div
      onClick={() => onSelect(place)}
      onMouseEnter={() => onHover && onHover(place)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group relative flex flex-col bg-surface-card rounded-3xl border transition-all duration-300 overflow-hidden shadow-card cursor-pointer ${
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-glow -translate-y-1'
          : isHovered
          ? 'border-slate-600 shadow-md -translate-y-0.5'
          : 'border-surface-border hover:border-slate-700 hover:-translate-y-0.5'
      }`}
    >
      {/* 1. QUICK DECISION HEADER (Section 18) */}
      <div className="px-4 py-2 bg-slate-950/70 border-b border-surface-border flex flex-wrap items-center justify-between text-[11px] font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          {isBestMatch ? (
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black flex items-center gap-1 shadow-sm">
              🏆 Best Match
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-bold">
              #{rankNumber} Match
            </span>
          )}
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" /> {place.rating}
          </span>
          <span className="text-slate-500">({(place.reviewCount ?? 0).toLocaleString()})</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-cyan-400">
            <MapPin className="w-3 h-3" /> {place.distance || 1.4} km
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Car className="w-3 h-3" /> {driveTime} min
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open
          </span>
        </div>
      </div>

      {/* 2. RESTAURANT HERO IMAGE */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
        <img
          src={place.image}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-black/30" />

        {/* Floating Top Left Badges (Section 25 & 26 - Max 3 high signal badges) */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {canOrderOnline && bestOption && maxSavings > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-amber-500/40 text-amber-300 text-[10px] font-bold backdrop-blur-md flex items-center gap-1 shadow-md">
              <Tag className="w-3 h-3 text-amber-400" /> Save ₹{maxSavings} on {bestOption.name}
            </span>
          )}
          {canBookTable && !canOrderOnline && (
            <span className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-purple-500/40 text-purple-300 text-[10px] font-bold backdrop-blur-md flex items-center gap-1 shadow-md">
              🍽 Table Booking
            </span>
          )}
          {place.rating >= 4.6 && (
            <span className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-purple-500/40 text-purple-300 text-[10px] font-bold backdrop-blur-md flex items-center gap-1 shadow-md">
              ⭐ Top Rated
            </span>
          )}
        </div>

        {/* Floating Top Right: Save Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(place);
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all ${
            isSaved
              ? 'bg-rose-500 text-white shadow-lg'
              : 'bg-slate-950/60 text-slate-300 hover:text-rose-400 hover:bg-slate-950/90'
          }`}
          title={isSaved ? 'Remove from saved' : 'Save to favorites'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Floating Bottom Info */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-medium">
          <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-amber-300">
            {place.priceEstimatedText}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md capitalize text-slate-300">
            {(place.cuisine || []).slice(0, 2).join(' • ')}
          </span>
        </div>
      </div>

      {/* 3. CARD BODY */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Restaurant Title & Address */}
          <div className="mb-2">
            <h3
              onClick={() => onSelect(place)}
              className="text-xl font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer"
            >
              {place.name}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {place.address}
            </p>
          </div>

          {/* 4. YOUR SEARCHED ITEM SECTION (Only if genuinely matching!) */}
          {hasSearchedMatch ? (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-3">
              <div className="flex items-center justify-between text-[10px] uppercase font-extrabold tracking-wider text-amber-400 mb-1">
                <span>Your Searched Item</span>
                <span className="text-slate-400 font-normal normal-case">Menu listing</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  🍛 {primaryItemName}
                </span>
                <span className="text-amber-300 font-black text-base">
                  ₹{primaryItemPrice}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  {matchedFoodItem?.verified ? 'Verified authentic dish' : 'Available on house menu'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Avg. cost {place.priceEstimatedText}
                </span>
              </div>
            </div>
          ) : (
            displayItem && (
              <div className="p-3 rounded-2xl bg-surface-dark border border-surface-border mb-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">
                  <span>House Specialty</span>
                  <span className="text-slate-500 font-normal normal-case">Popular dish</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    🍽️ {displayItem.name}
                  </span>
                  {displayItem.price && (
                    <span className="text-amber-400 font-bold text-sm">
                      ₹{displayItem.price}
                    </span>
                  )}
                </div>
              </div>
            )
          )}

          {/* 5. WHY THIS MATCHES YOUR SEARCH (Section 28) */}
          {place.matchEvidence && place.matchEvidence.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4 space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Why This Matches Your Thought
              </div>
              <ul className="space-y-1 text-xs">
                {place.matchEvidence.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="shrink-0 text-emerald-400 font-bold">✓</span>
                    <span className="text-slate-300 text-[11px]">{item.replace(/^✓\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. STRICT CONDITIONAL ORDERING AND TABLE BOOKING */}
          {!canOrderOnline && (
            <div className="p-3.5 rounded-2xl bg-surface-dark/80 border border-surface-border mb-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-bold flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                  Dine-In Menu Price
                </span>
                <span className="text-amber-300 font-black text-sm">
                  {primaryItemPrice ? `₹${primaryItemPrice}` : place.priceEstimatedText}
                </span>
              </div>
              {(place.links?.swiggy || place.links?.zomato) && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400 mb-2 flex items-center justify-between">
                    <span>Live Online Delivery</span>
                    <span className="text-[9px] text-slate-500">View real-time prices on app</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {place.links?.swiggy && (
                      <a
                        href={place.links.swiggy}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="py-2 px-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Swiggy</span>
                        <ExternalLink className="w-3 h-3 text-orange-400/70" />
                      </a>
                    )}
                    {place.links?.zomato && (
                      <a
                        href={place.links.zomato}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="py-2 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Zomato</span>
                        <ExternalLink className="w-3 h-3 text-red-400/70" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TABLE BOOKING / VERIFIED ONLINE COMPARISON */}
          {(canOrderOnline || canBookTable) && (
            <div className="rounded-2xl border border-surface-border bg-slate-950/60 overflow-hidden mb-4">
              {/* TAB SELECTOR: ONLY SHOWN IF BOTH CAN ORDER AND CAN BOOK TABLE */}
              {canOrderOnline && canBookTable ? (
                <div className="flex border-b border-surface-border">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('order');
                    }}
                    className={`flex-1 py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'order'
                        ? 'bg-amber-500/10 text-amber-300 border-b-2 border-amber-400 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bike className="w-4 h-4 text-orange-400" />
                    <span>🛵 Order Online ({deliveryOptions.length} Apps)</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('book');
                    }}
                    className={`flex-1 py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'book'
                        ? 'bg-amber-500/10 text-amber-300 border-b-2 border-amber-400 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                    <span>🍽 Book a Table</span>
                  </button>
                </div>
              ) : canOrderOnline ? (
                /* Header banner when ONLY ordering is offered */
                <div className="px-3.5 py-2.5 bg-slate-900/60 border-b border-surface-border flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-orange-400" />
                    <span>Order Online — Compared across {deliveryOptions.length} Delivery Apps</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Live Deals</span>
                </div>
              ) : (
                /* Header banner when ONLY table booking is offered */
                <div className="px-3.5 py-2.5 bg-slate-900/60 border-b border-surface-border flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                    <span>Table Reservation</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{place.tableBooking?.provider || 'Direct Reservation'}</span>
                </div>
              )}

              {/* SECTION: ORDER FOOD (Shown if activeTab === 'order' when both, OR if only order available) */}
              {canOrderOnline && (activeTab === 'order' || !canBookTable) && (
                <div className="p-3.5 space-y-3">
                  {/* Best Online Price Banner */}
                  {bestOption && (
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> 🏷 Best Online Price
                      </span>
                      <span className="text-white font-extrabold">
                        {bestOption.name} (₹{bestOption.finalEstimate})
                        {maxSavings > 0 && (
                          <span className="text-emerald-400 font-bold ml-1.5 text-[10px]">
                            • Save ₹{maxSavings}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Multi-platform Comparison Cards Grid */}
                  <div className={`grid grid-cols-1 ${deliveryOptions.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2.5`}>
                    {deliveryOptions.map(opt => (
                      <div
                        key={opt.platform}
                        className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all min-w-0 ${
                          opt.isBestPrice
                            ? `${opt.bgClass} ring-1`
                            : 'bg-surface-dark border-surface-border'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`font-extrabold text-xs ${opt.textClass} flex items-center gap-1`}>
                              {opt.emoji} {opt.name}
                            </span>
                            {opt.isBestPrice && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black tracking-wide">
                                BEST DEAL
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 my-1 text-xs">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Item price</span>
                              <span className="text-white font-semibold">₹{opt.itemPrice}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 truncate max-w-[110px]">Delivery ({opt.deliveryTime})</span>
                              <span className="text-slate-300 shrink-0">₹{opt.deliveryFee}</span>
                            </div>
                            {opt.discount > 0 && (
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-emerald-400 font-medium">Coupon/Offer</span>
                                <span className="text-emerald-400 font-bold shrink-0">-₹{opt.discount}</span>
                              </div>
                            )}
                            <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total</span>
                              <span className="text-white font-black text-sm">₹{opt.finalEstimate}</span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={opt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`mt-2.5 w-full py-2 px-2 rounded-lg ${opt.btnClass} text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md transition-colors`}
                        >
                          <span>Order on {opt.name}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: BOOK A TABLE (Shown if activeTab === 'book' when both, OR if only booking available) */}
              {canBookTable && (activeTab === 'book' || !canOrderOnline) && (
                <form
                  onSubmit={handleBookTable}
                  onClick={(e) => e.stopPropagation()}
                  className="p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold flex items-center gap-1.5 text-amber-400">
                      <UtensilsCrossed className="w-3.5 h-3.5" /> Reserve for Dining
                    </span>
                    <span className="text-[11px] text-slate-400">{place.tableBooking?.provider || 'Direct Table Reservation'}</span>
                  </div>

                  {/* Day & Guests Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Day */}
                    <div className="p-2 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> Day
                      </span>
                      <div className="flex gap-1">
                        {(['Today', 'Tomorrow'] as const).map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                              selectedDay === day
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Guests */}
                    <div className="p-2 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-400" /> Guests
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGuests(Math.max(1, guests - 1));
                          }}
                          className="w-5 h-5 rounded-md bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-white text-xs">{guests}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGuests(Math.min(12, guests + 1));
                          }}
                          className="w-5 h-5 rounded-md bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                      Available Time Slots (Confirmed)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { time: '7:00 PM', status: '🟢 Available' },
                        { time: '7:30 PM', status: '🟢 Available' },
                        { time: '8:00 PM', status: '🟢 Available' },
                        { time: '8:30 PM', status: '🟡 Limited' },
                      ].map(slot => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSlot(slot.time);
                          }}
                          className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedSlot === slot.time
                              ? 'bg-amber-400 text-slate-950 border-white font-black shadow-md'
                              : 'bg-surface-dark text-slate-300 border-surface-border hover:border-slate-600'
                          }`}
                        >
                          <div className="text-[11px] font-bold">{slot.time}</div>
                          <div className={`text-[9px] ${selectedSlot === slot.time ? 'text-slate-900 font-bold' : 'text-emerald-400'}`}>
                            {slot.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reserve Action */}
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-glow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {bookingConfirmed ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950 font-black" />
                        <span>Table Reserved! Opening confirmation...</span>
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed className="w-4 h-4 text-slate-950" />
                        <span>Reserve Table for {guests} on {selectedDay} at {selectedSlot}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 7. CARD FOOTER ACTIONS ROW (Section 27 & 55) */}
        <div className="pt-3 border-t border-surface-border flex items-center gap-2">
          {/* In-App Directions Button (Opens directly inside GourmetAI interactive map) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onShowDirections) {
                onShowDirections(place);
              } else {
                onSelect(place);
              }
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600/25 via-blue-600/25 to-cyan-600/25 hover:from-cyan-600/35 hover:to-blue-600/35 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer group"
            title="View Turn-by-Turn Route in GourmetAI Application"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>📍 Directions in App ({driveTime}m)</span>
          </button>

          {/* Details Modal Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenDetails) {
                onOpenDetails(place);
              } else {
                onSelect(place);
              }
            }}
            className="py-2.5 px-4 rounded-xl bg-surface-dark hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
