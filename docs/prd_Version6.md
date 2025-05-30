# Product Requirements Document (PRD): Trail Map Web Application

## Glossary

- **Cluster:** A group of POIs close together on the map, visually grouped for easier navigation, primarily for display purposes.

- **Group:** A logical set of POIs, usually sharing a WordPress post tag (e.g., “Unity Park”), used for list organization, filtering, and navigation.
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
- **Area Focus Mode:** UI mode that highlights a user’s current POI, group, or junction, providing context and quick actions.
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
- The application is designed mobile-first and optimized for touch; desktop support is secondary but must remain functional and visually consistent.
- Performance: The initial app load (first meaningful paint) should occur within 3 seconds on a typical 4G mobile connection for average-sized trails.

### 3.2 Data Sources
- Trails data is fetched from the RideWithGPS API.
- POIs and parking locations are fetched from a WordPress REST API.

### 3.3 Core Views & Behaviors

#### 3.3.1 Map View
- Displays the full trail network and all spurs.
- Shows user's current location if permitted, with optional “follow me” mode.
- POIs are shown individually or as clusters (by proximity), depending on zoom level.
- Clicking a cluster zooms in and optionally filters the POI list to show only items in that area.
- Clicking an individual POI opens a modal with POI details.
- Users can filter POIs by category.
- Users can toggle between overview and closeup (“follow me”) modes.

#### 3.3.2 Navigation (Nav) View
- Divided into three sections: Top (ahead), Middle (current context), Bottom (behind).
- Displays upcoming and previous POI groups, individual POIs, and spur junctions in the user's direction of travel.
- Each stop shows distance and ETA based on selected locomotion mode (walking, running, biking).
- Users can select and persist a preferred mode of locomotion.
- Users can filter POIs by category; filtered categories are visually indicated.
- Clicking a POI group opens the List View, filtered to that group.
- Clicking an individual POI opens a details modal.
- The tab bar at the bottom allows switching between Map, Nav, and List views.

**Nav View Logic:**
- POI groups are represented by group name and count only (e.g., “Cleveland Park Group (2)”).
- Spur junctions within a POI group are shown in correct order between group segments.
- Clicking a POI group name switches to List View, displaying all POIs in that group, regardless of their order around a spur junction.
- If a trail junction is within 2 stops ahead, Nav View splits to show onward destinations for each branch; only the nearest qualifying junction triggers a split. Distant junctions (>2 stops away) are listed normally.
- The user’s current position is visually indicated and matches the color of their current trail.
- When a category filter is applied, matching POI groups/POIs are marked with the category icon and optional count badge. Clicking a group opens the List View with that filter pre-applied.

#### 3.3.3 List View
- Lists all POIs, grouped by group, filterable by category, and sorted alphabetically by default.
- Clicking a POI opens a details modal.
- Each POI shows contextual info (e.g., “2.1 miles ahead”).
- Includes a button to jump to the POI location on the map.

#### 3.3.4 Handling "Not Near Trail" & Simulation Mode
- If user's location is not near a trail, display a modal with nearest available parking locations.
- The modal offers the option to enter Simulation Mode (see Simulation Mode section).

### 3.4 Contextual "Area Focus" Mode
- When the user enters a POI, POI group, or spur junction boundary, app enters "Area Focus" mode (see Glossary).
- All main views update to highlight and emphasize the area, show high-level details, and offer context-based quick actions.
- Area Focus is triggered by geolocation and boundaries (polygon or radius).
- Exiting an area returns the UI to standard mode.

---

### 3.5 User Interface Description

#### Shell
- Sticky title bar at top displays the trail name.
- Persistent bottom tab bar allows switching between Map, Nav, and List views.
- Mobile-first layouts, controls, and interactions; desktop is supported and visually consistent.

#### Map View
- Initially displays the entire trail network, with spurs, POI clusters, and markers for stand-alone POIs.
- User’s current location is shown if geolocation is enabled.

#### Nav View
- Three sections: Top (ahead), Middle (context card), Bottom (behind).
- See UI Spacing Requirements for details.

##### Nav View UI Spacing Requirements

- **Full-Width Rows (Standard List)**
  - Height: 30 px per block.
  - Text Size: Max 14 px.

- **Split View Rows (Branching/Splitscreen)**
  - Height: 40 px per block.
  - Text Size: Max 11 px.

- **General Spacing & Typography**
  - Touch targets: minimum 44x44dp.
  - Padding, font size, and line height balanced for accessibility.

