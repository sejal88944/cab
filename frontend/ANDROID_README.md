# RideEasy Android Apps (Capacitor)

Two Android app builds share this project and the **same backend API**:

| Build | App ID | Opens at | Use |
|-------|--------|----------|-----|
| **Customer** | `com.rideeasy.app` | Your site root (landing) | Login, book rides, live tracking |
| **Driver** | `com.rideeasy.driver` | `/captain-login` | Driver login, accept rides, live tracking |

Both load your deployed RideEasy web app in a WebView; the backend URL is set in your deployed site (e.g. `VITE_BASE_URL`), so both apps use the same API.

---

## Quick start

1. **Set your deployed URL** in both configs (same domain for both):
   - **Customer:** `capacitor.config.json` → `server.url` = `https://your-rideeasy-domain.com`
   - **Driver:** `android/app/src/driver/assets/capacitor.config.json` → `server.url` = `https://your-rideeasy-domain.com/captain-login`

2. **Build and open Android Studio:**
   ```bash
   npm run build
   npx cap sync
   npx cap open android
   ```

3. In Android Studio, choose the build variant and run or build APK:
   - **Build → Select Build Variant** → choose `customerDebug` / `customerRelease` or `driverDebug` / `driverRelease`
   - Run on device/emulator, or **Build → Build Bundle(s) / APK(s)**.

---

## Building Customer vs Driver APKs

| To build | Build variant | Output (e.g. debug) |
|----------|----------------|---------------------|
| Customer app | `customerDebug` / `customerRelease` | `app-customer-debug.apk` |
| Driver app | `driverDebug` / `driverRelease` | `app-driver-debug.apk` |

- **Customer:** Opens at your site root. Users can sign up, log in, book rides, and see live tracking.
- **Driver:** Opens at `/captain-login`. Drivers log in, see pending rides, accept rides, and use live tracking.

Both can be installed on the same device (different application IDs).

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build the Vite app to `dist/` (required for `cap sync`) |
| `npm run cap:sync` | Sync `dist/` and config into `android/` (customer config → main assets) |
| `npm run cap:open:android` | Open the Android project in Android Studio |
| `npm run android` | Build + sync + open Android Studio |

---

## Permissions

Both apps request:

- **Internet** — load the site and APIs
- **Network state** — connectivity checks
- **Fine & coarse location** — for maps and ride tracking (prompted at runtime)

---

## Release build

1. **Build → Select Build Variant** → `customerRelease` or `driverRelease`.
2. **Build → Generate Signed Bundle / APK** and sign with your keystore.
3. Build again for the other variant if you want both APKs/AABs.

---

## Changing the loaded URL

- **Customer:** Edit `capacitor.config.json` → `server.url`, then run `npx cap sync`.
- **Driver:** Edit `android/app/src/driver/assets/capacitor.config.json` → `server.url`. No sync needed (flavor asset). Rebuild the driver variant.
