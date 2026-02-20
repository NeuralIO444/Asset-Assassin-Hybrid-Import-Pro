/*
    ASSET ASSASSIN: HYBRID IMPORT (BRANDED) - v3.3 [Refactored Modular - UI Revert]
    
    Description:
    Modular MVC architecture with V2.0 Checkboxed UI Layout and persistent settings.
    Phase 2 Refactoring: Reverting btop dashboard back to V2 Layout.
    
    Main Features:
    - Modular lib/ Structure
    - Checkbox Selection with Tooltips
    - Persistent app.settings
    - Dry-run simulation with Summary Report Alerts
*/

//@include "lib/config.jsxinc"
//@include "lib/settings.jsxinc"
//@include "lib/utils.jsxinc"
//@include "lib/model.jsxinc"

(function (global) {
    "use strict";

    try {
        // --- 1. POLYFILLS (ES5 compatibility for ExtendScript) ---
        var AP = Array.prototype;
        if (!AP.forEach) {
            AP.forEach = function (callback, thisArg) {
                for (var i = 0, len = this.length; i < len; i++) callback.call(thisArg, this[i], i, this);
            };
        }
        if (!AP.map) {
            AP.map = function (callback, thisArg) {
                var len = this.length;
                var a = new Array(len);
                for (var i = 0; i < len; i++) a[i] = callback.call(thisArg, this[i], i, this);
                return a;
            };
        }
        if (!AP.filter) {
            AP.filter = function (callback, thisArg) {
                var a = [];
                for (var i = 0, len = this.length; i < len; i++) if (callback.call(thisArg, this[i], i, this)) a.push(this[i]);
                return a;
            };
        }

        // --- VIEW (UI) ---
        var View = (function () {
            var win, params = {};

            function build(initialSettings, callbacks) {
                var isPanel = (global instanceof Panel);
                win = isPanel ? global : new Window("palette", Config.SCRIPT_NAME, undefined, { resizeable: true });

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

                win.layout.layout(true);

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
                if (params.stSelection) params.stSelection.text = text;
                if (params.btnRun) params.btnRun.enabled = isValid;
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

        // --- CONTROLLER ---
        var Controller = (function () {
            var selectedRoot = null;
            var appSettings = {};
            var mainWindow = null;

            function init() {
                // Load settings from persistent storage using the Settings module
                appSettings = AppPrefs.loadAll();

                // Build UI
                mainWindow = View.build(appSettings, {
                    onActivate: updateSelection,
                    onRun: handleRun
                });

                if (mainWindow instanceof Window) {
                    mainWindow.center();
                    mainWindow.show();
                } else {
                    mainWindow.layout.layout(true);
                }

                global.assetAssassinUI = mainWindow;

                updateSelection();
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

                // Save settings for next time into persistent storage
                AppPrefs.saveAll(currentSettings);

                // Scan using Model module
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

                    // Process using Model module functions
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

    } catch (err) {
        alert("Asset Assassin failed to launch.\nError: " + err.toString() + "\nLine: " + err.line);
    }

})(this);
