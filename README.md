# GourmetAI — Next-Generation AI Restaurant Discovery Platform

A full-stack, production-quality AI restaurant discovery web application built with **React**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Leaflet**, and **Node.js / Express** powered by **Google Gemini 2.5 Flash** structured intent extraction.

Users describe what they want in natural language (e.g., *"Find a spicy biryani restaurant near me with rating above 4.2 under ₹500"* or *"Find pubs near me with craft beer, live music and rating above 4"*). The AI extracts multidimensional intent, resolves geographical coordinates, queries real place data through an abstracted provider adapter, applies strict hard filters followed by relevance ranking, and provides transparent match evidence alongside a synchronized interactive map.

---

## 🌟 Key Features

1. **Natural Language Primary Interface**
   - No filter fatigue: speak or type natural thoughts.
   - Extracts cuisine, taste/spiciness profile, diet (vegetarian, vegan, halal), rating floor, budget ceiling, atmosphere (romantic, rooftop, quiet, luxury), audience (family, friends, couples), features (outdoor seating, parking), entertainment (live music, sports), alcohol requirements (craft beer, wine, cocktails), location, distance, and open-now intent.

2. **AI Intent Engine (Gemini 2.5 Flash)**
   - Strictly validates all model responses against a Zod schema.
   - Intelligent fallback parsing ensures 100% uptime and resilience against transient network or quota limits.

3. **Conversational Refinement (Context Preservation)**
   - Follow-up instructions like *"Only under ₹1000"*, *"Vegetarian only"*, *"Add outdoor seating"*, or *"Rating above 4.5"* modify the existing search context without restarting from scratch.

4. **Transparent Match Evidence**
   - Instead of an arbitrary unexplained score, every card shows verified evidence:
     - `✓ Biryani specialty confirmed`
     - `✓ Spicy flavor profile matched`
     - `✓ Rating 4.4 (exceeds ≥4.2 requirement)`
     - `✓ Under budget (~₹400 per person)`
     - `✓ 2.2 km away (very close to target)`

5. **Honest Alcohol & Amenity Badges**
   - Strictly enforces Section 7 of the specification: if a place confirms cocktails, craft beer, or wine, it is displayed. If not confirmed by provider ground truth, it is never hallucinated.

6. **Synchronized Map & List Experience**
   - Custom Leaflet dark-mode map tiles.
   - Hovering or clicking a card highlights the map marker and pans smoothly (`flyTo`).
   - Clicking a map marker opens details and scrolls to the card.

7. **Production Architecture & Security**
   - All AI and provider keys reside strictly server-side.
   - Express rate limiting (`express-rate-limit`) to prevent abuse.
   - Centralized error handling, input sanitization, and structured logging.

---

## 🏗️ Project Architecture

```
RestFetcher/
├── client/                     # Frontend Application (Vite + React + TS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConversationalRefinement/  # Bottom dock for contextual updates
│   │   │   ├── FilterPanel/               # Interactive filter adjustments
│   │   │   ├── MapView/                   # Synchronized Leaflet map
│   │   │   ├── Navbar/                    # Brand header, history & favorites
│   │   │   ├── RestaurantCard/            # Cards with photo, badges & evidence
│   │   │   ├── RestaurantDetails/         # Modal with gallery, reviews & CTA
│   │   │   ├── RestaurantGrid/            # Responsive staggered grid
│   │   │   ├── SavedPlacesDrawer/         # Favorites drawer
│   │   │   ├── SearchAnimation/           # 5-stage animated search progression
│   │   │   └── SearchBox/                 # Natural language input + suggestions
│   │   ├── services/api.ts                # Frontend API client
│   │   ├── types/index.ts                 # Shared TypeScript models
│   │   ├── App.tsx                        # Main state orchestrator
│   │   └── main.tsx                       # Entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts                     # Proxies /api to Express (port 5000)
│
├── server/                     # Backend API (Node.js + Express + TS)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── placesController.ts        # Details, photos, directions
│   │   │   ├── searchController.ts        # /api/search, /api/search/refine
│   │   │   └── userController.ts          # Saved places & search history
│   │   ├── models/place.ts                # Normalized Place & SearchIntent models
│   │   ├── routes/                        # Express API route modules
│   │   ├── services/
│   │   │   ├── ai/intentParser.ts         # Gemini 2.5 Flash + Zod validation
│   │   │   ├── location/locationResolver.ts # Geo-coordinates & distance
│   │   │   ├── places/placeProvider.ts    # Abstracted provider adapter + OSM
│   │   │   └── ranking/rankingEngine.ts   # Hard filters + relevance scoring
│   │   └── index.ts                       # Express server setup & rate limiting
│   ├── .env                               # Server environment variables
│   ├── package.json
│   └── tsconfig.json
│
└── package.json                           # Root orchestration scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js LTS (v20+ recommended)
- npm (v10+)

### 1. Clone & Setup
The project is organized in the root workspace with both `client` and `server`.

### 2. Configure Environment Variables
Inside `server/.env`:
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Servers
From the root workspace directory:
```bash
# Start backend server (port 5000)
npm run server

# In another terminal, start frontend client (port 3000)
npm run client
```

Now open **http://localhost:3000** in your browser.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/search` | Natural language search with coordinates, AI parsing, ranking & evidence |
| `POST` | `/api/search/parse` | Extract structured SearchIntent without fetching places |
| `POST` | `/api/search/refine` | Conversational refinement merging previous intent with follow-up query |
| `GET` | `/api/places/:id` | Detailed place record including photos, hours, reviews |
| `GET` | `/api/places/:id/photos` | Photo gallery for place |
| `GET` | `/api/places/:id/directions` | Navigation directions URL |
| `POST` | `/api/saved-places` | Bookmark a place |
| `GET` | `/api/saved-places` | Retrieve bookmarked places |
| `DELETE` | `/api/saved-places/:id` | Remove a bookmarked place |
| `GET` | `/api/search-history` | List recent queries with timestamps and result counts |
| `GET` | `/api/health` | Service health status and Gemini configuration check |
