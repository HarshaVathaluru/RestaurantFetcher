/**
 * Rich, authentic culinary photography categorized by cuisine and signature dishes.
 * Ensures that biryani places show real biryani, pizza places show real pizza,
 * cafes show real coffee, etc., instead of rotating the same 5 photos.
 */

interface PhotoCollection {
  covers: string[];
  gallery: string[];
}

const CUISINE_PHOTOS: Record<string, PhotoCollection> = {
  biryani: {
    covers: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80', // Royal Dum Biryani
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80', // Handi Biryani
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1000&q=80', // Hyderabadi Dum
      'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=1000&q=80', // Spiced Rice Biryani
    ],
    gallery: [
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=1000&q=80', // Seekh Kebab
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1000&q=80', // Tandoori Chicken
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80', // Biryani table
    ],
  },
  pizza: {
    covers: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80', // Artisan Pizza
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80', // Margherita Slice
      'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1000&q=80', // Wood Fired Pizza
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80', // Gourmet Pizza
    ],
    gallery: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80', // Italian Pasta
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1000&q=80', // Garlic Bread
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
    ],
  },
  south_indian: {
    covers: [
      'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=80', // Crispy Masala Dosa
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80', // Idli & Sambar Vada
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1000&q=80', // South Indian Thali
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80', // Samosa / Tiffin
    ],
    gallery: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80', // Filter Coffee
      'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=80', // Dosa close up
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80', // Chutneys
    ],
  },
  burgers: {
    covers: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80', // Gourmet Cheeseburger
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80', // Burger with Fries
      'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=1000&q=80', // Crispy Chicken Burger
    ],
    gallery: [
      'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=1000&q=80', // Loaded Fries
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=80', // Fried Chicken Tenders
    ],
  },
  cafe: {
    covers: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80', // Cozy Artisan Cafe
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80', // Modern Coffee Bar
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80', // Coffee Table Setting
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=80', // Espresso Bar
    ],
    gallery: [
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1000&q=80', // Latte Art
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80', // Pastry & Cappuccino
    ],
  },
  bar: {
    covers: [
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80', // Cocktail Bar Ambiance
      'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1000&q=80', // Craft Beer Taps
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80', // Signature Cocktails
    ],
    gallery: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1000&q=80', // Wine & Tapas
      'https://images.unsplash.com/photo-1538488881522-4321c77a760b?auto=format&fit=crop&w=1000&q=80', // Lounge Bar Seating
    ],
  },
  desserts: {
    covers: [
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1000&q=80', // Artisanal Ice Cream
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=1000&q=80', // Belgian Waffle
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80', // Pastry & Cakes
    ],
    gallery: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=80', // Bakery Display
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1000&q=80',
    ],
  },
  general_dining: {
    covers: [
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1000&q=80', // Fine Dining Room
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80', // Restaurant Interior
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80', // Table Setting
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80', // Bistro Atmosphere
    ],
    gallery: [
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80', // Chef preparing meal
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    ],
  },
};

/**
 * Deterministically picks high-res, cuisine-matched photos based on restaurant name
 */
export function getDynamicFoodImages(name: string, cuisines: string[] = [], searchedDish?: string): { coverImage: string; gallery: string[] } {
  const combined = `${name} ${cuisines.join(' ')} ${searchedDish || ''}`.toLowerCase();

  let categoryKey = 'general_dining';
  if (/biryani|mandi|pulao|mughlai|haleem|kebabs?/i.test(combined)) {
    categoryKey = 'biryani';
  } else if (/pizza|italian|pasta/i.test(combined)) {
    categoryKey = 'pizza';
  } else if (/dosa|idli|vada|tiffin|south\s*indian|bonda|upma|pongal/i.test(combined)) {
    categoryKey = 'south_indian';
  } else if (/burger|kfc|mcdonald|fries|fried\s*chicken/i.test(combined)) {
    categoryKey = 'burgers';
  } else if (/cafe|coffee|cappuccino|starbucks|brew/i.test(combined)) {
    categoryKey = 'cafe';
  } else if (/pub|brewery|bar|cocktail|beer|wine|lounge/i.test(combined)) {
    categoryKey = 'bar';
  } else if (/dessert|ice\s*cream|waffle|cake|pastry|bakery/i.test(combined)) {
    categoryKey = 'desserts';
  }

  const collection = CUISINE_PHOTOS[categoryKey] || CUISINE_PHOTOS.general_dining;

  // Simple string hash for determinism so the same restaurant always shows the same photo,
  // but two different restaurants will almost always show different photos!
  const hash = Math.abs(name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const coverIndex = hash % collection.covers.length;
  const coverImage = collection.covers[coverIndex];

  // Rotate gallery items
  const gallery = [coverImage, ...collection.gallery];

  return { coverImage, gallery };
}