**Visual Reference:**  
- See relevant mockups for row heights in context.

##### Nav View: Middle Card (Context Card) Specification

The middle card is a persistent, floating UI element in the Nav View, visually highlighted by a colored border matching the active trail.  
Refer to ![image1](image1) for visual reference.

**Contents and Structure:**

1. **Top Label/Heading:**
    - Displays "Heading Towards" followed by:
        - The next destination or area name (e.g., "Travelers Rest")
        - The current trail name and color (e.g., "on the GREEN TRAIL")
        - Trail name is styled in its designated color for clarity.

2. **Center Circular Area:**
    - Large directional arrow indicating user’s current heading along the trail.
    - Icons for available locomotion modes (walking, running, biking), with the selected mode visually emphasized.
    - Label beneath the arrow indicating the selected locomotion mode (e.g., "WALKING").

3. **Left Section:**
    - Displays current distance from the trail start (e.g., "You are 1.5 MILES from where you started on the trail").
    - Units (miles/km) match user preference.

4. **Right Section:**
    - Brief summary of upcoming terrain and/or notable destinations/amenities (e.g., "Pretty flat to Swamp Rabbit Café & Groceries").
    - This can be dynamically generated based on segment metadata or tagged POIs.

5. **Bottom Row (Quick Access/Amenity Icons):**
    - Row of icons representing upcoming or nearby amenities (e.g., food, restrooms, water, parking, etc.)
    - Each icon is accessible (with labels for screen readers).

**Behavior & Styling:**
- The middle card automatically floats up or down to optimize space based on the content in the ahead/behind lists and always remains visible.
- Border color matches the current trail color as shown in the mockup.
- All text and icons meet accessibility and contrast requirements.
- Card layout and content is responsive and adapts for different device sizes.

**Data Sources:**
- Destination/area names and trail names: from RideWithGPS and POI metadata.
- Distance: calculated from user’s current (or simulated) position to trail start.
- Terrain/segment summary: from route metadata or pre-defined content.
- Amenities: from upcoming POIs within a distance threshold.

> For all layout, spacing, and visual style details, refer to the mockups folder.


#### List View
- Features a category icon row for filtering at the top.
- Scrollable list of POIs grouped by group, with individual POIs and spur junctions interleaved by order.
- Visual separation by trail or spur.

#### Area Focus Mode
- When active, overlays accents, banners, or overlays to highlight the user’s current POI or group.
- Provides area-specific tips, actions, and context.

#### Handling User Direction Change

- The app monitors user’s heading via device GPS.
- If user reverses direction (sustained for 5 seconds or 20 meters), the app swaps the “ahead” and “behind” sections in Nav and List Views, updating all calculations and previews.
- A brief notification appears (“Direction reversed: Now showing destinations ahead in your new direction.”).
- Manual override is available.
- Direction state persists until changed again.

#### Nav View Direction Change Animation

- See mockups for animation sequence, which is explicit and accessible, lasting 500–700ms.
- Touch input is disabled during transition.

---

## 4. Technical Requirements

- **Frontend Framework:** React (recommended, flexible if dev prefers).
- **Mapping Library:** Leaflet via react-leaflet.
- **Clustering:** Use a Leaflet clustering plugin or similar.
- **State Management:** Simple (React context, Redux, or similar).
- **Routing:** Deep links for trails (React Router or similar).
- **API Integration:** Fetch and cache data from RideWithGPS and WordPress REST APIs. 
    - All API keys or credentials are proxied securely via backend (never exposed in frontend).
	*** 1. API Response Examples

	#### RideWithGPS Route Data
	- Example endpoint: `https://ridewithgps.com/routes/${ID}.json?version=2&apikey=...&auth_token=...`
	- Example fields include:  
	  - `id`, `name`, `description`, `distance`, `elevation_gain`, `elevation_loss`
	  - `first_lat`, `first_lng`, `last_lat`, `last_lng`, `bounding_box`
	  - `user` object (creator info)
	  - `metrics` (elevation, grade, etc.)
	  - (Assumed: geometry/polyline data present elsewhere in full payload)

	#### WordPress POI Data
	- Example endpoint: `https://srtmaps.elev8maps.com/wp-json/geodir/v2/places`
	- Example fields include:  
	  - `id`, `title`, `slug`, `link`
	  - `status`, `type`, `author`, `date`, `modified`
	  - `content` (raw/rendered)
	  - `default_category`, `post_category` (array of categories)
	  - `post_tags` (array of tags for grouping)
	  - (Assumed: latitude/longitude present in full payload)
	  
