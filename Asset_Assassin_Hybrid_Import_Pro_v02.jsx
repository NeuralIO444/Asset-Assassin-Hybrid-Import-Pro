/*
    ASSET ASSASSIN: HYBRID IMPORT (BRANDED) - v2.0
    
    Description:
    1. ASSETS: Moves selected file types OUT of the import folder to the Global structure.
    2. COMPS: Flattens comps to the ROOT of the selected folder.
    3. PRE-COMPS: Detects "Pre/pre" prefix and moves them to a 'pre-comps' subfolder.
    4. BRANDING: Looks for 'asset_assassin_banner.png' in the script folder.
    
    New Features (v2.0):
    - MVC Architecture
    - Persistent Settings via app.settings
    - Dry-Run Mode (Simulation)
    - Detailed Summary Report
    - Tooltips
*/

(function () {
    // --- 1. CONFIGURATION (CONSTANTS) ---
    var Config = {
        SCRIPT_NAME: "Asset Assassin: Hybrid",
        VERSION: "2.0",
        BANNER_FILENAME: "asset_assassin_banner.png",
        SETTINGS_SECTION: "AssetAssassin_Hybrid_v2",

        // File Type Definitions
        FILE_TYPES: {
            ren: { label: "3d ren", exts: ['exr', 'dpx', 'hdr', 'rla', 'c4d'], target: "Assets/3d ren" },
            footage: { label: "footage", exts: ['mov', 'mp4', 'avi', 'mxf', 'r3d', 'mpg'], target: "Assets/footage" },
            ill: { label: "ill", exts: ['ai', 'eps', 'svg'], target: "Assets/ill" },
            images: { label: "images", exts: ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'gif'], target: "Assets/images" },
            psd: { label: "psd", exts: ['psd', 'psb'], target: "Assets/psd" },
            audio: { label: "Audio", exts: ['wav', 'mp3', 'aac', 'aif', 'aiff'], target: "Assets/Audio" }, // Added Audio support
            solids: { label: "Solids", exts: [], target: "Solids" } // Special case handled by source type
        },

        // Default Settings
        DEFAULTS: {
            ren: true,
            footage: true,
            ill: true,
            images: true,
            psd: true,
            audio: true,
            solids: true,
            comps: true,
            prune: true,
            dryRun: false,
            showSummary: true
        }
    };

    // --- 2. SETTINGS MODULE (PERSISTENCE) ---
    var Settings = (function () {
        function save(key, value) {
            if (app.settings.haveSetting(Config.SETTINGS_SECTION, key)) {
                app.settings.saveSetting(Config.SETTINGS_SECTION, key, value.toString());
            } else {
                app.settings.saveSetting(Config.SETTINGS_SECTION, key, value.toString());
            }
        }

        function load(key, defaultValue) {
            if (app.settings.haveSetting(Config.SETTINGS_SECTION, key)) {
                var val = app.settings.getSetting(Config.SETTINGS_SECTION, key);
                return val === "true"; // Simple boolean conversion
            }
            return defaultValue;
        }

        function loadAll() {
            var currentSettings = {};
            for (var key in Config.DEFAULTS) {
                if (Config.DEFAULTS.hasOwnProperty(key)) {
                    currentSettings[key] = load(key, Config.DEFAULTS[key]);
                }
            }
            return currentSettings;
        }

        function saveAll(settingsObj) {
            for (var key in settingsObj) {
                if (settingsObj.hasOwnProperty(key)) {
                    save(key, settingsObj[key]);
                }
            }
        }

        return {
            loadAll: loadAll,
            saveAll: saveAll
        };
    })();

    // --- 3. MODEL (CORE LOGIC) ---
    var Model = (function () {

        function getOrCreateFolder(path, root) {
            // If root is provided, create relative to root. Otherwise absolute from project root.
            var current = root ? root : app.project.rootFolder;
            var parts = path.split("/");

            for (var i = 0; i < parts.length; i++) {
                var folderName = parts[i];
                if (folderName === "") continue;

                var found = null;
                for (var k = 1; k <= current.numItems; k++) {
                    var item = current.item(k);
                    if (item instanceof FolderItem && item.name === folderName) {
                        found = item;
                        break;
                    }
                }

                if (found) current = found;
                else current = current.items.addFolder(folderName);
            }
            return current;
        }

        function getUniqueName(name, folder) {
            var newName = name;
            var inc = 1;
            while (nameExists(newName, folder)) {
                var parts = name.lastIndexOf(".") > 0 ? name.split(".") : [name];
                var ext = parts.length > 1 ? "." + parts.pop() : "";
                newName = parts.join(".") + "_" + inc + ext;
                inc++;
            }
            return newName;
        }

        function nameExists(name, folder) {
            for (var i = 1; i <= folder.numItems; i++) {
                if (folder.item(i).name === name) return true;
            }
            return false;
        }

        function scan(rootFolder) {
            var results = { comps: [], solids: [], ren: [], footage: [], ill: [], images: [], psd: [], audio: [], others: [] };

            function recursiveScan(folder) {
                for (var i = 1; i <= folder.numItems; i++) {
                    var item = folder.item(i);
                    if (item instanceof FolderItem) {
                        recursiveScan(item);
                    } else if (item instanceof CompItem) {
                        results.comps.push(item);
                    } else if (item instanceof FootageItem) {
                        if (item.mainSource instanceof SolidSource) {
                            results.solids.push(item);
                        } else if (item.file) {
                            var ext = item.file.name.split('.').pop().toLowerCase();
                            var matched = false;

                            // Check against Config
                            for (var type in Config.FILE_TYPES) {
                                if (type === 'solids') continue; // Skip solids, handled above
                                var typeDef = Config.FILE_TYPES[type];
                                for (var e = 0; e < typeDef.exts.length; e++) {
                                    if (ext === typeDef.exts[e].toLowerCase()) {
                                        results[type].push(item);
                                        matched = true;
                                        break;
                                    }
                                }
                                if (matched) break;
                            }

                            if (!matched) results.others.push(item);
                        }
                    }
                }
            }
            recursiveScan(rootFolder);
            return results;
        }

        function process(scanResults, settings, rootFolder, progressCallback) {
            var stats = {
                moved: 0,
                flattened: 0,
                cleaned: 0,
                errors: 0,
                details: [] // For summary
            };

            var isDryRun = settings.dryRun;

            // Helper to "move"
            function moveItems(itemList, targetPath, typeLabel) {
                if (itemList.length === 0) return;

                var destFolder = null;
                if (!isDryRun) {
                    destFolder = getOrCreateFolder(targetPath, null); // Global move
                }

                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];

                    if (isDryRun) {
                        stats.details.push("[DRY RUN] Would move '" + item.name + "' -> " + targetPath);
                    } else {
                        try {
                            item.parentFolder = destFolder;
                            item.name = getUniqueName(item.name, destFolder);
                        } catch (e) {
                            stats.errors++;
                            stats.details.push("[ERROR] Failed to move '" + item.name + "': " + e.toString());
                        }
                    }
                    stats.moved++;
                    if (progressCallback) progressCallback();
                }
            }

            // Helper to flatten comps
            function flattenComps(itemList) {
                if (itemList.length === 0) return;

                var preCompFolder = null;

                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];
                    var destFolder;
                    var targetName = "Root";

                    if (item.name.match(/^pre[-_]?/i)) {
                        targetName = "Pre-Comps";
                        if (!isDryRun) {
                            if (!preCompFolder) preCompFolder = getOrCreateFolder("pre-comps", rootFolder);
                            destFolder = preCompFolder;
                        }
                    } else {
                        if (!isDryRun) destFolder = rootFolder;
                    }

                    if (isDryRun) {
                        stats.details.push("[DRY RUN] Would flatten Comp '" + item.name + "' -> " + targetName);
                    } else {
                        if (item.parentFolder.id !== destFolder.id) {
                            item.name = getUniqueName(item.name, destFolder);
                            item.parentFolder = destFolder;
                        }
                    }
                    stats.flattened++;
                    if (progressCallback) progressCallback();
                }
            }

            // Execute based on settings
            if (settings.ren) moveItems(scanResults.ren, Config.FILE_TYPES.ren.target, "3D");
            if (settings.footage) moveItems(scanResults.footage, Config.FILE_TYPES.footage.target, "Footage");
            if (settings.ill) moveItems(scanResults.ill, Config.FILE_TYPES.ill.target, "Vector");
            if (settings.images) moveItems(scanResults.images, Config.FILE_TYPES.images.target, "Images");
            if (settings.psd) moveItems(scanResults.psd, Config.FILE_TYPES.psd.target, "PSD");
            if (settings.audio) moveItems(scanResults.audio, Config.FILE_TYPES.audio.target, "Audio");
            if (settings.solids) moveItems(scanResults.solids, Config.FILE_TYPES.solids.target, "Solids");
            if (settings.comps) flattenComps(scanResults.comps);

            // Prune
            if (settings.prune) {
                if (isDryRun) {
                    stats.details.push("[DRY RUN] Would delete empty folders in selection.");
                    // Cannot easily count strictly in dry run without simulating the whole tree structure change
                } else {
                    var pruneCount = 0;
                    var pruneFunc = function (folder) {
                        if (folder.numItems > 0) {
                            for (var i = folder.numItems; i >= 1; i--) {
                                var item = folder.item(i);
                                if (item instanceof FolderItem) pruneFunc(item);
                            }
                        }
                        if (folder.numItems === 0 && folder.id !== rootFolder.id) {
                            folder.remove();
                            pruneCount++;
                        }
                    };
                    pruneFunc(rootFolder);
                    stats.cleaned = pruneCount;
                }
            }

            return stats;
        }

        return {
            scan: scan,
            process: process,
            processDryRun: function (scanResults, settings, rootFolder) {
                // Dry run logic is embedded in process via flag, cleaner than duplicating
                var dryRunSettings = {};
                for (var key in settings) dryRunSettings[key] = settings[key];
                dryRunSettings.dryRun = true;
                return process(scanResults, dryRunSettings, rootFolder, null);
            }
        };

    })();

    // --- 4. VIEW (UI) ---
    var View = (function () {
        var win, params = {};

        function build(initialSettings, callbacks) {
            win = new Window("palette", Config.SCRIPT_NAME, undefined, { resizeable: true });
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 10;
            win.margins = 10;

            // -- Brand --
            var scriptPath = (new File($.fileName)).parent;
            var bannerFile = new File(scriptPath.fsName + "/" + Config.BANNER_FILENAME);
            if (bannerFile.exists) {
                var img = win.add("image", undefined, bannerFile);
                img.alignment = ["center", "top"];
            } else {
                var pnlBanner = win.add("panel", [0, 0, 462, 50], "Asset Assassin");
                pnlBanner.alignment = ["fill", "top"];
            }

            // -- Selection Info --
            var pnlInfo = win.add("panel", undefined, "1. Target");
            pnlInfo.alignChildren = ["fill", "top"];
            params.stSelection = pnlInfo.add("statictext", undefined, "Select an import folder...", { multiline: true });

            // -- Categories --
            var pnlCats = win.add("panel", undefined, "2. Sort Strategy");
            pnlCats.alignChildren = ["left", "top"];
            pnlCats.margins = 15;

            pnlCats.add("statictext", undefined, "--- Move to GLOBAL Project Tree ---");

            // Helper to add checkbox with tooltip
            function addCb(label, prop, tooltip) {
                var cb = pnlCats.add("checkbox", undefined, label);
                cb.value = initialSettings[prop];
                if (tooltip) cb.helpTip = tooltip;
                params[prop] = cb;
            }

            addCb("3d ren", "ren", "Moves .exr, .dpx, .hdr sequences to Assets/3d ren");
            addCb("footage", "footage", "Moves .mov, .mp4, .mxf to Assets/footage");
            addCb("ill (vectors)", "ill", "Moves .ai, .eps, .svg to Assets/ill");
            addCb("images", "images", "Moves .jpg, .png, .tif to Assets/images");
            addCb("psd", "psd", "Moves .psd, .psb to Assets/psd");
            addCb("Audio", "audio", "Moves .wav, .mp3 to Assets/Audio");
            addCb("Solids", "solids", "Moves Solid items to the 'Solids' folder");

            pnlCats.add("statictext", undefined, "");
            pnlCats.add("statictext", undefined, "--- Stay LOCAL (Inside Target) ---");
            addCb("Comps (Flatten / Pre-comps)", "comps", "Flattens main comps to root, moves 'pre...' comps to 'pre-comps' folder.");

            // -- Options --
            var grpOpts = win.add("group");
            grpOpts.alignChildren = ["left", "center"];

            // Prune
            var cbPrune = grpOpts.add("checkbox", undefined, "Delete empty folders");
            cbPrune.value = initialSettings.prune;
            cbPrune.helpTip = "Deletes any subfolders that become empty after moving assets.";
            params.prune = cbPrune;

            // Summary
            var cbSummary = grpOpts.add("checkbox", undefined, "Show Summary");
            cbSummary.value = initialSettings.showSummary;
            cbSummary.helpTip = "Shows a detailed report after running.";
            params.showSummary = cbSummary;

            // Dry Run
            var cbDryRun = grpOpts.add("checkbox", undefined, "Simulate (Dry Run)");
            cbDryRun.value = initialSettings.dryRun;
            cbDryRun.helpTip = "Simulates the process without moving any files. Good for testing.";
            params.dryRun = cbDryRun;

            // -- Actions --
            var grpBtns = win.add("group");
            grpBtns.alignment = ["fill", "top"];
            var btnRun = grpBtns.add("button", undefined, "Scan & Organize");
            btnRun.enabled = false;
            params.btnRun = btnRun;

            // -- Update Logic --
            win.onActivate = callbacks.onActivate;
            btnRun.onClick = callbacks.onRun;

            return win;
        }

        function getParams() {
            // Harvest current UI state
            var current = {};
            for (var key in Config.DEFAULTS) {
                if (params[key]) current[key] = params[key].value;
            }
            return current;
        }

        function updateSelectionLabel(text, isValid) {
            params.stSelection.text = text;
            params.btnRun.enabled = isValid;
        }

        function showProgress(total) {
            var w = new Window("palette", "Organizing...", undefined, { closeButton: false });
            w.pnl = w.add("panel", [15, 15, 385, 100], "Progress");
            w.bar = w.pnl.add("progressbar", [20, 20, 350, 40], 0, total);
            w.txt = w.pnl.add("statictext", [20, 50, 350, 70], "Preparing...");
            w.cancelBtn = w.pnl.add("button", [240, 45, 340, 70], "Cancel");
            w.layout.layout(true);
            w.center();
            w.show();
            return w;
        }

        function showSummaryReport(stats, isDryRun) {
            var title = isDryRun ? "Simulation Report (DRY RUN)" : "Process Complete";
            var report = [
                "SUMMARY OF ACTIONS:",
                "------------------------------------------------",
                "• Moved Files: " + stats.moved,
                "• Flattened Comps: " + stats.flattened,
                "• Cleaned Folders: " + stats.cleaned,
                "• Errors: " + stats.errors,
                "",
                "------------------------------------------------"
            ];

            if (isDryRun && stats.details.length > 0) {
                report.push("DETAILS (First 20 items):");
                for (var i = 0; i < Math.min(stats.details.length, 20); i++) {
                    report.push(stats.details[i]);
                }
                if (stats.details.length > 20) report.push("... and " + (stats.details.length - 20) + " more.");
            }

            alert(title + "\n\n" + report.join("\n"));
        }

        return {
            build: build,
            getParams: getParams,
            updateSelectionLabel: updateSelectionLabel,
            showProgress: showProgress,
            showSummaryReport: showSummaryReport
        };
    })();

    // --- 5. CONTROLLER ---
    var Controller = (function () {
        var selectedRoot = null;
        var appSettings = {};

        function init() {
            // Load settings
            appSettings = Settings.loadAll();

            // Build UI
            var win = View.build(appSettings, {
                onActivate: updateSelection,
                onRun: handleRun
            });

            updateSelection();
            win.center();
            win.show();
        }

        function updateSelection() {
            if (!app.project) return;
            var sel = app.project.selection;
            if (sel.length === 1 && sel[0] instanceof FolderItem) {
                selectedRoot = sel[0];
                View.updateSelectionLabel("Target: \"" + selectedRoot.name + "\"", true);
            } else {
                selectedRoot = null;
                View.updateSelectionLabel("Please select exactly one folder.", false);
            }
        }

        function handleRun() {
            if (!selectedRoot) return;

            // Get latest UI values
            var currentSettings = View.getParams();

            // Save settings for next time
            Settings.saveAll(currentSettings);

            // Scan
            var scanResults = Model.scan(selectedRoot);

            // Calculate total work
            var totalToMove = 0;
            if (currentSettings.ren) totalToMove += scanResults.ren.length;
            if (currentSettings.footage) totalToMove += scanResults.footage.length;
            if (currentSettings.ill) totalToMove += scanResults.ill.length;
            if (currentSettings.images) totalToMove += scanResults.images.length;
            if (currentSettings.psd) totalToMove += scanResults.psd.length;
            if (currentSettings.audio) totalToMove += scanResults.audio.length;
            if (currentSettings.solids) totalToMove += scanResults.solids.length;
            if (currentSettings.comps) totalToMove += scanResults.comps.length;

            if (totalToMove === 0) {
                alert("No matching items found in selection.");
                return;
            }

            // Confirm
            if (!currentSettings.dryRun) {
                var confirmMsg = "About to process " + totalToMove + " items from '" + selectedRoot.name + "'.\nProceed?";
                if (!confirm(confirmMsg)) return;
            }

            // Setup Progress
            var progWin = View.showProgress(totalToMove);
            var cancelled = false;
            progWin.cancelBtn.onClick = function () { cancelled = true; progWin.close(); };

            // Process
            app.beginUndoGroup(Config.SCRIPT_NAME);
            try {
                var currentProgress = 0;
                var updateProgress = function () {
                    if (cancelled) throw "User Cancelled";
                    currentProgress++;
                    progWin.bar.value = currentProgress;
                    progWin.txt.text = "Processing: " + currentProgress + "/" + totalToMove;
                    progWin.update();
                };

                var stats = Model.process(scanResults, currentSettings, selectedRoot, updateProgress);

                progWin.close();

                if (currentSettings.showSummary) {
                    View.showSummaryReport(stats, currentSettings.dryRun);
                } else if (!currentSettings.dryRun) {
                    alert("Completed!");
                }

            } catch (e) {
                progWin.close();
                if (e !== "User Cancelled") alert("Error: " + e.toString());
            } finally {
                app.endUndoGroup();
            }
        }

        return { init: init };
    })();

    // --- START ---
    Controller.init();

})();
