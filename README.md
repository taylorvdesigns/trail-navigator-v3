# Trail Navigator v3

A mobile-first web application for navigating trails and discovering points of interest.

## Features

- Interactive trail map with POI markers
- Navigation view with ahead/behind destinations
- List view of POIs grouped by location
- Real-time location tracking
- Offline map tile caching
- Dark mode with grayscale map style
- Category filtering for POIs

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trail-navigator-v3.git
cd trail-navigator-v3
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```
RIDEWITHGPS_API_KEY=your_api_key_here
RIDEWITHGPS_AUTH_TOKEN=your_auth_token_here
PORT=3001
```

4. Start the development server:
```bash
npm run dev
```

This will start both the React application (port 3000) and the proxy server (port 3001).

## Development

### Project Structure

```
src/
  ├── components/
  │   ├── Layout/
  │   ├── MapView/
  │   ├── NavView/
  │   └── ListView/
  ├── services/
  │   └── api.ts
  ├── types/
  │   └── index.ts
  └── theme/
      └── index.ts
server/
  └── index.js
```

### Available Scripts

- `npm run dev` - Start development servers (React + Proxy)
- `npm start` - Start React development server only
- `npm run start:proxy` - Start proxy server only
- `npm run build` - Create production build
- `npm test` - Run tests

### Browser Support

- Mobile Safari (iOS 16+)
- Android Chrome (Android 12+)
- Latest 2 versions of major desktop browsers

## Testing

For testing the navigation features when not physically on the trail, use Simulation Mode with these test locations:

```javascript
TEST_LOCATIONS: [
    { 
        name: "Between Swamp Rabbit Cafe and Unity", 
        coords: [34.863381, -82.421034],
        description: "Test point along trail section" 
    },
    { 
        name: "Between Downtown and Unity", 
        coords: [34.848406, -82.404906],
        description: "Mid-way point on trail" 
    },
    { 
        name: "Furman University", 
        coords: [34.926555, -82.443180],
        description: "University section of trail" 
    },
    { 
        name: "Greenville Tech", 
        coords: [34.826607, -82.378538],
        description: "Tech campus trail entrance" 
    }
]
```

## Design Specifications

### Colors

- Trail Colors:
  - Green: #43D633
  - Blue: #6995E8
  - Orange: #FFB134
- UI Colors:
  - Grey (inactive): #6B7280
  - Background: #242424
  - Title bar & inactive tabs: #000000

### Typography

- Font: Roboto
- Base size: 11px
- Line height: 16px
- Font weight: 500

### Component Specifications

#### Nav View
- Full-width rows: 30px height, max 14px text size
- Split view rows: 40px height, max 11px text size
- Context card border radius: 32px
- Context card border width: 12px

#### Map View
- Trail lines: 2px wide, fully opaque
- 100% greyscale map style in dark mode
- Semi-transparent POI Group highlight boxes

## License

[Your license information here]

