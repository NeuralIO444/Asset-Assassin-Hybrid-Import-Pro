/*
    ASSET ASSASSIN: HYBRID IMPORT (BRANDED) - v3.0 [Refactored]
    
    Description:
    Modular MVC architecture with a dedicated "Dry Run" Scanner and Manifest system.
    
    Main Features:
    - Manifest-based State Management
    - Non-destructive Scanner Service
    - Terminal-style Dashboard View
*/

(function (global) {
    "use strict";

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
    if (!AP.indexOf) {
        AP.indexOf = function (searchElement, fromIndex) {
            if (this == null) throw new TypeError('"this" is null or not defined');
            var O = Object(this), len = O.length >>> 0;
            if (len === 0) return -1;
            var n = +fromIndex || 0;
            if (Math.abs(n) === Infinity) n = 0;
            if (n >= len) return -1;
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
            while (k < len) {
                if (k in O && O[k] === searchElement) return k;
                k++;
            }
            return -1;
        };
    }

    // --- 2. CONFIGURATION (CONSTANTS) ---
    var Config = {
        SCRIPT_NAME: "Asset Assassin: Hybrid v3",
        VERSION: "3.0",
        BANNER_FILENAME: "asset_assassin_banner.png",

        // Definition of file types and their sorting rules
        FILE_TYPES: {
            ren: { id: "ren", label: "3D RENDERS", exts: ['exr', 'dpx', 'hdr', 'rla', 'c4d'], target: "Assets/3d ren" },
            footage: { id: "footage", label: "FOOTAGE", exts: ['mov', 'mp4', 'avi', 'mxf', 'r3d', 'mpg'], target: "Assets/footage" },
            ill: { id: "ill", label: "VECTORS", exts: ['ai', 'eps', 'svg'], target: "Assets/ill" },
            images: { id: "images", label: "IMAGES", exts: ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'gif'], target: "Assets/images" },
            psd: { id: "psd", label: "PSD", exts: ['psd', 'psb'], target: "Assets/psd" },
            audio: { id: "audio", label: "AUDIO", exts: ['wav', 'mp3', 'aac', 'aif', 'aiff'], target: "Assets/Audio" }
        }
    };

    // --- 3. DOMAIN: MANIFEST ---
    var ManifestFactory = (function () {
        function create() {
            return {
                summary: { totalItems: 0, processedCount: 0, status: "IDLE" },
                categories: [
                    { id: "ren", label: "3D RENDERS", items: [], count: 0, action: "MOVE" },
                    { id: "footage", label: "FOOTAGE", items: [], count: 0, action: "MOVE" },
                    { id: "ill", label: "VECTORS", items: [], count: 0, action: "MOVE" },
                    { id: "images", label: "IMAGES", items: [], count: 0, action: "MOVE" },
                    { id: "psd", label: "PSD", items: [], count: 0, action: "MOVE" },
                    { id: "audio", label: "AUDIO", items: [], count: 0, action: "MOVE" },
                    { id: "solids", label: "SOLIDS", items: [], count: 0, action: "FLATTEN" },
                    { id: "comps", label: "COMPS", items: [], count: 0, action: "FLATTEN" }, // Root comps
                    { id: "precomps", label: "PRE-COMPS", items: [], count: 0, action: "MOVE" }, // Moving to 'pre-comps'
                    { id: "prune", label: "PRUNE", items: [], count: 0, action: "DELETE" }
                ],
                logs: []
            };
        }

        function log(manifest, msg) {
            var time = new Date().toTimeString().split(' ')[0];
            manifest.logs.push({ time: time, msg: msg });
        }

        return { create: create, log: log };
    })();

    // --- 4. SERVICE: SCANNER (DRY RUN LOGIC) ---
    var Scanner = (function () {

        function run(rootFolder, manifest) {
            ManifestFactory.log(manifest, "Scan started on: " + rootFolder.name);

            // Precompute category map for O(1) lookups
            var catMap = {};
            for (var i = 0, len = manifest.categories.length; i < len; i++) {
                catMap[manifest.categories[i].id] = manifest.categories[i];
            }

            // Precompute extension map for O(1) lookups
            var extMap = {};
            for (var key in Config.FILE_TYPES) {
                var typeDef = Config.FILE_TYPES[key];
                for (var e = 0, eLen = typeDef.exts.length; e < eLen; e++) {
                    extMap[typeDef.exts[e]] = typeDef.id;
                }
            }

            // Pre-compile Regex
            var preCompRegex = /^pre[-_]?/i;

            // Recursive function
            function traverse(folder) {
                var numItems = folder.numItems;
                for (var i = 1; i <= numItems; i++) {
                    var item = folder.item(i);
                    manifest.summary.totalItems++;

                    if (item instanceof FolderItem) {
                        traverse(item);
                        // Check for empty folder (Prune candidate)
                        if (item.numItems === 0) {
                            var cat = catMap["prune"];
                            if (cat) {
                                cat.items.push(item);
                                cat.count++;
                            }
                        }
                    } else if (item instanceof CompItem) {
                        // Check if it's a pre-comp
                        var catId = preCompRegex.test(item.name) ? "precomps" : "comps";
                        var cat = catMap[catId];
                        if (cat) { cat.items.push(item); cat.count++; }
                    } else if (item instanceof FootageItem) {
                        if (item.mainSource instanceof SolidSource) {
                            var cat = catMap["solids"];
                            if (cat) { cat.items.push(item); cat.count++; }
                        } else if (item.file) {
                            // File-based footage
                            var ext = item.file.name.split('.').pop().toLowerCase();
                            var catId = extMap[ext];
                            if (catId && catMap[catId]) {
                                catMap[catId].items.push(item);
                                catMap[catId].count++;
                            }
                        }
                    }
                }
            }

            traverse(rootFolder);
            ManifestFactory.log(manifest, "Scan completed. Processed " + manifest.summary.totalItems + " items.");
            manifest.summary.status = "SCANNED";

            return manifest;
        }

        return { run: run };
    })();

    // --- 5. VIEW: TERMINAL RENDERER ---
    var TerminalView = (function () {
        function render(manifest) {
            var lines = [
                "========================================",
                " ASSET ASSASSIN DASHBOARD (v" + Config.VERSION + ")",
                "========================================",
                ""
            ];

            manifest.categories.forEach(function (cat) {
                var label = cat.label;
                var countStr = "[ " + cat.count + " ]";
                var padding = Math.max(0, 40 - label.length - countStr.length);
                var dots = new Array(padding + 1).join(".");

                lines.push(label + " " + dots + " " + countStr);
            });

            lines.push(
                "",
                "----------------------------------------",
                "LOGS:"
            );

            manifest.logs.forEach(function (l) {
                lines.push("[" + l.time + "] " + l.msg);
            });

            return lines.join("\n");
        }

        return { render: render };
    })();

    // --- 6. MAIN VIEW (UI) ---
    var View = (function () {
        var win;
        var pnlTerminal;

        function build(callbacks) {
            win = new Window("palette", Config.SCRIPT_NAME, undefined, { resizeable: true });
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 10;
            win.margins = 10;

            // -- Selection Header --
            var grpHeader = win.add("group");
            grpHeader.add("statictext", undefined, "Refactoring Target:");
            var lblTarget = grpHeader.add("statictext", undefined, "Select a folder...");
            lblTarget.graphics.font = ScriptUI.newFont("Verdana", "Bold", 12);

            // -- Terminal Panel --
            var pnlTerm = win.add("panel", undefined, "Dry Run Dashboard");
            pnlTerm.alignChildren = ["fill", "fill"];
            pnlTerm.preferredSize = [400, 300];

            var txtTerminal = pnlTerm.add("edittext", undefined, "Ready to Scan...", { multiline: true, readonly: true });
            // Attempt to set a monospaced font if available, otherwise default system
            // Note: ScriptUI font support is limited across OS versions
            if (File.fs === "Windows") {
                txtTerminal.graphics.font = ScriptUI.newFont("Consolas", "Regular", 12);
            } else {
                txtTerminal.graphics.font = ScriptUI.newFont("Monaco", "Regular", 12);
            }

            // -- Actions --
            var grpActions = win.add("group");
            grpActions.alignment = ["right", "bottom"];
            var btnScan = grpActions.add("button", undefined, "SCAN (Dry Run)");

            btnScan.onClick = callbacks.onScan;

            // Store references
            win.lblTarget = lblTarget;
            win.txtTerminal = txtTerminal;
            win.btnScan = btnScan;

            win.onActivate = callbacks.onActivate;

            return win;
        }

        function updateTerminal(text) {
            if (win && win.txtTerminal) {
                win.txtTerminal.text = text;
            }
        }

        function updateTargetLabel(text, enabled) {
            if (win && win.lblTarget) win.lblTarget.text = text;
            if (win && win.btnScan) win.btnScan.enabled = enabled;
        }

        return {
            build: build,
            updateTerminal: updateTerminal,
            updateTargetLabel: updateTargetLabel
        };
    })();

    // --- 7. CONTROLLER ---
    var Controller = (function () {
        var selectedRoot = null;
        var currentManifest = null;

        function init() {
            var win = View.build({
                onActivate: updateSelection,
                onScan: handleScan
            });
            win.center();
            win.show();
            updateSelection();
        }

        function updateSelection() {
            if (!app.project) return;
            var sel = app.project.selection;
            if (sel.length === 1 && sel[0] instanceof FolderItem) {
                selectedRoot = sel[0];
                View.updateTargetLabel(selectedRoot.name, true);
            } else {
                selectedRoot = null;
                View.updateTargetLabel("Please select 1 folder", false);
            }
        }

        function handleScan() {
            if (!selectedRoot) return;

            // 1. Create fresh Manifest
            currentManifest = ManifestFactory.create();

            // 2. Run Scanner (Dry Run)
            // Note: In a real app we might want to do this in a "progress" bar callback, 
            // but scans are usually fast enough for a single blocking call unless huge.
            Scanner.run(selectedRoot, currentManifest);

            // 3. Render Result
            var report = TerminalView.render(currentManifest);
            View.updateTerminal(report);
        }

        return { init: init };
    })();

    // --- START ---
    Controller.init();

})(this);