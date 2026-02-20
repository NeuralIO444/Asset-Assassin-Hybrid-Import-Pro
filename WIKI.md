# Asset Assassin: Hybrid Import Pro v3.3 - Documentation

## Overview
**Asset Assassin: Hybrid Import Pro** is an Adobe After Effects script designed to organize imported assets into a clean, standardized project structure.

Version 3.3 represents a massive structural leap to a **Modular `#include` Architecture** built specifically for GitHub/version-control, while preserving the user-favorite V2.0 GUI (Checkboxes and Native Popups).

## Key Features

### 1. Modular Architecture (New)
The massive monolithic `.jsx` script has been surgically divided into a `lib/` directory:
- `lib/config.jsxinc`: Constants, File Types, and Defaults
- `lib/settings.jsxinc`: Extracted `app.settings` persistent memory module
- `lib/model.jsxinc`: Centralized `.scan()` and `.process()` loop architecture
- `lib/utils.jsxinc`: Helper functions (padding, safe path execution)
- `Asset_Assassin_Hybrid_Import_Pro.jsx`: The lightweight Master Loader and UI component.

### 2. File Organization
Automatically sorts imported files into the following global folder structure based on `MATCHERS` arrays in `config.jsxinc`:
- `Assets/3d ren` (EXR, DPX, HDR, etc.)
- `Assets/footage` (MOV, MP4, MXF, etc.)
- `Assets/ill` (AI, EPS, SVG)
- `Assets/images` (JPG, PNG, TIF, etc.)
- `Assets/psd` (PSD, PSB)
- `Assets/Audio` (WAV, MP3, AAC)
- `Solids` (Generated Solid layers)

### 3. Native ScriptUI Integration
The V3.3 architecture fully supports standard After Effects `ScriptUI Panels` execution.
- Generates a Dockable GUI.
- Memory-safe `try/catch` wrapping prevents immediate garbage collection.
- Settings are automatically saved directly to the host machine's `app.settings` database, surviving AE reboots.

## Technical Architecture (v3.3)

The script uses a strict **MVC (Model-View-Controller)** pattern with a distinct decoupled Model layer.

### The Model
The core of the system parses the Project tree recursively via `Model.scan()`.
It returns an object array of matches (`stats`) that are then fed through `Model.process()`.

```javascript
function scan(rootFolder) {
    var results = { comps: [], solids: [], ren: [], footage: [], ill: [], images: [], psd: [], audio: [], others: [] };
    // Recursive File matching against Config.FILE_TYPES
    return results;
}
```

### Settings Persistence
The system explicitly handles saving states to prevent namespace collisions using an isolated `AppPrefs` module.
```javascript
var AppPrefs = (function () {
    function save(key, value) {
        app.settings.saveSetting(Config.SETTINGS_SECTION, key, value.toString());
    }
    // ...
})();
```

## Installation & Usage

1.  **Install**: Place `Asset_Assassin_Hybrid_Import_Pro.jsx`, the entire `lib/` directory, and `asset_assassin_banner.png` in your AE `ScriptUI Panels` folder.
2.  **Run**: Open After Effects. Go to `Window > Asset_Assassin_Hybrid_Import_Pro.jsx` (or run via the File menu). 
3.  **Select Target**: In the Project Panel, select the folder you want to organize.
4.  **Dry Run**:
    -   Check the **Simulate (Dry Run)** box in the UI.
    -   Click the **Scan & Organize** button.
    -   Review the native Summary Alert popup detailing proposed file movements.

## Configuration

You can customize file type definitions and default Checkbox values in the `Config` snippet located inside `lib/config.jsxinc`:
```javascript
FILE_TYPES: {
    ren: { label: "3d ren", exts: ['exr', 'dpx'], target: "Assets/3d ren" },
    // Add new types here
}
```
