# Asset Assassin: Hybrid Import Pro

**After Effects Project Organizer & Cleaner**  
Automatically sorts, categorizes, and tidies up your imported assets into a clean, standardized folder structure — with a safe **Dry Run** preview mode.

![Asset Assassin Banner](asset_assassin_banner.png)

## Overview

**Asset Assassin: Hybrid Import Pro** is a powerful ExtendScript (.jsx) tool for Adobe After Effects. It scans your project (or selected folder), intelligently categorizes assets by type, and moves them into a logical global structure — all while keeping your compositions intact.

Version **3.0** introduces a complete **non-destructive Dry Run** engine with a retro Terminal-style dashboard. Preview every proposed change before anything is moved.

Perfect for:
- Motion designers & VFX artists dealing with messy imported projects
- Teams standardizing asset organization
- Anyone tired of hunting for missing files or bloated project panels

## Key Features

- **Dry Run Simulation (v3.0)** — Full preview of all changes via a Manifest-powered Scanner Service. No risk of accidental moves.
- **Retro Terminal Dashboard** — Clean, monospaced report showing asset counts and proposed actions.
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
- **Manifest Architecture** — Internal JSON-like state object tracks everything safely
- **MVC + Service Layer** — Clean, modular code (Scanner is read-only during Dry Run)
- **Customizable** — Easily add/edit file types in the `Config` object

## Installation

1. Download the script:  
   [`Asset_Assassin_Hybrid_Import_Pro_v02.jsx`](Asset_Assassin_Hybrid_Import_Pro_v02.jsx)

2. (Recommended) Install permanently:  
   Copy the `.jsx` file (and optionally `asset_assassin_banner.png`) into your After Effects Scripts folder:

   - **macOS**:  
     `~/Library/Preferences/Adobe/After Effects/[Your Version]/Scripts/`

   - **Windows**:  
     `%APPDATA%\Adobe\After Effects\[Your Version]\Scripts\`

3. Restart After Effects (if installed permanently).

## Usage

1. Open your After Effects project.
2. In the **Project panel**, select the folder you want to organize (or select nothing to scan the entire project).
3. Go to **File → Scripts → Asset_Assassin_Hybrid_Import_Pro_v02.jsx** (or your custom Scripts menu entry).
4. The script launches → **Dry Run Dashboard** appears first.
5. Click **SCAN (Dry Run)** to analyze.
6. Review the Terminal-style report:
   - Asset counts per category
   - Proposed moves
   - Any warnings
7. If happy → proceed to **Apply Changes** (or cancel safely).

> **Tip**: Always save a copy of your project before applying changes (File → Save As…).

## Customization

Edit file type mappings directly in the script (near the top):

```javascript
var Config = {
    FILE_TYPES: {
        ren:    { id: "ren",    label: "3D RENDERS",   exts: ['exr','dpx','hdr'], target: "Assets/3d ren" },
        footage: { id: "footage", label: "FOOTAGE",     exts: ['mov','mp4','mxf'], target: "Assets/footage" },
        // ... add your own categories here
    },
    // other settings...
};