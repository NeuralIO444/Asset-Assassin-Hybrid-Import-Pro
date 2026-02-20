# Asset Assassin: Hybrid Import Pro v2.0 - Documentation

## Overview
**Asset Assassin: Hybrid Import Pro** is an Adobe After Effects script designed to organize imported assets into a clean, standardized project structure.

Version 2.0 introduces a **non-destructive Dry Run** engine powered by a new Manifest architecture, allowing users to visualize changes via a retro-style Terminal Dashboard before any files are moved.

## Key Features

### 1. Dry Run Simulation (New)
The script now features a dedicated **Scanner Service** that analyzes your project structure without modifying it.
- **Manifest System**: Builds a complete "state object" of what *would* happen.
- **Terminal Dashboard**: Displays a live, monospaced report of found assets and proposed actions.

### 2. File Organization
Automatically sorts imported files into the following global folder structure:
- `Assets/3d ren` (EXR, DPX, HDR, etc.)
- `Assets/footage` (MOV, MP4, MXF, etc.)
- `Assets/ill` (AI, EPS, SVG)
- `Assets/images` (JPG, PNG, TIF, etc.)
- `Assets/psd` (PSD, PSB)
- `Assets/Audio` (WAV, MP3, AAC)
- `Solids` (Generated Solid layers)

### 3. Composition Handling
- **Main Comps**: Flattened to the root of the project (or selected folder).
- **Pre-Comps**: Automatically detected (by "Pre/pre" prefix) and moved to a `pre-comps` folder.

## Technical Architecture (v3.0)

The script uses a strict **MVC (Model-View-Controller)** pattern with a Service layer.

### The Manifest Object
The core of the system is the `Manifest`, a JSON-like object that tracks the state of the scan.
```javascript
var manifest = {
    summary: { totalItems: 150, status: "SCANNED" },
    categories: [
        { id: "ren", label: "3D RENDERS", count: 12, items: [...] },
        { id: "audio", label: "AUDIO", count: 5, items: [...] },
        // ...
    ]
};
```

### The Scanner Service
The `Scanner` recursively traverses the selected folder hierarchy.
- **Read-Only**: It never sets properties like `parentFolder`. It only reads `item.name`, `item.file`, etc.
- **Categorization**: It matches items against the `Config.FILE_TYPES` definitions and pushes them into the appropriate Manifest category.

### Terminal View
A dedicated View component that renders the Manifest into a string report:
```text
3D RENDERS ..................... [ 12 ]
FOOTAGE ........................ [ 4 ]
AUDIO .......................... [ 5 ]
```

## Installation & Usage

1.  **Install**: Place `Asset_Assassin_Hybrid_Import_Pro_v02.jsx` and `asset_assassin_banner.png` in your AE Scripts folder.
2.  **Run**: Open After Effects. Go to `File > Scripts > Run Script File...` and select the script.
3.  **Select Target**: In the Project Panel, select the folder you want to organize.
4.  **Dry Run**:
    -   The script launches in "Dry Run Dashboard" mode.
    -   Click the **SCAN (Dry Run)** button.
    -   Review the output in the dashboard panel.

## Configuration

You can customize file type definitions in the `Config` object at the top of the script:
```javascript
FILE_TYPES: {
    ren: { id: "ren", label: "3D RENDERS", exts: ['exr', 'dpx'], target: "Assets/3d ren" },
    // Add new types here
}
```