- **Responsive Design:** Mobile-first, with desktop support.
- **Accessibility:** Basic ARIA labels and keyboard navigation.
- **No analytics or tracking in Phase 1.**
- **Performance:** First meaningful paint within 3 seconds for typical trails; must handle at least 100 POIs per page with no significant slowdown.
- **Minimum browser support:** Latest 2 versions of all major browsers (Chrome, Firefox, Safari, Edge); Mobile Safari (iOS 15+) and Android Chrome (Android 12+).
- **Map Tiles:** Use Leaflet default (OpenStreetMap). If usage limits or branding requirements arise, consider alternatives.

---

## 5. Distance and ETA Calculation Logic

### Overview
- All distance and ETA calculations must be performed “on trail”—that is, using the path of the trail geometry as defined by the loaded RideWithGPS routes, including main trails and all spurs.
- Straight-line (“as the crow flies”) calculations must never be used, except for the off-trail portion when a POI is not located directly on a trail (see below).

### Handling Junctions and Spurs

- When a POI or POI Group is located on a spur or a different branch of the trail network, distance must be computed as follows:
    1. **From the user’s current position, follow the trail path to the nearest junction that connects to the spur or branch where the POI is located.**
    2. **At the junction, switch to the spur/branch and continue following the path along the trail geometry to the POI or POI Group.**
    3. **Sum the cumulative distance along these connected trail segments to obtain the total distance.**
    4. **ETA is calculated by dividing the total trail distance by the user’s selected locomotion speed.**

    - Example: If a user is on the main trail and a POI is on a spur, the app should first calculate the distance to the junction, then from the junction along the spur to the POI, and add these distances together.

- This logic must support any network configuration—multiple branches, loops, or nested spurs.

- **If multiple junctions/paths exist, always choose the shortest on-trail route to the POI.**

### Special Cases

- **Off-Trail POIs:**  
    For POIs located off the trail, calculate as follows:
    - Trail-following distance from user’s position to the nearest trail point to the POI, plus
    - Straight-line distance from the trail to the POI.

- **Junctions:**  
    - Junctions must be detected as places where two or more routes (main trail, spurs) intersect or share a node within a defined proximity.
    - All routing must use the actual trail network graph, not just individual polylines.

### Requirements for Implementation

- The app must build a trail network graph from all loaded routes, with junctions as connection points.
- Distance queries must traverse this network, always following the trail geometry.
- Never shortcut, interpolate, or use straight-line segments except for off-trail POI computation as defined above.

### Pseudocode Example

```python
function trailDistanceToPOI(userLocation, poiLocation, trailNetwork):
    userNode = trailNetwork.findNearestNode(userLocation)
    poiNode = trailNetwork.findNearestNode(poiLocation)
    path = trailNetwork.findShortestPath(userNode, poiNode)
    totalDistance = sum(segment.length for segment in path)
    return totalDistance
```

- The above logic is required for all trail-following distance and ETA calculations.

> **Note:** This requirement is critical for navigation accuracy. The app must never display “crow flies” distances except for the portion from trail to off-trail POIs.


---

## 6. Out of Scope (Phase 1)

- User authentication or accounts.
- Turn-by-turn navigation.
- Directions from user’s current location to POI (beyond trail context).
- Analytics, logging, or tracking.
- Advanced accessibility or internationalization.
- Admin/POI editing.
- Offline/caching beyond basic browser caching.
- Automated testing (manual QA only for this phase).
- Push notifications or notification settings (may be considered in future phases).
- In-app onboarding or help flows.

---

## 7. Data Modeling and API Integration

- See Glossary for definitions.
- POI groupings use WordPress `post_tags`.
- POI categories use WordPress `post_category`.
- Spurs & main trails: unresolved in RideWithGPS data—note as a risk.
- Map clusters are for display only; groups are logical sets for filtering/listing.
- All POIs may be shown at once; if performance issues arise, revisit in future phases.
- Geolocation prompt: prompt on load; if denied, Navigation view is disabled.
- Simulation Mode: see next section.

---

## 8. Simulation Mode

Simulation Mode allows the app to mimic user location for testing or user convenience:

- **User-facing:**
  - If the user is not near any trail, prompt to enter Simulation Mode.
  - User can select from a list of predefined trail locations to simulate being on the trail.
  - All app features behave as if the user is physically present at the selected spot.
  - Simulation Mode is clearly indicated in the UI; user can exit simulation at any time.

