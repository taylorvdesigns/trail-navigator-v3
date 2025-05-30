# Product Requirements Document (PRD): Trail Map Web Application

## Glossary

- **Cluster:** A group of POIs close together on the map, visually grouped for easier navigation, primarily for display purposes.

- **Group:** A logical set of POIs, usually sharing a WordPress post tag (e.g., "Unity Park"), used for list organization, filtering, and navigation.
-- **POI Groupings**
-- POI groupings are defined by the `post_tags` field in the WordPress API (e.g., `"post_tags":[{"id":25,"name":"Unity Park"}]`).
-- Tags are used for logical grouping (UI clusters, filters, etc.).
-- POIs are grouped in the UI by their `post_tags` from WordPress.
-- Map clustering by proximity may be used for display, but primary grouping is tag-based.

- **Spur:** A secondary trail or path that branches off the main trail, may or may not be distinguished in RideWithGPS data.
- **POI (Point of Interest):** Any location (e.g., park, landmark, amenity) displayed on the map or in lists, sourced from the WordPress API.
-- **POI Categories**
-- POI categories (in `post_category`) are normalized in the WordPress database.
-- Categories can be used as-is in the app for filtering and display.

- **Trailhead:** A starting/ending point for a trail.
- **Area Focus Mode:** UI mode that highlights a user's current POI, group, or junction, providing context and quick actions.
- **Simulation Mode:** A QA and user feature allowing the app to mimic user location for testing or when not physically near the trail (see Simulation Mode section).

---

## 1. Project Purpose & Goals

Create a public, minimal web app for outdoor trail users. Users can browse trails, see their location, explore Points of Interest (POIs), and navigate along trails using data from the RideWithGPS API and a WordPress REST API for POIs.

---

## 2. User Stories

- As a user, I can visit a unique URL for a specific trail and see all its details.
- As a user, I can view the entire trail, its spurs, and nearby POIs on an interactive map.
- As a user, I can switch between Map, Navigation, and List views using sticky tabs.
- As a user, I can filter POIs by category in all relevant views.
- As a user, I can view POI details and see their location on the map.
- As a user, I can see clusters of POIs and zoom into them.
- As a user, I can see what POIs or clusters are ahead/behind me with distance and ETA based on my mode of locomotion (walking, running, biking).
- As a user, I can see a list of POIs grouped by group and filterable by category.
- As a user, I can share/bookmark a URL for a specif POI Group.
- As a user, if I am not near the trail, I receive a modal showing nearest parking lots for trail access, with an option to simulate being on the trail at predefined spots.
- As a user or tester, I can enter Simulation Mode to test app features as if I am located at predefined points along the trail.
- As a user, I can provide feedback or report bugs through the app.

---

## 3. Features & Functional Requirements

### 3.1 General
- No authentication required; app is publicly accessible.
- Each trail is accessible via a unique, deep-linkable URL.
- No analytics or tracking for phase one.
- The application is designed mobile-first and optimized for touch; desktop support is not required.
- Performance: The initial app load (first meaningful paint) should occur within 3 seconds on a typical 4G mobile connection for average-sized trails.

### 3.2 Data Sources
- Trails data is fetched from the RideWithGPS API.
- POIs and parking locations are fetched from a WordPress REST API endpoint: `https://srtmaps.elev8maps.com/wp-json/geodir/v2/places`
- No rate limits or pagination requirements at this time.
- No client-side caching of API responses required.

### 3.3 Core Views & Behaviors

#### 3.3.1 Map View
- Displays the full trail network and all spurs.
- Shows user's current location if permitted, with optional "follow me" mode.
- Trail lines should be 2px wide and fully opaque.
- Map style should be 100% greyscale in dark mode, with no particular features standing out.
- POI Groups should be shown with semi-transparent highlight boxes.
- When a POI Group highlight box is tapped:
  1. Map zooms to that area
  2. User is prompted if they want to see the POI list
  3. If confirmed, switches to List View filtered to that group
- POIs not in a group should be shown with individual markers.
- Users can filter POIs by category.
- Users can toggle between overview and closeup ("follow me") modes.

