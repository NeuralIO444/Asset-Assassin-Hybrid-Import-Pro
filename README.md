# Asset Assassin: Hybrid Import Pro v3.3

**After Effects Project Organizer & Cleaner**  
Automatically sorts, categorizes, and tidies up your imported assets into a clean, standardized folder structure — with a safe **Simulate (Dry Run)** mode.

![Asset Assassin Banner](asset_assassin_banner.png)

## Overview

**Asset Assassin: Hybrid Import Pro** is a powerful ExtendScript (.jsx) tool for Adobe After Effects. It scans your project (or selected folder), intelligently categorizes assets by type, and moves them into a logical global structure — all while keeping your compositions intact.

Version **3.3** introduces a **Production-Hardened Modular Architecture**. The codebase has been split into a dedicated `lib/` directory using the `#include` pattern for easier maintenance, while retaining the beloved **V2.0 Checkbox UI** and persistent `app.settings` memory.

Perfect for:
- Motion designers & VFX artists dealing with messy imported projects
- Teams standardizing asset organization
- Anyone tired of hunting for missing files or bloated project panels

## Key Features

- **Modular Core (v3.3)** — Clean separation of concerns (`config`, `settings`, `utils`, `model`) via `#include` for GitHub-friendly version control.
- **Persistent Settings** — Remembers your Checkbox and Target preferences across After Effects sessions.
- **Simulate (Dry Run)** — Full preview of all proposed changes via a Summary Alert popup. No risk of accidental moves.
- **Smart Categorization & Organization** — Automatically sorts footage into purpose-built folders:
  - `Assets/3d ren` → EXR, DPX, HDR sequences/renders
  - `Assets/footage` → MOV, MP4, MXF, video files
  - `Assets/ill` → AI, EPS, SVG vector files
  - `Assets/images` → JPG, PNG, TIF, still images
  - `Assets/psd` → PSD, PSB layered files
  - `Assets/Audio` → WAV, MP3, AAC audio
  - `Solids` → Generated Solid layers
- **Composition Handling**:
  - Main compositions flattened to root (or target folder)
  - Pre-comps auto-detected (via "Pre/" or "pre" prefix) and moved to `pre-comps` folder

## Installation

1. Download or clone this repository.
2. Ensure the `lib/` directory structure remains intact alongside the main script.
3. (Recommended) Install permanently:  
   Copy `Asset_Assassin_Hybrid_Import_Pro.jsx`, the `lib/` folder, and `asset_assassin_banner.png` into your After Effects ScriptUI Panels folder:

   - **macOS**:  
     `/Applications/Adobe After Effects [Your Version]/Scripts/ScriptUI Panels/`

   - **Windows**:  
     `C:\Program Files\Adobe\Adobe After Effects [Your Version]\Support Files\Scripts\ScriptUI Panels\`

4. Restart After Effects. You can now dock the palette natively via the `Window` menu!

## Usage

1. Open your After Effects project.
2. In the **Project panel**, select the folder you want to organize.
3. Launch **Asset Assassin** from your `Window` menu (or `File -> Scripts` if not installed in the Panel folder).
4. The script UI will appear and display your selected Target Folder.
5. Toggle your desired Sort Strategies (Checkboxes are saved automatically).
6. Click **Scan & Organize**.
7. If `Simulate (Dry Run)` or `Show Summary` is checked, review the Alert popup detailing the file moves.

> **Tip**: Always save a copy of your project before applying changes (File → Save As…).

## Customization

Edit file type mappings and predicate logic directly in `lib/config.jsxinc`:

```javascript
var Config = {
    FILE_TYPES: {
        ren: { label: "3d ren", exts: ['exr', 'dpx', 'hdr', 'rla', 'c4d'], target: "Assets/3d ren" },
        // ... add your own categories here
    },
    // Customize your default checkbox states here!
    DEFAULTS: {
        ren: true,
        dryRun: false,
        // ...
    }
};
```