- **QA/Dev:**
  - A developer/debug menu allows testers to set simulated location, direction, and locomotion mode at arbitrary coordinates for comprehensive QA.
  - This menu is not visible to end users.

- **Limitations:**
  - In Simulation Mode, live GPS data is ignored until the mode is exited.
  - Actions (e.g., feedback submission) are still functional and marked as simulated in backend logs if needed.

- **Purpose:**
  - Enables full feature testing for remote users and QA without being physically present on location.
  - Allows users to explore trails virtually before visiting.

---

## 9. UI, Branding, and Color Palette

- **Visual Reference:**  
  All layouts, spacing, font sizes, color palette, iconography, and component states must follow the attached mockups ([Figma/Sketch/PNG link here]).  
  If there is a conflict between this document and the mockups, the mockups take precedence for all visual and UI matters.

- **UI Elements:**  
  - Persistent sticky title bar at the top displays the trail name.
  - Persistent bottom tab bar allows switching between Map, Nav, and List views.
  - Modal overlays are used for POI details, "Not Near Trail" alerts, simulation selection, and feedback.
  - All mobile/desktop layouts, touch targets (min 44x44dp), spacing, and responsive behaviors must match the mockups.
  - Any dynamic behaviors or animations (e.g., direction change, area focus highlights, transitions between views) must match both the PRD and mockup references.
  - Accessibility: All interactive elements require ARIA labels and must meet WCAG AA contrast standards.

- **Branding:**  
  - Use the color palette, fonts, and logo assets provided in the [BrandAssets.zip]/[Brand Guide].  
  - Primary trail colors: green, orange, blue, yellow/gold (exact hex values in mockups/brand guide).
  - All icons should be minimalist and monochrome per mockup examples.
  - Logo is displayed in the main navigation/header; favicon and preview images are provided for browser/social use.

- **Themeability:**  
  - The architecture must allow for easy updates to branding elements (colors, logos, icons) by centralizing variables (e.g., in a theme file or config), to support future customization.
  - The initial release must match the provided mockups and branding guide exactly.

- **Documentation:**  
  - All assets (logo, icons, color codes, font references) and their usage guidelines must be documented in the repository’s docs or README.
  - Any updates to the branding or UI must be reflected in both mockups and documentation.

> **Note:** If any interaction, animation, or UI state is not visually clear in the mockups, the written requirements in the PRD take precedence for those cases.


---

## 10. Error Handling & Edge Cases

- **Location Access:** If denied, explain benefits, allow manual browsing, disable navigation.
- **Data/API Errors:** Show actionable messages and retry options; display partial data where possible.
- **Empty States:** Always show friendly, actionable empty-state messages and reset filter options.
- **Location Drift:** Smooth/ignore outliers. Only update navigation when confident.
- **Offline Mode:** Show banner and limited features; display cached data with warnings if available.
- **General:** All errors are user-friendly and actionable.

---

## 11. Accessibility Requirements

- All text and interactive elements meet WCAG AA contrast standards.
- No color-only indicators; icons/labels used.
- Dynamic text scaling; no truncation/overlap.
- Touch targets: minimum 44x44dp.
- Full accessibility labeling for all interactive elements and map markers.
- Logical tab/navigation order; accessibility notifications for major state changes.
- Keyboard/switch navigation as feasible.
- Animations respect “Reduce Motion.”
- Accessibility features and compliance are documented and tested.

---

## 12. Animations & Transitions

- Enhance clarity and reinforce user actions; 300–700ms duration.
- Animate direction changes, filtering, selection/focus, and map interactions.
- Animations must be performant and accessible (fade instead of slide if “Reduce Motion”).
- Consistency: All durations/easing are defined in a central style guide.
- Test on real devices and with accessibility features enabled.

---

## 13. Offline & Low Connectivity Support

- Cache trail/POI data for offline use; update when connectivity is restored.
- Graceful degradation: clear banner, disable features that require live data.
- User actions (e.g., feedback) are queued or disabled if offline.
- GPS should function offline if device supports it.
- Test in low-bandwidth/airplane mode.

---

## 14. App Settings & User Preferences

- Units: miles/km, default to device locale, override available.
- Theme: light/dark/system, override available.
- Locomotion mode: user selects and persists preference.
- Accessibility: text size, high contrast, reduced motion.
- Reset to defaults available.
- All settings are easily accessible from main navigation.
- Preferences are persisted locally (e.g., localStorage).
- All options and effects are documented in-app or in help resources.

