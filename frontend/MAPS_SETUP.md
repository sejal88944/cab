# Google Maps setup for RideEasy (Android)

## 1. API key (frontend)

- Create a key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
- Enable: **Maps JavaScript API**, **Geocoding API**, **Directions API**, **Places API** (if using autocomplete).
- In the frontend, add to `.env`:
  - `VITE_GOOGLE_MAPS_API_KEY=your_key_here`
- Rebuild and sync: `npm run build && npx cap sync android`.

## 2. Android permissions

Location is already declared in `frontend/android/app/src/main/AndroidManifest.xml`:

- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `INTERNET`
- `ACCESS_NETWORK_STATE`

On first run, the app may prompt for location permission so the map and driver tracking work correctly.

## 3. Features

- **Home**: Pickup and drop from suggestions; map shows A/B markers and route.
- **Riding (customer)**: Live driver position (socket + poll), route, and “Open in Google Maps”.
- **Captain riding**: Route from driver → pickup → drop and “Navigate” to open Google Maps.
