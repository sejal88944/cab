# RideEasy Android icon & splash assets

## What’s in the project

- **App icon (adaptive, API 26+)**
  - **Background:** `drawable/ic_launcher_background.xml` and `values/ic_launcher_background.xml` (emerald `#10B981`).
  - **Foreground:** `drawable-v24/ic_launcher_foreground.xml` — taxi + location pin (white), tuned for the adaptive icon safe zone.
  - **Adaptive definitions:** `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` (both use the drawable foreground).

- **Splash**
  - **Layout:** `drawable/splash.xml` — solid `rideeasy_surface` with centered icon.
  - **Icon:** `drawable/splash_icon.xml` — taxi + location pin (white) for the splash screen.

## Style

- **Icon:** Taxi/car + location pin (teardrop), white on emerald green.
- **Splash:** Same motif, white on dark surface (`#0F172A`).

## Optional PNGs (Play Store / legacy)

If you have generated PNGs (e.g. from the Cursor assets folder or a design tool):

- **Play Store:** Use a 512×512 (or 1024×1024) icon and, if needed, a 1024×500 splash/feature graphic.
- **Legacy launcher (pre–API 26):** Resize the main icon to:
  - `mipmap-mdpi/ic_launcher.png` (48×48)
  - `mipmap-hdpi/ic_launcher.png` (72×72)
  - `mipmap-xhdpi/ic_launcher.png` (96×96)
  - `mipmap-xxhdpi/ic_launcher.png` (144×144)
  - `mipmap-xxxhdpi/ic_launcher.png` (192×192)  
  and the same sizes for `ic_launcher_round.png` if you use a round icon.

The app runs with the current vector assets even without these PNGs.