#### 3.3.2 Navigation (Nav) View
- Divided into three sections: Top (ahead), Middle (current context), Bottom (behind).
- Displays upcoming and previous POI groups, individual POIs, and spur junctions in the user's direction of travel.
- Route lines in Nav View should be 4px wide, displayed in a subway-style vertical layout.
- Stops are indicated by horizontal lines (12px wide by 2px thick).
- Junction circles consist of:
  - Inner circle: 10px diameter
  - Outer circle: 22px diameter
- Each stop shows distance and ETA:
  - Distance shown on left side of route line
  - Time shown on right side of route line
  - Connected by a solid line (12px wide, 2px thick) matching trail color
  - Times over 60 minutes shown as "1h 14m" format
- Users can select and persist a preferred mode of locomotion.
- Users can filter POIs by category.
- Category icons shown with counts for POI groups.
- The tab bar at the bottom allows switching between Map, Nav, and List views.

**Nav View List Item Heights:**
- Full-width rows: 30px height, max 14px text size
- Split view rows: 40px height, max 11px text size
- Touch targets: minimum 44x44dp

**Context Card Specifications:**
- Border radius: 32px
- Border width: 12px (matching trail color)
- Background: white
- Text color: black (except "WALKING" label in white)
- Typography:
  - Font: Roboto
  - Weight: 500
  - Size: 11px
  - Line height: 16px
- Category toggle icons:
  - Icon height: 17px
  - Container height: 32px
  - Icons remain black
  - Background highlight in trail color
  - 200ms fade animation for toggle

**Color Specifications:**
- Trail Colors:
  - Green: #43D633
  - Blue: #6995E8
  - Orange: #FFB134
- UI Colors:
  - Grey (inactive): #6B7280
  - Background: #242424
  - Title bar & inactive tabs: #000000

**Nav View Logic:**
- Junction Display:
  - Within 3 stops: Split view with left/right columns
  - Beyond 3 stops: Single column with colored junction bar
- POI groups are represented by group name and count
- Spur junctions within a POI group are shown in correct order
- The user's current position is visually indicated
- When a category filter is applied, matching POIs are marked with the category icon and count

#### 3.3.3 List View
- Lists all POIs, grouped by group, filterable by category, and sorted alphabetically by default.
- Clicking a POI opens a details modal.
- Each POI shows contextual info (e.g., "2.1 miles ahead").
- Includes a button to jump to the POI location on the map.

#### 3.3.4 Handling "Not Near Trail" & Simulation Mode
- If user's location is not near a trail, display a modal with nearest available parking locations.
- The modal offers the option to enter Simulation Mode.

### 3.4 Contextual "Area Focus" Mode
- When the user enters a POI, POI group, or spur junction boundary:
  - Quick fade in animation (200ms)
  - Shows POI Group name
  - Offers Map View and List View options
  - If Map View selected: zooms to POI Group bounds
  - If List View selected: shows filtered list of POIs in that group

---

## 4. Technical Requirements

- **Frontend Framework:** React (recommended, flexible if dev prefers).
- **Mapping Library:** Leaflet via react-leaflet.
- **State Management:** Simple (React context, Redux, or similar).
- **Routing:** Deep links for trails (React Router or similar).
- **API Integration:** 
  - RideWithGPS API (with provided keys/tokens)
  - WordPress REST API
  - Proxy service required for API key security
- **Responsive Design:** Mobile-first only, no desktop-specific features
- **Accessibility:** Basic ARIA labels and keyboard navigation.
- **No analytics or tracking in Phase 1.**
- **Performance:** First meaningful paint within 3 seconds for typical trails
- **Minimum browser support:** 
  - Mobile Safari (iOS 16+)
  - Android Chrome (Android 12+)
  - Latest 2 versions of major desktop browsers
- **Map Tiles:** 
  - Use Leaflet default (OpenStreetMap)
  - Cache entire trail system tiles
  - 100% greyscale styling in dark mode

---

## 5. Distance and ETA Calculation Logic

[Previous content remains unchanged]

---

## 6. Out of Scope (Phase 1)

[Previous content remains unchanged]

---

## 7. Data Modeling and API Integration

[Previous content remains unchanged]

---

## 8. Simulation Mode

**Test Locations:**
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

[Rest of section remains unchanged]

---

[Sections 9-25 remain unchanged except for removal of desktop-specific features and addition of specific color codes where relevant] 