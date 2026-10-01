import { GoogleGenerativeAI } from '@google/generative-ai';
import { SearchIntent, SearchIntentSchema } from '../../models/place';

export class IntentParserService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use gemini-flash-lite-latest (fastest & highly available Google Generative AI model)
      const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
    }
  }

  /**
   * Parse a natural language user query into structured SearchIntent.
   */
  async parseQuery(query: string, userCoords?: { latitude: number; longitude: number }): Promise<SearchIntent> {
    try {
      if (this.model) {
        const prompt = `You are a precision AI Intent Extraction engine for a restaurant discovery application.
Extract user search preferences from the query into the exact JSON structure defined below.

CRITICAL RULES:
1. Classification:
   - "pub", "bar", "brewery" -> category: ["pub", "bar"]
   - "cocktails", "beer", "wine" -> alcohol.required: true, plus specific boolean flag
   - "restaurant with cocktails" -> category: ["restaurant"], alcohol: { required: true, cocktails: true }
   - "food", "dinner", "biryani", etc. -> category: ["restaurant"]
   - "hotel" -> category: ["restaurant"] (in Indian English context)
2. Location:
   - "near me", "nearby", "close to me", "within X km", "near X km" -> type: "nearby", radius: extract radius in meters (e.g. "within 2 km" or "near 2 km" -> 2000). DO NOT put distances or km as the location query.
   - Specific place/city (e.g. "Hyderabad", "Charminar", "Indiranagar", "Connaught Place") -> type: "destination" or "city", query: name. If no specific city is given, leave query empty.
3. Rating:
   - "above 4.2", "4.5+", "highly rated" -> rating: { minimum: 4.2 }
4. Budget:
   - "under 500", "under $40", "under £30", "cheap", "affordable" -> budget: { maximum: number, currency: "USD" | "GBP" | "EUR" | "AED" | "INR" }
5. Dietary:
   - "veg", "vegetarian", "vegan", "halal", "gluten-free" -> dietary: ["vegetarian"]
6. Atmosphere & Features:
   - "romantic", "rooftop", "outdoor", "quiet", "luxury", "party"
   - "live music", "sports screening", "wifi", "parking", "pet friendly"
7. Open Now:
   - "open now", "open tonight", "late night" -> openNow: true
8. Food Items & Count:
   - Extract specific dishes like "mutton biryani", "pizza" into foodItems array.
   - "best one", "best hotel", "top 1" -> resultCount: 1. "top 5" -> resultCount: 5. Default is 10.

Query: "${query}"

Return valid JSON conforming to this schema:
{
  "intent": "restaurant_search",
  "location": {
    "type": "nearby" | "city" | "destination" | "address",
    "query": string,
    "radius": number
  },
  "category": ["restaurant" | "bar" | "pub" | "cafe"],
  "cuisine": string[],
  "foodPreferences": string[],
  "foodItems": [{"name": "string", "quantity": "string"}],
  "dietary": string[],
  "rating": { "minimum": number },
  "budget": { "maximum": number, "currency": string },
  "audience": string[],
  "atmosphere": string[],
  "features": string[],
  "entertainment": string[],
  "alcohol": { "required": boolean, "beer": boolean, "wine": boolean, "cocktails": boolean },
  "openNow": boolean,
  "sort": "relevance",
  "resultCount": number
}`;

        const result = await this.model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        // Check if query is actually a distance string rather than a destination
        const isDistanceString = parsed.location?.query &&
          /^(?:within|near|under|in|around|less\s+than)?\s*\d+(?:\.\d+)?\s*(?:km|kms|kilo|kilometers?|k|m|meters?)$/i.test(parsed.location.query.trim());
        if (isDistanceString) {
          parsed.location.query = '';
          parsed.location.type = 'nearby';
        }

        // Inject coordinates ONLY if truly a generic nearby search without an explicit destination
        const hasSpecificDestination = parsed.location?.query &&
          !/^(near me|nearby|around here|close by|closest|my location|here)$/i.test(parsed.location.query.trim());

        if (hasSpecificDestination) {
          parsed.location.type = 'city';
          delete parsed.location.latitude;
          delete parsed.location.longitude;
        } else if (userCoords) {
          parsed.location = {
            ...parsed.location,
            type: 'nearby',
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
          };
        }

        const validated = SearchIntentSchema.parse(parsed);
        return validated as SearchIntent;
      }
    } catch (err) {
      console.warn('Gemini intent extraction fell back to rule-based parser:', err);
    }

    // High quality deterministic fallback
    return this.fallbackParse(query, userCoords);
  }

  /**
   * Refines an existing SearchIntent with follow-up conversational instructions.
   */
  async refineIntent(
    previousIntent: SearchIntent,
    refinementQuery: string,
    userCoords?: { latitude: number; longitude: number }
  ): Promise<SearchIntent> {
    // 1. Immediately apply high-precision deterministic refinement
    const baseRefined = this.fallbackRefine(previousIntent, refinementQuery);

    // 2. If Gemini AI is active, attempt enhancement with a strict 1200ms timeout
    if (this.model) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI Refine Timeout')), 1200)
        );

        const aiPromise = (async () => {
          const prompt = `You are a conversational restaurant search assistant.
The user is modifying their previous search intent with follow-up instructions.
Merge the new instruction into the previous JSON intent without losing unaffected criteria.
Ensure you preserve all existing foodItems, budget, rating, dietary and location from previous intent unless explicitly asked to remove them.

Previous Intent:
${JSON.stringify(previousIntent, null, 2)}

Refinement Request:
"${refinementQuery}"

Return the updated valid SearchIntent JSON.`;

          const result = await this.model.generateContent(prompt);
          const text = result.response.text();
          // Strip any accidental markdown formatting
          const cleanJson = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (userCoords && parsed.location?.type === 'nearby') {
            parsed.location.latitude = userCoords.latitude;
            parsed.location.longitude = userCoords.longitude;
          }

          return SearchIntentSchema.parse(parsed) as SearchIntent;
        })();

        const aiResult = await Promise.race([aiPromise, timeoutPromise]);
        if (aiResult) {
          // Merge safely with baseRefined so deterministic rules are never lost
          return {
            ...aiResult,
            foodItems: aiResult.foodItems?.length ? aiResult.foodItems : baseRefined.foodItems,
            rating: baseRefined.rating || aiResult.rating,
            budget: baseRefined.budget || aiResult.budget,
            dietary: Array.from(new Set([...(baseRefined.dietary || []), ...(aiResult.dietary || [])])),
            atmosphere: Array.from(new Set([...(baseRefined.atmosphere || []), ...(aiResult.atmosphere || [])])),
            features: Array.from(new Set([...(baseRefined.features || []), ...(aiResult.features || [])])),
            resultCount: baseRefined.resultCount ?? aiResult.resultCount ?? 10,
          };
        }
      } catch (err) {
        // Silently use deterministic refinement
      }
    }

    return baseRefined;
  }

  /**
   * Deterministic rule-based parser for bulletproof reliability.
   */
  private fallbackParse(query: string, userCoords?: { latitude: number; longitude: number }): SearchIntent {
    const q = query.toLowerCase();

    // Location
    const isNearby = /near me|nearby|around here|close by|closest/i.test(q);
    let locationType: 'nearby' | 'city' | 'destination' | 'address' = isNearby ? 'nearby' : 'nearby';
    let locationQuery = '';

    const radiusMatch = q.match(/(?:within|near|under|in|around|less\s+than|radius\s*(?:of|near)?)\s*(\d+(?:\.\d+)?)\s*(?:km|kms|kilo|kilometers?|k\b)/i)
      || q.match(/(\d+(?:\.\d+)?)\s*(?:km|kms|kilo|kilometers?)\s*(?:radius|near|away|distance)?/i);
    const radius = radiusMatch ? Math.round(parseFloat(radiusMatch[1]) * 1000) : 5000;

    // Detect known cities / areas or natural language patterns "in <location>", "at <location>", "near <location>"
    const locationKeywords = [
      'tirupati', 'tirupathi', 'tirupaty', 'alipiri', 'tirumala', 'kapila theertham', 'chittoor',
      'hyderabad', 'charminar', 'hitech city', 'madhapur',
      'gachibowli', 'banjara hills', 'jubilee hills', 'secunderabad', 'kondapur',
      'bangalore', 'bengaluru', 'indiranagar', 'koramangala', 'whitefield',
      'mumbai', 'bandra', 'juhu', 'colaba', 'delhi', 'new delhi', 'gurgaon', 'noida',
      'goa', 'panaji', 'chennai', 'pune', 'kolkata', 'jaipur', 'ahmedabad',
      'chandigarh', 'kochi', 'lucknow', 'vijayawada', 'visakhapatnam', 'vizag',
      'warangal', 'guntur', 'nellore', 'kurnool', 'anantapur', 'kadapa', 'rajahmundry', 'kakinada',
      'dubai', 'london', 'new york', 'singapore', 'tokyo', 'paris'
    ];

    for (const loc of locationKeywords) {
      if (new RegExp(`\\b${loc}\\b`, 'i').test(q)) {
        locationType = 'city';
        locationQuery = loc.charAt(0).toUpperCase() + loc.slice(1);
        break;
      }
    }

    if (!locationQuery && !isNearby) {
      // Natural language extraction: "in <place>", "at <place>", "around <place>", "near to <place>", "near <place>", "close to <place>", "next to <place>"
      const placeMatch = q.match(/(?:\bin|\bat|\baround|\bnear\s+to|\bnear|\bclose\s+to|\bnext\s+to)\s+([a-zA-Z0-9\s,.-]+?)(?:\s+(?:under|with|above|below|for|having|rating|star|stars|open|cheap|best|highest|only)|\s*$)/i);
      if (placeMatch && placeMatch[1]) {
        let candidate = placeMatch[1].trim().replace(/^to\s+/i, '').trim();
        const isDistance = /^(?:within|near|under|in|around|less\s+than)?\s*\d+(?:\.\d+)?\s*(?:km|kms|kilo|kilometers?|k|m|meters?)$/i.test(candidate);
        if (/^(me|here|my\s+location|current\s+location)$/i.test(candidate) || isDistance) {
          locationType = 'nearby';
        } else if (!/^(the\s+city|town|hotel|hotels|restaurant|restaurants|area|place|my\s+area)$/i.test(candidate) && candidate.length > 2) {
          locationType = 'city';
          locationQuery = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        }
      }
    }

    // Category
    const category: string[] = [];
    if (/pub|brewery/i.test(q)) category.push('pub');
    if (/bar|lounge/i.test(q)) category.push('bar');
    if (/cafe|coffee/i.test(q)) category.push('cafe');
    if (/bakery|bakes|pastry/i.test(q)) category.push('bakery');
    if (/dessert|deserts|ice\s*cream|sweet/i.test(q)) category.push('desserts');
    if (/tiffin|tiffins|tiffen|tiffens|breakfast/i.test(q)) category.push('tiffin', 'breakfast');
    if (category.length === 0 || /restaurant|hotel|food|dinner|lunch|biryani|dine/i.test(q)) {
      category.push('restaurant');
    }

    // Cuisine
    const cuisineKeywords = [
      'biryani', 'south indian', 'north indian', 'chinese', 'italian', 'pizza',
      'burgers', 'seafood', 'continental', 'desserts', 'mexican', 'japanese',
      'sushi', 'thai', 'korean', 'andhra', 'hyderabadi', 'mughlai', 'tiffin', 'fast food'
    ];
    const detectedCuisines = cuisineKeywords.filter(c => q.includes(c));

    // Handle common food dish to cuisine mapping
    if (/dosa|idli|idly|vada|bonda|mysore\s*bonda|punugulu|bajji|upma|pongal|poori|puri|tiffin|tiffins|tiffen|tiffens/i.test(q)) {
      if (!detectedCuisines.includes('south indian')) detectedCuisines.push('south indian');
      if (!detectedCuisines.includes('tiffin')) detectedCuisines.push('tiffin');
    }
    if (/dessert|deserts|desert|sweet|sweets|ice\s*cream|gelato|cake|pastry|waffle|kulfi|falooda/i.test(q)) {
      if (!detectedCuisines.includes('desserts')) detectedCuisines.push('desserts');
    }

    // Taste
    const tasteKeywords = ['spicy', 'sweet', 'authentic', 'rich', 'healthy', 'light', 'crispy', 'tangy'];
    const detectedTastes = tasteKeywords.filter(t => q.includes(t));

    // Food Items
    const foodItems: Array<{name: string}> = [];
    const knownFoods = [
      'mysore bonda', 'bonda', 'punugulu', 'mirchi bajji', 'masala dosa', 'rava dosa', 'ghee roast dosa', 'dosa',
      'idly', 'idli', 'medu vada', 'vada', 'puri bhaji', 'poori', 'upma', 'pongal',
      'mutton biryani', 'chicken biryani', 'veg biryani', 'egg biryani', 'fish biryani', 'biryani',
      'mandi', 'haleem', 'nihari', 'shawarma', 'kebabs', 'kebab', 'seekh kebab',
      'pizza', 'margherita pizza', 'pasta', 'lasagna', 'burger', 'zinger burger', 'sandwich', 'wrap',
      'french fries', 'hot & crispy chicken', 'fried chicken', 'noodles', 'fried rice',
      'tandoori chicken', 'butter chicken', 'paneer tikka', 'dal makhani', 'chole bhature',
      'pav bhaji', 'samosa', 'gulab jamun', 'rasgulla', 'ice cream', 'belgian waffle', 'waffle',
      'cake', 'cheesecake', 'pastry', 'coffee', 'cold brew', 'cappuccino', 'filter coffee',
      'tea', 'chai', 'falooda', 'kulfi', 'momos', 'spring rolls', 'manchurian', 'soup', 'salad',
      'thali', 'meals', 'fish fry', 'prawns', 'crab', 'lobster'
    ];
    for (const food of knownFoods) {
      if (q.includes(food)) {
        const formatted = food.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!foodItems.some(f => f.name.toLowerCase() === formatted.toLowerCase())) {
          foodItems.push({ name: formatted });
        }
      }
    }

    // Dynamic candidate extraction: If user searched "X near me" or "best X in Y", extract X as food item if nothing matched
    if (foodItems.length === 0) {
      const stripped = q
        .replace(/near me|nearby|around here|close by|closest|hotels?|restaurants?|food|places?|within\s*\d+.*|in\s+[a-z]+|at\s+[a-z]+|best|top|good|famous|rated|only/gi, '')
        .trim();
      if (stripped.length > 2 && !/^(the|a|an|my|our)$/i.test(stripped)) {
        const formatted = stripped.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        foodItems.push({ name: formatted });
      }
    }

    // Result Count
    let resultCount = 10;
    if (/best one|best hotel|best restaurant|top one|number one|highest rated/i.test(q)) {
      resultCount = 1;
    } else {
      const topMatch = q.match(/(?:top|best)\s+(\d+)/i);
      if (topMatch) {
        resultCount = parseInt(topMatch[1], 10);
      }
    }

    // Dietary
    const dietary: string[] = [];
    if (/vegetarian|pure veg|\bveg\b/i.test(q) && !/non-veg/i.test(q)) dietary.push('vegetarian');
    if (/vegan/i.test(q)) dietary.push('vegan');
    if (/halal/i.test(q)) dietary.push('halal');
    if (/gluten-free|gluten free/i.test(q)) dietary.push('gluten-free');

    // Rating
    let minimumRating = 0;
    const ratingMatch = q.match(/(?:rating|rated|above|star|stars|over)\s*(\d(?:\.\d)?)/i) || q.match(/(\d\.\d)\s*\+/);
    if (ratingMatch) {
      minimumRating = parseFloat(ratingMatch[1]);
    } else if (/highly rated|best rated|top rated/i.test(q)) {
      minimumRating = 4.3;
    }

    // Budget
    let maxBudget: number | undefined;
    let detectedCurrency: string | undefined = undefined;
    if (/\$|usd|dollars/i.test(q)) detectedCurrency = 'USD';
    else if (/£|gbp|pounds/i.test(q)) detectedCurrency = 'GBP';
    else if (/€|eur|euros/i.test(q)) detectedCurrency = 'EUR';
    else if (/aed|dirhams/i.test(q)) detectedCurrency = 'AED';
    else if (/₹|rs\.?|inr|rupees/i.test(q)) detectedCurrency = 'INR';

    const budgetMatch = q.match(/(?:under|below|less than|within|max)\s*(?:rs\.?|inr|₹|\$|£|€|aed)?\s*(\d+)/i) ||
                        q.match(/(?:\$|£|€|₹)\s*(\d+)/i) ||
                        q.match(/(\d+)\s*(?:rs|rupees|dollars|pounds|euros|per person)/i);
    if (budgetMatch) {
      maxBudget = parseInt(budgetMatch[1], 10);
    } else if (/cheap|budget|affordable/i.test(q)) {
      maxBudget = detectedCurrency === 'USD' ? 25 : 500;
    }

    // Atmosphere
    const atmosphereKeywords = ['romantic', 'rooftop', 'quiet', 'luxury', 'casual', 'outdoor', 'party', 'cozy', 'fine dining'];
    const detectedAtmospheres = atmosphereKeywords.filter(a => q.includes(a));

    // Features
    const featureKeywords = ['outdoor seating', 'live music', 'valet parking', 'wifi', 'rooftop', 'pet friendly'];
    const detectedFeatures = featureKeywords.filter(f => q.includes(f));

    // Audience
    const audienceKeywords = ['family', 'couples', 'friends', 'kids', 'business', 'students', 'solo'];
    const detectedAudience = audienceKeywords.filter(a => q.includes(a));

    // Alcohol
    const alcoholRequired = /alcohol|beer|wine|cocktails|cocktail|pub|bar|drinks/i.test(q);
    const alcohol = {
      required: alcoholRequired,
      beer: /beer|draught|brewery/i.test(q),
      wine: /wine|vineyard/i.test(q),
      cocktails: /cocktail|cocktails|mixology/i.test(q),
    };

    // Open now
    const openNow = /open now|open tonight|late night|currently open/i.test(q);

    return {
      intent: 'restaurant_search',
      location: {
        type: locationType,
        query: locationQuery || undefined,
        radius: radius,
        latitude: (!locationQuery && locationType === 'nearby') ? userCoords?.latitude : undefined,
        longitude: (!locationQuery && locationType === 'nearby') ? userCoords?.longitude : undefined,
      },
      category,
      cuisine: detectedCuisines,
      foodPreferences: detectedTastes,
      foodItems,
      dietary,
      rating: minimumRating > 0 ? { minimum: minimumRating } : undefined,
      budget: maxBudget ? { maximum: maxBudget, currency: detectedCurrency } : undefined,
      audience: detectedAudience,
      atmosphere: detectedAtmospheres,
      features: detectedFeatures,
      entertainment: /music/i.test(q) ? ['live music'] : [],
      alcohol,
      openNow,
      sort: 'relevance',
      resultCount,
    };
  }

  /**
   * Deterministic refinement helper
   */
  private fallbackRefine(prev: SearchIntent, text: string): SearchIntent {
    const updated: SearchIntent = JSON.parse(JSON.stringify(prev));
    const t = text.toLowerCase().trim();

    // Reset All Filters request
    if (/reset all|clear all|reset filters|clear filters/i.test(t)) {
      return {
        ...updated,
        rating: undefined,
        budget: undefined,
        dietary: [],
        atmosphere: [],
        features: [],
        alcohol: { required: false, beer: false, wine: false, cocktails: false },
        openNow: false,
        resultCount: 10,
      };
    }

    // Preserve arrays
    if (!updated.foodItems) updated.foodItems = [];
    if (!updated.dietary) updated.dietary = [];
    if (!updated.atmosphere) updated.atmosphere = [];
    if (!updated.features) updated.features = [];
    if (!updated.cuisine) updated.cuisine = [];
    if (!updated.alcohol) updated.alcohol = { required: false, beer: false, wine: false, cocktails: false };

    // 1. Budget refinement
    let refineCurrency = updated.budget?.currency;
    if (/\$|usd|dollars/i.test(t)) refineCurrency = 'USD';
    else if (/£|gbp|pounds/i.test(t)) refineCurrency = 'GBP';
    else if (/€|eur|euros/i.test(t)) refineCurrency = 'EUR';
    else if (/aed|dirhams/i.test(t)) refineCurrency = 'AED';
    else if (/₹|rs\.?|inr|rupees/i.test(t)) refineCurrency = 'INR';

    const budgetMatch = t.match(/(?:under|below|max|within|budget|less than)\s*(?:rs\.?|inr|₹|\$|£|€|aed)?\s*(\d+)/i) ||
                        t.match(/(?:≤|<=)\s*(?:rs\.?|inr|₹|\$|£|€|aed)?\s*(\d+)/i) ||
                        t.match(/(?:\$|£|€|₹)\s*(\d+)/i);
    if (budgetMatch) {
      updated.budget = { maximum: parseInt(budgetMatch[1], 10), currency: refineCurrency };
    } else if (/fine din/i.test(t) && !/remove/i.test(t)) {
      updated.budget = { maximum: refineCurrency === 'USD' ? 150 : 3000, currency: refineCurrency };
      if (!updated.atmosphere.includes('fine dining')) updated.atmosphere.push('fine dining');
    }

    // 2. Rating refinement
    const ratingMatch = t.match(/(?:rating|above|over|rated|stars?)\s*(\d(?:\.\d)?)/i) || t.match(/(\d\.\d)\s*\+/);
    if (ratingMatch) {
      updated.rating = { minimum: parseFloat(ratingMatch[1]) };
    }

    // 3. Result count refinement
    if (/best one|best hotel|best restaurant|top one|number one|highest rated/i.test(t) || /only 1|1 option|1 best/i.test(t)) {
      updated.resultCount = 1;
    } else if (/show all|show 10|all options|more options|remove (?:count|limit)/i.test(t)) {
      updated.resultCount = 10;
    } else {
      const topMatch = t.match(/(?:top|best|show me|show)\s+(\d+)/i) || t.match(/(\d+)\s+options?/i);
      if (topMatch) {
        updated.resultCount = parseInt(topMatch[1], 10);
      }
    }

    // 4. Open now
    if (/open now|open tonight|currently open/i.test(t) && !/remove/i.test(t)) {
      updated.openNow = true;
    }

    // 5. Dietary
    if (/pure veg|vegetarian|\bveg\b/i.test(t) && !/non-veg|remove veg/i.test(t)) {
      if (!updated.dietary.includes('vegetarian')) updated.dietary.push('vegetarian');
    }
    if (/vegan/i.test(t) && !/remove vegan/i.test(t)) {
      if (!updated.dietary.includes('vegan')) updated.dietary.push('vegan');
    }
    if (/halal/i.test(t) && !/remove halal/i.test(t)) {
      if (!updated.dietary.includes('halal')) updated.dietary.push('halal');
    }

    // 6. Atmosphere & Vibe
    if (/outdoor|open air|patio/i.test(t) && !/remove outdoor/i.test(t)) {
      if (!updated.features.includes('outdoor seating')) updated.features.push('outdoor seating');
    }
    if (/rooftop/i.test(t) && !/remove rooftop/i.test(t)) {
      if (!updated.atmosphere.includes('rooftop')) updated.atmosphere.push('rooftop');
    }
    if (/romantic/i.test(t) && !/remove romantic/i.test(t)) {
      if (!updated.atmosphere.includes('romantic')) updated.atmosphere.push('romantic');
    }
    if (/family/i.test(t) && !/remove family/i.test(t)) {
      if (!updated.audience.includes('family')) updated.audience.push('family');
    }
    if (/quiet|peaceful|work/i.test(t) && !/remove quiet/i.test(t)) {
      if (!updated.atmosphere.includes('quiet')) updated.atmosphere.push('quiet');
    }
    if (/luxury/i.test(t) && !/remove luxury/i.test(t)) {
      if (!updated.atmosphere.includes('luxury')) updated.atmosphere.push('luxury');
    }

    // 7. Alcohol & Drinks
    if (/no alcohol|dry/i.test(t)) {
      updated.alcohol = { required: false, beer: false, wine: false, cocktails: false };
    } else if (/cocktails?/i.test(t) && !/remove cocktail/i.test(t)) {
      updated.alcohol.required = true;
      updated.alcohol.cocktails = true;
    } else if (/beer|craft beer|draught/i.test(t) && !/remove beer/i.test(t)) {
      updated.alcohol.required = true;
      updated.alcohol.beer = true;
    } else if (/wine/i.test(t) && !/remove wine/i.test(t)) {
      updated.alcohol.required = true;
      updated.alcohol.wine = true;
    }

    // 8. Food Items Additions (when user types food or says "add/with <food>")
    if (!/remove/i.test(t)) {
      const knownFoods = [
        'mutton biryani', 'chicken biryani', 'veg biryani', 'egg biryani', 'fish biryani',
        'biryani', 'pizza', 'burger', 'dosa', 'idly', 'idli', 'noodles', 'fried rice',
        'shawarma', 'kebabs', 'kebab', 'seekh kebab', 'tandoori chicken', 'butter chicken',
        'paneer tikka', 'dal makhani', 'chole bhature', 'pav bhaji', 'samosa', 'gulab jamun',
        'ice cream', 'cake', 'coffee', 'tea', 'pasta', 'momos', 'spring rolls', 'manchurian',
        'soup', 'salad', 'sandwich', 'wrap', 'paratha', 'thali', 'fish fry', 'prawns',
        'crab', 'lobster', 'dessert', 'desserts', 'haleem', 'nihari'
      ];

      for (const food of knownFoods) {
        if (t.includes(food)) {
          const title = food.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          if (!updated.foodItems.some(f => f.name.toLowerCase() === title.toLowerCase())) {
            updated.foodItems.push({ name: title });
          }
          break; // Match most specific first
        }
      }
    }

    // 9. Removals
    if (/remove budget/i.test(t)) {
      updated.budget = undefined;
    }
    if (/remove rating/i.test(t)) {
      updated.rating = undefined;
    }
    if (/remove location/i.test(t)) {
      updated.location.query = undefined;
    }
    if (/remove (?:vegetarian|pure veg|veg)/i.test(t)) {
      updated.dietary = updated.dietary.filter(d => d !== 'vegetarian');
    }
    if (/remove vegan/i.test(t)) {
      updated.dietary = updated.dietary.filter(d => d !== 'vegan');
    }
    if (/remove halal/i.test(t)) {
      updated.dietary = updated.dietary.filter(d => d !== 'halal');
    }
    if (/remove rooftop/i.test(t)) {
      updated.atmosphere = updated.atmosphere.filter(a => a !== 'rooftop');
    }
    if (/remove romantic/i.test(t)) {
      updated.atmosphere = updated.atmosphere.filter(a => a !== 'romantic');
    }
    if (/remove quiet/i.test(t)) {
      updated.atmosphere = updated.atmosphere.filter(a => a !== 'quiet');
    }
    if (/remove (?:luxury|fine dining)/i.test(t)) {
      updated.atmosphere = updated.atmosphere.filter(a => a !== 'luxury' && a !== 'fine dining');
    }
    if (/remove outdoor/i.test(t)) {
      updated.features = updated.features.filter(f => !f.toLowerCase().includes('outdoor'));
    }
    if (/remove live music/i.test(t)) {
      updated.features = updated.features.filter(f => !f.toLowerCase().includes('music'));
    }
    if (/remove alcohol|remove beer|remove cocktail|remove wine/i.test(t)) {
      updated.alcohol = { required: false, beer: false, wine: false, cocktails: false };
    }
    // Distance / Radius refinement
    const refineRadiusMatch = t.match(/(?:within|near|under|in|around|less\s+than|radius\s*(?:of|near)?)\s*(\d+(?:\.\d+)?)\s*(?:km|kms|kilo|kilometers?|k\b)/i)
      || t.match(/(\d+(?:\.\d+)?)\s*(?:km|kms|kilo|kilometers?)\s*(?:radius|near|away|distance)?/i);
    if (refineRadiusMatch) {
      const rKm = parseFloat(refineRadiusMatch[1]);
      if (rKm > 0 && rKm <= 50) {
        updated.location.radius = Math.round(rKm * 1000);
      }
    }
    if (/remove (?:radius|distance)/i.test(t)) {
      updated.location.radius = 5000;
    }

    return updated;
  }
}
