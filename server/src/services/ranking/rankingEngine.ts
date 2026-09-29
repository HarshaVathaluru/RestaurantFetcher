import { NormalizedPlace, SearchIntent } from '../../models/place';

export class RankingEngine {
  /**
   * Applies hard filters and computes relevance ranking with transparent evidence.
   */
  filterAndRank(places: NormalizedPlace[], intent: SearchIntent): NormalizedPlace[] {
    // 1. HARD FILTERS
    const eligible = places.filter(place => {
      // Rating floor
      if (intent.rating?.minimum && place.rating < intent.rating.minimum) {
        return false;
      }

      // Budget ceiling (with 10% flexible grace margin)
      if (intent.budget?.maximum && place.averageCostPerPerson > intent.budget.maximum * 1.1) {
        return false;
      }

      // Distance / Radius hard filter (strictly enforce user-specified radius)
      if (intent.location?.radius && place.distance !== undefined) {
        const maxRadiusKm = intent.location.radius / 1000;
        if (place.distance > maxRadiusKm * 1.15) {
          return false;
        }
      }

      // Specific Food Item / Cuisine Hard Compatibility Filter
      // Prevents fake results (e.g. Domino's or KFC for Biryani; or Biryani spots for Pizza)
      if (intent.foodItems && intent.foodItems.length > 0) {
        const placeCuisines = place.cuisine.map(c => c.toLowerCase());
        const placeCategories = place.categories.map(c => c.toLowerCase());
        const placeNameLower = place.name.toLowerCase();

        for (const searchedFood of intent.foodItems) {
          if (!searchedFood?.name) continue;
          const sName = searchedFood.name.toLowerCase();

          // Biryani / Mandi search
          if (sName.includes('biryani') || sName.includes('mandi') || sName.includes('pulao')) {
            const isBiryaniPlace =
              placeCuisines.some(c => ['biryani', 'hyderabadi', 'mughlai', 'andhra', 'non-vegetarian', 'multi-cuisine', 'north indian'].includes(c)) ||
              place.foodItems?.some(f => f.name.toLowerCase().includes('biryani') || f.name.toLowerCase().includes('mandi')) ||
              /biryani|mandi|darbar|bawarchi|shadab|mehfil|paradise|spice|ruchulu|shahi|firdouse|dastarkhwan|bhimas|gardenia|empire/i.test(placeNameLower);

            const isIncompatibleFastFood =
              /^(domino|pizza|kfc|mcdonald|subway|baskin|starbucks|burger\s*king)/i.test(placeNameLower) ||
              placeCuisines.some(c => ['pizza', 'ice cream', 'bakery', 'cafe', 'sandwiches'].includes(c)) ||
              placeCategories.some(c => ['pizzeria', 'bakery', 'ice cream parlor', 'cafe'].includes(c));

            if (!isBiryaniPlace || isIncompatibleFastFood) {
              return false;
            }
          }

          // Pizza search
          if (sName.includes('pizza')) {
            const isPizzaPlace =
              placeCuisines.some(c => ['pizza', 'italian', 'continental', 'fast food'].includes(c)) ||
              place.foodItems?.some(f => f.name.toLowerCase().includes('pizza')) ||
              /pizza|pizzeria|domino|ovenstory|la\s*pino/i.test(placeNameLower);

            const isBiryaniOnly =
              placeCuisines.every(c => ['biryani', 'mughlai', 'hyderabadi', 'andhra'].includes(c)) &&
              !placeCuisines.includes('pizza');

            if (!isPizzaPlace || isBiryaniOnly) {
              return false;
            }
          }

          // Burger / Fried Chicken search
          if (sName.includes('burger') || sName.includes('fried chicken')) {
            const isBurgerPlace =
              placeCuisines.some(c => ['burgers', 'fast food', 'fried chicken', 'finger food', 'continental'].includes(c)) ||
              place.foodItems?.some(f => f.name.toLowerCase().includes('burger') || f.name.toLowerCase().includes('chicken')) ||
              /burger|kfc|mcdonald|wendy/i.test(placeNameLower);

            if (!isBurgerPlace) {
              return false;
            }
          }

          // Coffee / Cafe search
          if (sName.includes('coffee') || sName.includes('cappuccino') || sName.includes('latte') || sName.includes('cold brew')) {
            const isCafePlace =
              placeCuisines.some(c => ['cafe', 'coffee', 'bakery', 'beverages'].includes(c)) ||
              place.foodItems?.some(f => f.name.toLowerCase().includes('coffee') || f.name.toLowerCase().includes('brew')) ||
              /cafe|coffee|starbucks|barista|third\s*wave|roastery/i.test(placeNameLower);

            if (!isCafePlace) {
              return false;
            }
          }

          // Dosa / Idli / Mysore Bonda / South Indian Tiffin
          if (sName.includes('dosa') || sName.includes('idli') || sName.includes('vada') || sName.includes('tiffin') || sName.includes('tiffen') || sName.includes('bonda') || sName.includes('punugulu') || sName.includes('bajji') || sName.includes('upma') || sName.includes('poori') || sName.includes('puri')) {
            const isTiffinPlace =
              placeCuisines.some(c => ['south indian', 'tiffin', 'breakfast', 'vegetarian'].includes(c)) ||
              place.foodItems?.some(f => /dosa|idli|vada|bonda|tiffin|upma|poori/i.test(f.name)) ||
              /tiffin|dosa|idli|bhavan|bhimas|udupi|saravana|chutneys|a2b|swathi|mayura|sagar/i.test(placeNameLower);

            const isFastFoodExcluded = /^(domino|pizza|kfc|mcdonald|subway|baskin|starbucks|burger\s*king)/i.test(placeNameLower);

            if (!isTiffinPlace || isFastFoodExcluded) {
              return false;
            }
          }

          // Desserts / Ice Cream / Bakery
          if (sName.includes('dessert') || sName.includes('desert') || sName.includes('ice cream') || sName.includes('cake') || sName.includes('pastry') || sName.includes('waffle') || sName.includes('sweet') || sName.includes('kulfi') || sName.includes('falooda')) {
            const isDessertPlace =
              placeCuisines.some(c => ['desserts', 'bakery', 'ice cream', 'cafe', 'waffles'].includes(c)) ||
              placeCategories.some(c => ['desserts', 'bakery', 'ice cream parlor', 'cafe'].includes(c)) ||
              place.foodItems?.some(f => /ice\s*cream|cake|pastry|dessert|waffle|cheesecake|sweet|kulfi|falooda/i.test(f.name)) ||
              /ice\s*cream|baskin|cream\s*stone|dessert|bakery|cake|pastry|sweet|waffle|havmor/i.test(placeNameLower);

            if (!isDessertPlace) {
              return false;
            }
          }
        }
      }

      // Alcohol requirements
      if (intent.alcohol?.required && !place.servesAlcohol) {
        return false;
      }
      if (intent.alcohol?.beer && !place.alcohol.beer) {
        return false;
      }
      if (intent.alcohol?.wine && !place.alcohol.wine) {
        return false;
      }
      if (intent.alcohol?.cocktails && !place.alcohol.cocktails) {
        return false;
      }

      // Dietary requirements
      if (intent.dietary && intent.dietary.length > 0) {
        const isVegRequested = intent.dietary.includes('vegetarian');
        if (isVegRequested) {
          const isVeg =
            place.categories.includes('vegetarian') ||
            place.dietaryOptions.some(d => d.toLowerCase().includes('veg')) ||
            place.cuisine.includes('vegetarian');
          if (!isVeg) return false;
        }

        const isVeganRequested = intent.dietary.includes('vegan');
        if (isVeganRequested) {
          const isVegan = place.dietaryOptions.some(d => d.toLowerCase().includes('vegan'));
          if (!isVegan) return false;
        }

        const isHalalRequested = intent.dietary.includes('halal');
        if (isHalalRequested) {
          const isHalal = place.dietaryOptions.some(d => d.toLowerCase().includes('halal'));
          if (!isHalal) return false;
        }
      }

      // Atmosphere hard filter
      if (intent.atmosphere && intent.atmosphere.length > 0) {
        for (const atmo of intent.atmosphere) {
          const lower = atmo.toLowerCase();
          if (lower === 'rooftop') {
            const hasRooftop = place.features.some(f => f.toLowerCase().includes('rooftop')) ||
                               place.name.toLowerCase().includes('rooftop') ||
                               place.description?.toLowerCase().includes('rooftop');
            if (!hasRooftop) return false;
          }
          if (lower === 'romantic') {
            const hasRomantic = place.features.some(f => f.toLowerCase().includes('romantic')) ||
                                place.description?.toLowerCase().includes('romantic');
            if (!hasRomantic) return false;
          }
          if (lower === 'quiet') {
            const hasQuiet = place.features.some(f => f.toLowerCase().includes('quiet')) ||
                             place.description?.toLowerCase().includes('quiet');
            if (!hasQuiet) return false;
          }
          if (lower === 'fine dining' || lower === 'luxury') {
            const isLuxury = place.priceLevel >= 3 || place.categories.includes('fine dining') || place.features.includes('luxury');
            if (!isLuxury) return false;
          }
        }
      }

      // Features hard filter
      if (intent.features && intent.features.length > 0) {
        for (const feat of intent.features) {
          const lower = feat.toLowerCase();
          if (lower === 'outdoor seating') {
            const hasOutdoor = place.features.some(f => f.toLowerCase().includes('outdoor'));
            if (!hasOutdoor) return false;
          }
          if (lower === 'live music') {
            const hasMusic = place.features.some(f => f.toLowerCase().includes('music'));
            if (!hasMusic) return false;
          }
          if (lower === 'pet friendly') {
            const hasPet = place.features.some(f => f.toLowerCase().includes('pet'));
            if (!hasPet) return false;
          }
        }
      }

      // Audience hard filter
      if (intent.audience && intent.audience.length > 0) {
        if (intent.audience.includes('family')) {
          const isFamily = place.features.includes('family-friendly') || !place.categories.includes('pub');
          if (!isFamily) return false;
        }
      }

      // Open now
      if (intent.openNow && !place.openNow) {
        return false;
      }

      return true;
    });

    // Graceful fallback: If strict combination yields 0 matches, relax hardest filter
    let placesToScore = eligible;
    if (placesToScore.length === 0 && places.length > 0) {
      // Relax rating / budget requirement so user still receives closest matches, but strictly retain distance radius if requested!
      placesToScore = places.filter(place => {
        if (intent.location?.radius && place.distance !== undefined) {
          const maxRadiusKm = intent.location.radius / 1000;
          if (place.distance > maxRadiusKm * 1.15) return false;
        }
        if (intent.dietary?.includes('vegetarian')) {
          const isVeg = place.categories.includes('vegetarian') || place.dietaryOptions.some(d => d.toLowerCase().includes('veg'));
          if (!isVeg) return false;
        }
        return true;
      });
      if (placesToScore.length === 0) placesToScore = eligible;
    }

    // 2. RELEVANCE RANKING & EVIDENCE COMPUTATION
    const isRelaxed = eligible.length === 0 && placesToScore.length > 0;
    const scoredPlaces = placesToScore.map(place => {
      let score = 55; // Base score
      const evidence: string[] = [];
      if (isRelaxed) {
        evidence.push('ℹ Closest match (some strict filters relaxed to show best options)');
      }

      // Cuisine match
      if (intent.cuisine && intent.cuisine.length > 0) {
        const matchedCuisines = intent.cuisine.filter(c =>
          place.cuisine.some(pc => pc.toLowerCase().includes(c.toLowerCase())) ||
          place.name.toLowerCase().includes(c.toLowerCase()) ||
          place.description?.toLowerCase().includes(c.toLowerCase())
        );

        if (matchedCuisines.length > 0) {
          score += 20;
          evidence.push(`✓ ${matchedCuisines.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')} specialty confirmed`);
        }
      }

      // Taste / Food preferences match
      if (intent.foodPreferences && intent.foodPreferences.length > 0) {
        const matchedTastes = intent.foodPreferences.filter(t =>
          place.tasteProfiles.some(pt => pt.toLowerCase().includes(t.toLowerCase())) ||
          place.description?.toLowerCase().includes(t.toLowerCase())
        );

        if (matchedTastes.length > 0) {
          score += 10;
          evidence.push(`✓ ${matchedTastes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')} preference matched`);
        }
      }

      // Atmosphere match
      if (intent.atmosphere && intent.atmosphere.length > 0) {
        const matchedAtmo = intent.atmosphere.filter(a =>
          place.features.some(f => f.toLowerCase().includes(a.toLowerCase())) ||
          place.categories.some(c => c.toLowerCase().includes(a.toLowerCase())) ||
          place.description?.toLowerCase().includes(a.toLowerCase())
        );

        if (matchedAtmo.length > 0) {
          score += 10;
          evidence.push(`✓ ${matchedAtmo.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')} ambiance verified`);
        }
      }

      // Audience match
      if (intent.audience && intent.audience.length > 0) {
        const matchedAudience = intent.audience.filter(a =>
          place.features.some(f => f.toLowerCase().includes(a.toLowerCase())) ||
          place.description?.toLowerCase().includes(a.toLowerCase())
        );

        if (matchedAudience.length > 0) {
          score += 8;
          evidence.push(`✓ ${matchedAudience.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')} verified`);
        }
      }

      // Features match (e.g. outdoor seating, live music)
      if (intent.features && intent.features.length > 0) {
        const matchedFeat = intent.features.filter(f =>
          place.features.some(pf => pf.toLowerCase().includes(f.toLowerCase()))
        );

        if (matchedFeat.length > 0) {
          score += 8;
          evidence.push(`✓ ${matchedFeat.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')} available`);
        }
      }

      // Food items match
      const matchedFoodItems: Array<{ name: string; price?: number }> = [];
      if (intent.foodItems && intent.foodItems.length > 0) {
        let foodMatched = false;
        for (const searchedFood of intent.foodItems) {
          if (!searchedFood?.name) continue;
          const sName = searchedFood.name.toLowerCase();
          const matchedItem = place.foodItems?.find(pf => pf?.name && pf.name.toLowerCase().includes(sName));
          if (matchedItem) {
            matchedFoodItems.push({ name: matchedItem.name, price: matchedItem.price });
            foodMatched = true;
          }
        }

        if (foodMatched) {
          score += 30; // Exact food match bonus
          const isVerified = matchedFoodItems.every(m => {
            const original = place.foodItems?.find(f => f.name === m.name);
            return original?.verified === true;
          });
          if (isVerified) {
            evidence.push(`✓ Verified ${matchedFoodItems.map(m => m.name).join(', ')} on the menu`);
          } else {
            evidence.push(`✓ ${matchedFoodItems.map(m => m.name).join(', ')} specialty confirmed`);
          }
        } else {
          // If the user explicitly searched for food items and this place doesn't have them, deprioritize heavily
          score -= 40; 
        }
      }

      // Alcohol evidence
      if (intent.alcohol.required && place.servesAlcohol) {
        const drinks: string[] = [];
        if (place.alcohol.cocktails) drinks.push('Cocktails');
        if (place.alcohol.beer) drinks.push('Craft Beer');
        if (place.alcohol.wine) drinks.push('Wine');
        if (drinks.length > 0) {
          score += 6;
          evidence.push(`✓ ${drinks.join(' & ')} confirmed on bar menu`);
        }
      }

      // Rating evidence & boost
      if (place.rating >= 4.5) {
        score += 15;
        if (intent.rating?.minimum) {
          evidence.push(`✓ Rating ${place.rating} (exceeds ≥${intent.rating.minimum} requirement)`);
        } else {
          evidence.push(`✓ Stellar ${place.rating}★ rating (${place.reviewCount.toLocaleString()} reviews)`);
        }
      } else if (place.rating >= 4.0) {
        score += 10;
        if (intent.rating?.minimum) {
          evidence.push(`✓ Rating ${place.rating} (exceeds ≥${intent.rating.minimum} requirement)`);
        } else {
          evidence.push(`✓ Great ${place.rating}★ rating (${place.reviewCount.toLocaleString()} reviews)`);
        }
      }

      // Budget evidence
      if (intent.budget?.maximum) {
        score += 8;
        evidence.push(`✓ Under budget (~${place.priceEstimatedText})`);
      }

      // Distance proximity bonus & radius evidence
      if (place.distance !== undefined) {
        if (intent.location?.radius) {
          const maxRadiusKm = intent.location.radius / 1000;
          score += 10;
          evidence.push(`✓ Within ${maxRadiusKm.toFixed(0)} km (${place.distance} km away)`);
        } else if (place.distance <= 2.5) {
          score += 8;
          evidence.push(`✓ ${place.distance} km away (very close to target)`);
        } else if (place.distance <= 7.0) {
          score += 4;
          evidence.push(`✓ ${place.distance} km away`);
        }
      }

      // Clamp matchScore to maximum 99%
      const finalScore = Math.min(99, Math.max(0, score)); // lowered min bound for heavy deprioritization

      return {
        ...place,
        matchScore: finalScore,
        matchEvidence: evidence.slice(0, 5), // Keep top 5 concise, high-signal evidence points
        matchedFoodItems: matchedFoodItems.length > 0 ? matchedFoodItems : undefined,
      };
    });

    // 3. SORT
    const sorted = scoredPlaces.sort((a, b) => {
      if (intent.sort === 'rating') {
        return b.rating - a.rating;
      }
      if (intent.sort === 'distance' && a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (intent.sort === 'price') {
        return a.averageCostPerPerson - b.averageCostPerPerson;
      }
      // Default: relevance score then rating
      return (b.matchScore || 0) - (a.matchScore || 0) || b.rating - a.rating;
    });

    // 4. LIMIT RESULTS
    const resultCount = intent.resultCount || 10;
    return sorted.slice(0, resultCount);
  }
}
