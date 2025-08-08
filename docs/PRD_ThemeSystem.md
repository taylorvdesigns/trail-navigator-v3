## Theme System PRD (Admin-defined brand themes with in-app Light/Dark toggle)

### Overview
Enable app admins (via Trail Config WordPress plugin) to define full brand themes (colors for trails and UI). Each theme provides both Light and Dark variants. End-users control only the Light/Dark mode inside the app; the active brand theme is controlled by the admin in WordPress.

### Goals
- **Admin control**: Define and activate a brand theme (with Light and Dark).
- **User control**: Toggle Light/Dark mode in-app; no color editing.
- **Consistency**: All colors in the app derive from the active theme (no hard-coded trail colors in the app bundle).
- **Extensibility**: Support multiple predefined themes and custom themes, export/import, and future component-level tokens.

### Non-goals
- No in-app theme editing by end-users.
- No per-user brand theme selection (the admin selects one active brand for all users of that deployment).

### Stakeholders
- **Admin**: Selects active brand theme and edits theme variants in the Trail Config WP plugin.
- **End-user**: Switches between Light/Dark within the constraints of the active brand.
- **Developers/Designers**: Consume theme tokens; avoid hard-coded colors in components.

### User Stories
- As an admin, I can choose an active brand theme from a list of predefined themes or create a custom one.
- As an admin, I can configure both Light and Dark variants for the active theme.
- As a user, I can switch between Light and Dark in-app, and the app updates immediately.
- As a developer, I can access `theme.trailColors[trailId]` and UI palette tokens without importing static color files.

### Theme Model (WordPress)
- Themes are stored in WP (option or custom post type). One theme is marked as active.
- Each theme has 2 variants: `light`, `dark`. Both must be present.

Example JSON (served by WP and consumed by the app):

```json
{
  "id": "greenway-brand",
  "name": "Greenway Brand",
  "version": 1,
  "variants": {
    "light": {
      "palette": {
        "primary": "#2E7D32",
        "secondary": "#1565C0",
        "warning": "#FB8C00",
        "success": "#2E7D32",
        "error": "#D32F2F",
        "text": { "primary": "#111111", "secondary": "#4B5563" },
        "background": { "default": "#F6F7F9", "paper": "#FFFFFF" }
      },
      "trailColors": { "51203086": "#43D633", "51203084": "#6995E8", "51203945": "#FFB134" },
      "componentTokens": {
        "navPillBg": "#FFFFFF",
        "navRail": "#E5E7EB",
        "junctionPillText": "#111111"
      }
    },
    "dark": {
      "palette": {
        "primary": "#39FF14",
        "secondary": "#6995E8",
        "warning": "#FFB134",
        "success": "#39FF14",
        "error": "#EF4444",
        "text": { "primary": "#FFFFFF", "secondary": "#B0B0B0" },
        "background": { "default": "#23272A", "paper": "#000000" }
      },
      "trailColors": { "51203086": "#43D633", "51203084": "#6995E8", "51203945": "#FFB134" },
      "componentTokens": {
        "navPillBg": "#2B2F33",
        "navRail": "#1F2226",
        "junctionPillText": "#242424"
      }
    }
  }
}
```

Notes:
- `trailColors` keys use the same trail ids used by the app (e.g., RWGPS `routeId` or internal `id`).
- `componentTokens` are optional; use them to refine critical surfaces without bloating `palette`.

### API Contract (App ↔ WP)
- Endpoint (proxied by the Next API): `GET /api/wp-design.js` (returns JSON)
  - Must follow same-origin policy and include `.js` extension when calling Next routes.
  - Response: single active theme JSON as above.
  - Caching: `Cache-Control: max-age=300` (5 min) suggested.
  - Error behavior: return HTTP 200 with a fallback theme JSON or 5xx; the app must fall back locally.

### App Architecture Changes
- **Hook**: `useDesignTheme()` fetches the active theme from `/api/wp-design.js` once and exposes `{ themeConfig, isLoading, error }`.
- **Theme builder**: `createMuiThemeFromConfig(themeConfig, isDarkMode)` merges WP brand tokens with mode-specific surfaces and returns a Material UI theme. Attach `theme.trailColors` and `theme.componentTokens` to the MUI theme object (under a safe key like `theme.extra`).
- **Context**: Update `ThemeContext` to:
  - Hold `isDarkMode` (UI toggle, persisted via localStorage)
  - Hold `activeThemeConfig` from WP (refreshed on app load)
  - Compute the MUI theme with `createMuiThemeFromConfig` and wrap the app
  - Expose `toggleDarkMode()` only (no brand editing)
- **Usage**:
  - Replace static imports of colors with values from `theme.palette` and `theme.extra.trailColors`.
  - In map polylines and Nav UI, use `trailColors[trailId]`.

### UI
- **Settings/Simulation Panel**: Provide a single Light/Dark toggle. Persist under `tnv3:isDarkMode`.
- No UI to edit colors; brand selection and editing is in WP.

### Edge Cases
- WP fetch fails: use bundled fallback theme with both `light` and `dark` variants (current dark defaults and derived light variant).
- Missing trail id in `trailColors`: fallback to `palette.primary` or a deterministic hash color.
- Unknown palette keys: ignore and use defaults.

### Performance
- Fetch theme once at boot; cache for session. Optionally revalidate every 5 minutes in the background.
- Theme apply is synchronous once data is present; avoid re-creating theme unnecessarily.

### Migration Plan
- Phase 1: Introduce `useDesignTheme`, builder, and updated `ThemeContext` (keep existing colors as fallback).
- Phase 2: Replace hard-coded `trailColors` usages in major components (NavView, Map pickers, Middle Card).
- Phase 3: Remove legacy static color modules after parity.

### Testing & QA
- Verify theme loads from WP and applies correctly in both Light and Dark modes.
- Toggle Dark/Light: all core screens update (NavView, MapView, Simulation, Modals).
- Trail colors map correctly by id; no stray default colors.
- Fallback behavior works offline and on WP API error.

### Acceptance Criteria
- App reads active theme from WP and applies it.
- App exposes only a Light/Dark toggle; brand theme selection is WP-only.
- All visible colors and trail lines reflect the active theme.
- No hard-coded colors remain in updated components.

### Open Questions
- Do we need multiple themes served by WP with an endpoint to select one, or only “active theme” served?
- Do we need locale-specific variants (e.g., accessibility palettes)?
- Should the app re-fetch the active theme at an interval or only on startup?