---

## 15. Testing & QA Scenarios

- Location simulation (as per Simulation Mode).
- Edge cases: long trails, many POIs, empty data, location jumps, zero POIs.
- Error handling: server downtime, connectivity loss, permission denial.
- UI/UX: All flows, navigation, direction changes, filters, animations.
- Accessibility: Screen readers, device settings, color blindness.
- Device/platform coverage: iOS/Android, various screen sizes.
- Manual regression; maintain comprehensive QA checklist.
- Automated testing is out of scope but may be added in future.

---

## 16. Feedback Feature

- Users can submit feedback or report issues directly from the app.
- Feedback is accessible via a persistent "Feedback" or "Report an Issue" button in the main menu or settings.
- Feedback form allows users to describe the issue/suggestion, optionally include contact info.
- Confirmation message is displayed upon submission.
- All feedback is routed to support/development; data handled securely and not shared with third parties.
- Optionally, users may receive a follow-up if contact info is provided, but no guarantee of response is required.

---

## 17. Legal, Privacy, and Compliance

- No analytics/tracking in Phase 1; no collection of personally identifiable information unless user submits it voluntarily with feedback.
- If required, privacy policy and terms of service will be linked from the app footer or settings.
- All API keys and credentials are protected and never exposed.
- Feedback and user data is not shared with third parties.

---

## 18. Analytics (Future Phases)

- See original PRD for events to track, privacy requirements, and implementation.
- All analytics must be anonymized and opt-out is provided.
- Analytics platform and instrumentation are deferred to future phases.

---

## 19. Deployment & Updates

- GitHub is source of truth for all versioned code.
- Production builds via Webpack, Vite, etc.; automated via GitHub Actions or similar CI/CD.
- Deploy to GitHub Pages, Vercel, Netlify, AWS, or custom server.
- Store secrets securely (GitHub Secrets).
- Tag releases using semantic versioning; release notes maintained in GitHub Releases.
- Optionally display “What’s New” dialog in-app.
- The app always serves the latest production build; users are notified if a new version is available.
- Rollbacks and hotfixes supported via GitHub releases and CI/CD.
- Post-release monitoring via error logs and user feedback.
- Document build/deploy procedures and required environment variables.

---

## 20. Branding, Logo, and Icons

- Consistent branding (colors, fonts, logo, app name) across all UI.
- Logo displayed in main navigation/header; favicon and preview images provided.
- Consistent icon set (Material, Font Awesome, or custom SVGs); all icons accessible.
- Assets and usage are documented in the repo.

---

## 21. Outstanding Open Questions

- Should the sticky tab bar be always visible, or only on mobile?
- Do you want transitions/animations when switching views or opening modals?
- Should data be fetched on page load, or lazily as user moves around?
- Is there a typical or maximum number of POIs/trails expected per page?
- What is the desired behavior if the RideWithGPS or WordPress API fails or is slow?
- Should there be a fallback for missing images or details in POIs?
- Do you have a preferred hosting provider or build pipeline (e.g., Vercel, Netlify, S3, custom server)?
- Should the codebase be set up for easy CI/CD or just static deployment for now?

---

## 22. Deliverables

- Fully functional web app (React-based) matching all above requirements.
- Source code repo with README.
- Example environment/config files for API keys/URLs.
- Documentation for running locally and deploying.
- Brief usage guide for end users.
- QA checklist for regression and edge case testing.

---

## 23. Timeline / Milestones

_(To be defined by dev team/client based on resourcing and desired launch date.)_

---

## 24. Acceptance Criteria

- All features in Section 3 implemented and working on production URL.
- No authentication required.
- Works on major browsers and mobile devices.
- All data loads correctly from APIs; reasonable error handling for API failures.
- Deep links to trails work as described.
- User can see, filter, and interact with trails and POIs as described.
- "Not near trail" handling and simulation feature is present and functional.
- Distances to POIs are calculated as described.

---

## 25. Conclusion & Next Steps

This document outlines the core requirements, features, and best practices for the web app. By following these guidelines, development and QA teams can deliver a consistent, accessible, and user-friendly experience.

**Next Steps:**
- Review this specification with all stakeholders and gather feedback.
- Prioritize features and create a development roadmap.
- Break down requirements into actionable user stories and tasks.
- Set up issue tracking and regular check-ins for progress and blockers.
- Keep this documentation updated as requirements evolve.

Thank you to everyone contributing to the project—let’s build something great together!
