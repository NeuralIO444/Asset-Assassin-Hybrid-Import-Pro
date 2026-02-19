/*
    ASSET ASSASSIN: HYBRID IMPORT (BRANDED)
    
    Description:
    1. ASSETS: Moves selected file types OUT of the import folder to the Global structure.
    2. COMPS: Flattens comps to the ROOT of the selected folder.
    3. PRE-COMPS: Detects "Pre/pre" prefix and moves them to a 'pre-comps' subfolder.
    4. BRANDING: Looks for 'asset_assassin_banner.png' in the script folder.
*/

(function () {
    // --- CONFIGURATION ---
    var SCRIPT_NAME = "Asset Assassin: Hybrid";
    var BANNER_FILENAME = "asset_assassin_banner.png"; // Put this png next to the script file
    
    // GLOBAL TARGETS
    var GLOBAL_ASSET_TARGETS = {
        solids:  "Solids",
        ren:     "Assets/3d ren",
        footage: "Assets/footage",
        ill:     "Assets/ill",
        images:  "Assets/images",
        psd:     "Assets/psd",
        audio:   "Assets/Audio",
        misc:    "Assets/Misc"
    };

    // --- HELPER FUNCTIONS ---
    function getOrCreateGlobalFolder(path) {
        if (!app.project) return null;
        var parts = path.split("/");
        var current = app.project.rootFolder;
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

    function getOrCreateSubFolder(parentItem, folderName) {
        for (var i = 1; i <= parentItem.numItems; i++) {
            var item = parentItem.item(i);
            if (item instanceof FolderItem && item.name === folderName) {
                return item;
            }
        }
        return parentItem.items.addFolder(folderName);
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

    // --- UI BUILDER ---
    var win = new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 10;

    // --- BRANDING HEADER ---
    var scriptPath = (new File($.fileName)).parent;
    var bannerFile = new File(scriptPath.fsName + "/" + BANNER_FILENAME);

    if (bannerFile.exists) {
        // Display the PNG if found
        var img = win.add("image", undefined, bannerFile);
        img.alignment = ["center", "top"];
    } else {
        // Display a Placeholder Panel if PNG is missing
        var pnlBanner = win.add("panel", [0, 0, 462, 262], "BRANDING PLACEHOLDER");
        pnlBanner.add("statictext", undefined, "Save '" + BANNER_FILENAME + "' next to script.");
        pnlBanner.alignment = ["center", "top"];
    }

    // DATA STATE
    var scanResults = { comps: [], solids: [], ren: [], footage: [], ill: [], images: [], psd: [], others: [] };
    var selectedRoot = null;

    // PANEL 1: SELECTION
    var pnlInfo = win.add("panel", undefined, "1. Target Folder");
    pnlInfo.alignChildren = ["fill", "top"];
    var stSelection = pnlInfo.add("statictext", undefined, "Select an import folder...", { multiline: true });
    
    // PANEL 2: CATEGORIES
    var pnlCats = win.add("panel", undefined, "2. Sort Strategy");
    pnlCats.alignChildren = ["left", "top"];
    pnlCats.margins = 15;
    
    pnlCats.add("statictext", undefined, "--- Move to GLOBAL Project Tree ---");
    var cbRen     = pnlCats.add("checkbox", undefined, "3d ren");
    var cbFootage = pnlCats.add("checkbox", undefined, "footage");
    var cbIll     = pnlCats.add("checkbox", undefined, "ill (vectors)");
    var cbImages  = pnlCats.add("checkbox", undefined, "images");
    var cbPsd     = pnlCats.add("checkbox", undefined, "psd");
    var cbSolids  = pnlCats.add("checkbox", undefined, "Solids");
    
    pnlCats.add("statictext", undefined, ""); 
    pnlCats.add("statictext", undefined, "--- Stay LOCAL (Inside Selected Folder) ---");
    var cbComps   = pnlCats.add("checkbox", undefined, "Comps (Flatten to Root / Pre-comps)");
    
    // Defaults
    cbRen.value = true;
    cbFootage.value = true;
    cbIll.value = true;
    cbImages.value = true;
    cbPsd.value = true;
    cbSolids.value = true;
    cbComps.value = true;

    // OPTIONS
    var grpOpts = win.add("group");
    var cbPrune = grpOpts.add("checkbox", undefined, "Delete empty folders after move");
    cbPrune.value = true;

    // PANEL 3: ACTION
    var btnScanAndRun = win.add("button", undefined, "Scan & Organize");
    btnScanAndRun.enabled = false;

    // --- LOGIC ---

    function updateSelectionStatus() {
        if (!app.project) return;
        var sel = app.project.selection;
        if (sel.length === 1 && sel[0] instanceof FolderItem) {
            selectedRoot = sel[0];
            stSelection.text = "Target: \"" + selectedRoot.name + "\"";
            btnScanAndRun.enabled = true;
        } else {
            selectedRoot = null;
            stSelection.text = "Please select exactly one folder.";
            btnScanAndRun.enabled = false;
        }
    }

    win.onActivate = updateSelectionStatus;

    // MAIN EXECUTION
    btnScanAndRun.onClick = function () {
        if (!selectedRoot) return;

        // 1. SCAN
        scanResults = { comps: [], solids: [], ren: [], footage: [], ill: [], images: [], psd: [], others: [] };
        
        function recursiveScan(folder) {
            for (var i = 1; i <= folder.numItems; i++) {
                var item = folder.item(i);
                if (item instanceof FolderItem) {
                    recursiveScan(item);
                } else if (item instanceof CompItem) {
                    scanResults.comps.push(item);
                } else if (item instanceof FootageItem) {
                    if (item.mainSource instanceof SolidSource) {
                        scanResults.solids.push(item);
                    } else if (item.file) {
                        var ext = item.file.name.split('.').pop().toLowerCase();
                        if (/^(psd|psb)$/.test(ext)) scanResults.psd.push(item);
                        else if (/^(ai|eps|svg)$/.test(ext)) scanResults.ill.push(item);
                        else if (/^(exr|dpx|hdr|rla|c4d)$/.test(ext)) scanResults.ren.push(item);
                        else if (/^(jpg|jpeg|png|tif|tiff|bmp|gif)$/.test(ext)) scanResults.images.push(item);
                        else if (/^(mov|mp4|avi|mxf|r3d|mpg)$/.test(ext)) scanResults.footage.push(item);
                        else scanResults.others.push(item);
                    }
                }
            }
        }
        recursiveScan(selectedRoot);

        // 2. COUNT
        var totalToMove = 0;
        if (cbRen.value) totalToMove += scanResults.ren.length;
        if (cbFootage.value) totalToMove += scanResults.footage.length;
        if (cbIll.value) totalToMove += scanResults.ill.length;
        if (cbImages.value) totalToMove += scanResults.images.length;
        if (cbPsd.value) totalToMove += scanResults.psd.length;
        if (cbSolids.value) totalToMove += scanResults.solids.length;
        if (cbComps.value) totalToMove += scanResults.comps.length;

        if (totalToMove === 0) {
            alert("No items found matching your selection.");
            return;
        }

        // 3. CONFIRMATION
        var confirmMsg = [
            "HYBRID SORT VERIFICATION",
            "",
            "Source: \"" + selectedRoot.name + "\"",
            "",
            "ACTION PLAN:",
            "• Move Assets (Ren, Ill, PSD, etc) -> GLOBAL Project Tree",
            "• Move Solids -> GLOBAL 'Solids' Folder",
            "• Flatten Comps -> '" + selectedRoot.name + "' Root",
            "  (Move 'Pre...' comps -> '" + selectedRoot.name + "/pre-comps')",
            "",
            "Items to process: " + totalToMove,
            "",
            "Proceed?"
        ].join("\n");

        if (!confirm(confirmMsg)) return;

        // 4. PROGRESS WINDOW
        var progressWin = new Window("palette", "Organizing...", undefined, {closeButton: false});
        progressWin.pnl = progressWin.add("panel", [15,15,385,100], "Progress");
        progressWin.bar = progressWin.pnl.add("progressbar", [20,20,350,40], 0, totalToMove);
        progressWin.txt = progressWin.pnl.add("statictext", [20,50,350,70], "Preparing...");
        progressWin.cancelBtn = progressWin.pnl.add("button", [240,45,340,70], "Cancel");
        progressWin.layout.layout(true);
        progressWin.center();
        
        var cancelled = false;
        progressWin.cancelBtn.onClick = function () { cancelled = true; progressWin.close(); };
        progressWin.show();

        app.beginUndoGroup(SCRIPT_NAME);
        
        try {
            var currentProgress = 0;

            function checkCancel() {
                if (cancelled) throw "User cancelled";
            }

            // --- MOVERS ---
            function moveGlobal(itemList, targetPath, label) {
                if (cancelled) return;
                var destFolder = getOrCreateGlobalFolder(targetPath);
                
                for (var i = 0; i < itemList.length; i++) {
                    checkCancel();
                    var item = itemList[i];
                    item.parentFolder = destFolder;
                    item.name = getUniqueName(item.name, destFolder);
                    
                    currentProgress++;
                    progressWin.bar.value = currentProgress;
                    progressWin.txt.text = "Global Move (" + label + "): " + currentProgress + "/" + totalToMove;
                    progressWin.update();
                }
            }

            function flattenComps(itemList) {
                if (cancelled) return;
                var preCompFolder = null; 

                for (var i = 0; i < itemList.length; i++) {
                    checkCancel();
                    var item = itemList[i];
                    var destFolder;

                    if (item.name.match(/^pre[-_]?/i)) {
                        if (!preCompFolder) preCompFolder = getOrCreateSubFolder(selectedRoot, "pre-comps");
                        destFolder = preCompFolder;
                    } else {
                        destFolder = selectedRoot;
                    }

                    if (item.parentFolder.id !== destFolder.id) {
                        item.name = getUniqueName(item.name, destFolder);
                        item.parentFolder = destFolder;
                    }

                    currentProgress++;
                    progressWin.bar.value = currentProgress;
                    progressWin.txt.text = "Flattening Comps: " + currentProgress + "/" + totalToMove;
                    progressWin.update();
                }
            }

            // EXECUTE
            if (cbRen.value) moveGlobal(scanResults.ren, GLOBAL_ASSET_TARGETS.ren, "3D");
            if (cbFootage.value) moveGlobal(scanResults.footage, GLOBAL_ASSET_TARGETS.footage, "Footage");
            if (cbIll.value) moveGlobal(scanResults.ill, GLOBAL_ASSET_TARGETS.ill, "Vector");
            if (cbImages.value) moveGlobal(scanResults.images, GLOBAL_ASSET_TARGETS.images, "Images");
            if (cbPsd.value) moveGlobal(scanResults.psd, GLOBAL_ASSET_TARGETS.psd, "PSD");
            if (cbSolids.value) moveGlobal(scanResults.solids, GLOBAL_ASSET_TARGETS.solids, "Solids");
            if (cbComps.value) flattenComps(scanResults.comps);

            if (cancelled) throw "User cancelled";

            // PRUNE
            if (cbPrune.value) {
                progressWin.txt.text = "Cleaning empty folders...";
                progressWin.update();
                var prune = function(folder) {
                    if (folder.numItems > 0) {
                        for (var i = folder.numItems; i >= 1; i--) {
                            var item = folder.item(i);
                            if (item instanceof FolderItem) prune(item);
                        }
                    }
                    if (folder.numItems === 0 && folder.id !== selectedRoot.id) folder.remove();
                };
                prune(selectedRoot);
            }

            progressWin.close();
            alert("✅ Hybrid Sort Complete!");

        } catch (e) {
            progressWin.close();
            if (e !== "User cancelled") alert("Error: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    };

    updateSelectionStatus();
    win.center();
    win.show();
})();