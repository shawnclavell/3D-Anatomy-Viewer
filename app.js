/* ==========================================================================
   Anatomy Viewer Engine
   One shell, any model — controlled entirely by a JSON config file.

   URL usage:
     index.html?model=skeleton
   loads:
     models/skeleton.config.json

   FEATURES
     * Camera preset buttons generated from config
     * Click-to-select any bone (highlight + name readout)
     * Searchable bone index built from the model's materials
     * Isolate / Ghost to study one structure in context
     * Typed landmark / origin / insertion annotations
     * Author Mode with live preview and JSON export
     * PNG download of the current camera view
     * Student Freeze & Mark Up mode with drawing, text, undo, and PNG export

   HOW SELECTION WORKS (and its one limitation)
     <model-viewer> exposes materials, not individual meshes. Selection uses
     materialFromPoint(), so anything sharing a glTF material is selected as a
     unit. In the Z-Anatomy skeleton, mirrored .l bones share a material with their
     .r twin — so clicking the left femur highlights BOTH femurs. If you need
     true per-side isolation, each object needs its own material (a Blender
     step), and this code will pick that up automatically with no changes.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------- Settings */

  // Colour applied to the selected bone.
  //
  // These are LINEAR colour values (0-1), matching the glTF spec — they are
  // NOT the same numbers as a hex/sRGB colour. The values below correspond to
  // roughly #C0392B, a deep crimson.
  //
  //   deeper / darker red ..... [0.32, 0.02, 0.01]
  //   brighter fire red ....... [0.70, 0.06, 0.03]
  //   surgical blue ........... [0.03, 0.15, 0.45]
  //   teaching green .......... [0.05, 0.35, 0.12]
  var HIGHLIGHT_COLOR = [0.45, 0.03, 0.02];

  // A little self-illumination so the selected bone stays readable even when
  // it falls into shadow. Keep this low or the colour washes out.
  var HIGHLIGHT_EMISSIVE = [0.10, 0.005, 0.0];

  // Alpha applied to non-selected bones in "Ghost Others" mode.
  var GHOST_ALPHA = 0.07;

  // How far the pointer may move (px) between down and up and still count as
  // a click rather than a camera drag.
  var CLICK_SLOP = 5;

  /* ------------------------------------------------------------- Elements */

  var app            = document.querySelector(".app");
  var stage          = document.querySelector(".stage");
  var viewer         = document.getElementById("viewer");
  var modelTitle     = document.getElementById("modelTitle");
  var modelPicker    = document.getElementById("modelPicker");
  var presetList     = document.getElementById("presetList");
  var hotspotList    = document.getElementById("hotspotList");
  var annotationFilters = document.getElementById("annotationFilters");
  var boneList       = document.getElementById("boneList");
  var boneSearch     = document.getElementById("boneSearch");
  var boneCount      = document.getElementById("boneCount");
  var selectionName  = document.getElementById("selectionName");
  var isolateBtn     = document.getElementById("isolateBtn");
  var ghostBtn       = document.getElementById("ghostBtn");
  var showAllBtn     = document.getElementById("showAllBtn");
  var resetBtn       = document.getElementById("resetBtn");
  var downloadViewBtn = document.getElementById("downloadViewBtn");
  var markupModeBtn  = document.getElementById("markupModeBtn");
  var authorModeBtn  = document.getElementById("authorModeBtn");
  var authorBanner   = document.getElementById("authorBanner");
  var authorPanel    = document.getElementById("authorPanel");
  var authorSnippet  = document.getElementById("authorSnippet");
  var annotationType = document.getElementById("annotationType");
  var annotationLabel = document.getElementById("annotationLabel");
  var annotationMuscle = document.getElementById("annotationMuscle");
  var annotationDescription = document.getElementById("annotationDescription");
  var previewAnnotationBtn = document.getElementById("previewAnnotationBtn");
  var copySnippetBtn = document.getElementById("copySnippetBtn");
  var downloadAnnotationsBtn = document.getElementById("downloadAnnotationsBtn");
  var loadingOverlay = document.getElementById("loadingOverlay");
  var loadingText    = document.getElementById("loadingText");
  var stageHint      = document.getElementById("stageHint");
  var markupWorkspace = document.getElementById("markupWorkspace");
  var markupCanvas   = document.getElementById("markupCanvas");
  var markupPenBtn   = document.getElementById("markupPenBtn");
  var markupTextBtn  = document.getElementById("markupTextBtn");
  var markupColor    = document.getElementById("markupColor");
  var markupSize     = document.getElementById("markupSize");
  var markupText     = document.getElementById("markupText");
  var markupUndoBtn  = document.getElementById("markupUndoBtn");
  var markupClearBtn = document.getElementById("markupClearBtn");
  var downloadMarkupBtn = document.getElementById("downloadMarkupBtn");
  var resume3dBtn    = document.getElementById("resume3dBtn");
  var markupStatus   = document.getElementById("markupStatus");

  /* ---------------------------------------------------------------- State */

  var config         = null;
  var defaultOrbit   = null;
  var defaultTarget  = null;
  var defaultPresetButton = null;
  var authorModeOn   = false;
  var markupModeOn   = false;
  var markupTool     = "pen";
  var markupOperations = [];
  var currentStroke  = null;
  var isDrawingMarkup = false;
  var markupHadCameraControls = true;
  var markupHintWasHidden = false;
  var hotspotCounter = 0;
  var hotspotData    = [];
  var pendingPoint   = null;
  var pendingAnnotation = null;
  var annotationVisibility = {
    landmark: true,
    origin: true,
    insertion: true,
    note: true
  };

  // Snapshot of every material's original look, so we can always restore.
  // { name, material, baseColor:[r,g,b,a], emissive:[r,g,b], alphaMode }
  var materialStates = [];
  var selectedName   = null;
  var viewMode       = "all";   // "all" | "isolate" | "ghost"

  /* ------------------------------------------------------------- Bootstrap */

  function getModelParam() {
    return new URLSearchParams(window.location.search).get("model") || "skeleton";
  }

  function init() {
    var modelKey = getModelParam();
    modelPicker.value = modelKey;

    var configUrl = "models/" + modelKey + ".config.json";

    // Config files are tiny and frequently tuned during local authoring.
    // Avoid stale camera presets after a reload; the GLB itself remains
    // explicitly cache-busted through its config URL when needed.
    fetch(configUrl, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (cfg) {
        config = cfg;
        applyConfig(cfg);
      })
      .catch(function () {
        showFatalError(
          'Could not load config for "' + modelKey + '".',
          "Expected a valid JSON file at: " + configUrl
        );
      });
  }

  modelPicker.addEventListener("change", function () {
    var url = new URL(window.location.href);
    url.searchParams.set("model", modelPicker.value);
    url.searchParams.delete("review");
    url.searchParams.delete("viewer");
    window.location.assign(url.toString());
  });

  function showFatalError(headline, detail) {
    loadingOverlay.classList.remove("is-hidden");
    loadingText.textContent = headline;
    modelTitle.textContent = "Error";
    var detailEl = document.createElement("div");
    detailEl.className = "loading__detail";
    detailEl.textContent = detail;
    loadingOverlay.appendChild(detailEl);
  }

  /* ---------------------------------------------------------- Apply config */

  function applyConfig(cfg) {
    modelTitle.textContent = cfg.label || "Untitled Specimen";
    document.title = cfg.label ? cfg.label + " — Anatomy Viewer" : "Anatomy Viewer";

    viewer.setAttribute("alt", cfg.alt || cfg.label || "3D anatomical model");

    viewer.addEventListener("load", onModelLoaded, { once: true });
    viewer.addEventListener("error", onModelError, { once: true });

    viewer.src = cfg.glb;

    buildPresetList(cfg.cameraPresets || []);
    buildHotspots(cfg.hotspots || []);
  }

  function onModelLoaded() {
    var configuredDefault = applyConfiguredDefaultPreset();

    defaultOrbit = configuredDefault
      ? configuredDefault.orbit
      : (viewer.getCameraOrbit ? viewer.getCameraOrbit().toString() : viewer.cameraOrbit);
    defaultTarget = configuredDefault && configuredDefault.target
      ? configuredDefault.target
      : (viewer.getCameraTarget ? viewer.getCameraTarget().toString() : viewer.cameraTarget);

    snapshotMaterials();
    buildBoneList();

    markupModeBtn.disabled = false;
    loadingOverlay.classList.add("is-hidden");
  }

  function onModelError() {
    showFatalError("The 3D file failed to load.", config ? config.glb : "");
  }

  /* ---------------------------------------------------------- Camera views */

  function applyCamera(orbit, target) {
    if (orbit) {
      viewer.setAttribute("camera-orbit", orbit);
      viewer.cameraOrbit = orbit;
    }
    if (target) {
      viewer.setAttribute("camera-target", target);
      viewer.cameraTarget = target;
    }
  }

  function applyConfiguredDefaultPreset() {
    var presets = config && config.cameraPresets;
    var index = config && config.defaultPreset;

    if (!Array.isArray(presets) || !Number.isInteger(index) || !presets[index]) {
      return null;
    }

    var preset = presets[index];
    applyCamera(preset.orbit, preset.target);

    defaultPresetButton = presetList.querySelectorAll(".preset-btn")[index] || null;
    setActivePreset(defaultPresetButton);
    return preset;
  }

  function buildPresetList(presets) {
    presetList.innerHTML = "";

    if (!presets.length) {
      presetList.innerHTML = '<li class="empty-note">No preset views defined yet.</li>';
      return;
    }

    presets.forEach(function (preset, index) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.className = "preset-btn";
      btn.type = "button";

      var num = document.createElement("span");
      num.className = "preset-btn__index";
      num.textContent = String(index + 1).padStart(2, "0");

      var label = document.createElement("span");
      label.textContent = preset.name;

      btn.appendChild(num);
      btn.appendChild(label);

      btn.addEventListener("click", function () {
        applyCamera(preset.orbit, preset.target);
        setActivePreset(btn);
      });

      li.appendChild(btn);
      presetList.appendChild(li);
    });
  }

  function setActivePreset(activeBtn) {
    Array.prototype.forEach.call(
      presetList.querySelectorAll(".preset-btn"),
      function (b) { b.classList.remove("is-active"); }
    );
    if (activeBtn) activeBtn.classList.add("is-active");
  }

  resetBtn.addEventListener("click", function () {
    applyCamera(defaultOrbit, defaultTarget);
    setActivePreset(defaultPresetButton);
  });

  downloadViewBtn.addEventListener("click", function () {
    var original = downloadViewBtn.textContent;
    downloadViewBtn.disabled = true;
    downloadViewBtn.textContent = "Rendering PNG…";

    captureViewerBlob()
      .then(function (blob) {
        downloadBlob(blob, slugify(config && config.label || "anatomy-model") + "-view.png");
        downloadViewBtn.textContent = "Downloaded (" + formatFileSize(blob.size) + ")";
      })
      .catch(function () {
        downloadViewBtn.textContent = "Download failed";
      })
      .then(function () {
        window.setTimeout(function () {
          downloadViewBtn.disabled = false;
          downloadViewBtn.textContent = original;
        }, 1400);
      });
  });

  function captureViewerBlob() {
    if (typeof viewer.toBlob === "function") {
      return viewer.toBlob({ mimeType: "image/png", idealAspect: false });
    }

    // Older model-viewer builds expose either toDataURL() or only the
    // internal display canvas. Keep both fallbacks so image export remains
    // available without forcing every deployed course page to upgrade at once.
    if (typeof viewer.toDataURL === "function") {
      return fetch(viewer.toDataURL("image/png")).then(function (response) {
        return response.blob();
      });
    }

    var canvas = viewer.shadowRoot && viewer.shadowRoot.querySelector("canvas");
    if (canvas && typeof canvas.toBlob === "function") {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Canvas capture returned no image."));
        }, "image/png");
      });
    }

    if (canvas && typeof canvas.toDataURL === "function") {
      return fetch(canvas.toDataURL("image/png")).then(function (response) {
        return response.blob();
      });
    }

    return Promise.reject(new Error("Image capture is unavailable in this browser."));
  }

  /* ------------------------------------------------------ Student markup */

  markupModeBtn.addEventListener("click", function () {
    if (markupModeOn) exitMarkupMode();
    else enterMarkupMode();
  });

  resume3dBtn.addEventListener("click", exitMarkupMode);

  function enterMarkupMode() {
    setAuthorMode(false);
    markupModeOn = true;
    markupOperations = [];
    currentStroke = null;
    isDrawingMarkup = false;
    markupHadCameraControls = viewer.hasAttribute("camera-controls");
    markupHintWasHidden = stageHint.classList.contains("is-hidden");

    if (markupHadCameraControls) viewer.removeAttribute("camera-controls");
    viewer.blur();
    setFrozenStudyControls(true);

    app.classList.add("is-markup");
    stage.classList.add("is-markup");
    stageHint.classList.add("is-hidden");
    markupWorkspace.hidden = false;
    markupModeBtn.classList.add("btn--active");
    markupModeBtn.setAttribute("aria-pressed", "true");
    markupModeBtn.textContent = "Resume 3D";

    setMarkupTool("pen");
    resizeMarkupCanvas();
    updateMarkupControls();
    setMarkupStatus("View frozen. Pen ready — draw directly on the anatomy view.");
  }

  function exitMarkupMode() {
    if (!markupModeOn) return;

    markupModeOn = false;
    isDrawingMarkup = false;
    currentStroke = null;
    markupOperations = [];

    if (markupHadCameraControls) viewer.setAttribute("camera-controls", "");
    setFrozenStudyControls(false);

    app.classList.remove("is-markup");
    stage.classList.remove("is-markup");
    if (!markupHintWasHidden) stageHint.classList.remove("is-hidden");
    markupWorkspace.hidden = true;
    markupModeBtn.classList.remove("btn--active");
    markupModeBtn.setAttribute("aria-pressed", "false");
    markupModeBtn.textContent = "Freeze & Mark Up";
    updateMarkupControls();
  }

  var frozenControlStates = [];

  function setFrozenStudyControls(frozen) {
    Array.prototype.forEach.call(
      document.querySelectorAll(".sidebar__section"),
      function (section) {
        if (frozen) section.setAttribute("inert", "");
        else section.removeAttribute("inert");
      }
    );

    var controls = [resetBtn, downloadViewBtn, authorModeBtn];
    if (frozen) {
      frozenControlStates = controls.map(function (control) {
        return { control: control, disabled: control.disabled };
      });
      controls.forEach(function (control) { control.disabled = true; });
    } else {
      frozenControlStates.forEach(function (item) {
        item.control.disabled = item.disabled;
      });
      frozenControlStates = [];
    }
  }

  function setMarkupTool(tool) {
    markupTool = tool;
    var penActive = tool === "pen";
    markupPenBtn.classList.toggle("is-active", penActive);
    markupPenBtn.setAttribute("aria-pressed", penActive ? "true" : "false");
    markupTextBtn.classList.toggle("is-active", !penActive);
    markupTextBtn.setAttribute("aria-pressed", penActive ? "false" : "true");
    markupWorkspace.classList.toggle("is-text-mode", !penActive);

    if (penActive) {
      setMarkupStatus("Pen ready. Draw directly on the frozen view.");
    } else {
      setMarkupStatus("Text ready. Type a label, then click where it belongs.");
      markupText.focus();
    }
  }

  markupPenBtn.addEventListener("click", function () { setMarkupTool("pen"); });
  markupTextBtn.addEventListener("click", function () { setMarkupTool("text"); });

  function resizeMarkupCanvas() {
    if (!markupModeOn) return;
    var rect = markupCanvas.getBoundingClientRect();
    var ratio = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(rect.width * ratio));
    var height = Math.max(1, Math.round(rect.height * ratio));

    if (markupCanvas.width !== width || markupCanvas.height !== height) {
      markupCanvas.width = width;
      markupCanvas.height = height;
    }
    renderMarkup();
  }

  function getMarkupPoint(event) {
    var rect = markupCanvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  markupCanvas.addEventListener("pointerdown", function (event) {
    if (!markupModeOn || event.button !== 0) return;
    event.preventDefault();

    if (markupTool === "text") {
      placeMarkupText(getMarkupPoint(event));
      return;
    }

    isDrawingMarkup = true;
    currentStroke = {
      type: "stroke",
      color: markupColor.value,
      size: Number(markupSize.value),
      points: [getMarkupPoint(event)]
    };
    markupCanvas.setPointerCapture(event.pointerId);
    renderMarkup();
  });

  markupCanvas.addEventListener("pointermove", function (event) {
    if (!isDrawingMarkup || !currentStroke) return;
    event.preventDefault();
    currentStroke.points.push(getMarkupPoint(event));
    renderMarkup();
  });

  function finishMarkupStroke(event) {
    if (!isDrawingMarkup || !currentStroke) return;
    event.preventDefault();
    isDrawingMarkup = false;
    markupOperations.push(currentStroke);
    currentStroke = null;
    renderMarkup();
    updateMarkupControls();
    setMarkupStatus("Stroke added. Undo, add text, or download the marked view.");
  }

  markupCanvas.addEventListener("pointerup", finishMarkupStroke);
  markupCanvas.addEventListener("pointercancel", finishMarkupStroke);

  function placeMarkupText(point) {
    var text = markupText.value.trim();
    if (!text) {
      setMarkupStatus("Type text in the toolbar first, then click the view to place it.");
      markupText.focus();
      return;
    }

    markupOperations.push({
      type: "text",
      color: markupColor.value,
      size: Number(markupSize.value),
      text: text,
      point: point
    });
    renderMarkup();
    updateMarkupControls();
    setMarkupStatus('Placed “' + text + '”. Click again to repeat it, or type a new label.');
  }

  function renderMarkup() {
    var context = markupCanvas.getContext("2d");
    var ratio = window.devicePixelRatio || 1;
    var cssWidth = markupCanvas.width / ratio;
    var cssHeight = markupCanvas.height / ratio;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, markupCanvas.width, markupCanvas.height);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    markupOperations.forEach(function (operation) {
      drawMarkupOperation(context, operation, cssWidth, cssHeight);
    });
    if (currentStroke) drawMarkupOperation(context, currentStroke, cssWidth, cssHeight);
  }

  function drawMarkupOperation(context, operation, width, height) {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = operation.color;
    context.fillStyle = operation.color;

    if (operation.type === "stroke") {
      context.lineWidth = operation.size;
      context.beginPath();
      operation.points.forEach(function (point, index) {
        var x = point.x * width;
        var y = point.y * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      if (operation.points.length === 1) {
        var onlyPoint = operation.points[0];
        context.arc(onlyPoint.x * width, onlyPoint.y * height, operation.size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.stroke();
      }
    } else if (operation.type === "text") {
      var fontSize = 15 + operation.size * 1.8;
      var x = operation.point.x * width;
      var y = operation.point.y * height;
      context.font = "600 " + fontSize + "px system-ui, sans-serif";
      context.textBaseline = "top";
      context.lineWidth = Math.max(3, fontSize / 6);
      context.strokeStyle = "rgba(8, 10, 12, 0.88)";
      context.strokeText(operation.text, x, y, Math.max(40, width - x - 8));
      context.fillText(operation.text, x, y, Math.max(40, width - x - 8));
    }
    context.restore();
  }

  markupUndoBtn.addEventListener("click", function () {
    if (!markupOperations.length) return;
    markupOperations.pop();
    renderMarkup();
    updateMarkupControls();
    setMarkupStatus(markupOperations.length ? "Last mark removed." : "Canvas is clear.");
  });

  markupClearBtn.addEventListener("click", function () {
    markupOperations = [];
    currentStroke = null;
    renderMarkup();
    updateMarkupControls();
    setMarkupStatus("Canvas cleared. Pen ready.");
  });

  function updateMarkupControls() {
    var empty = markupOperations.length === 0;
    markupUndoBtn.disabled = empty;
    markupClearBtn.disabled = empty;
  }

  function setMarkupStatus(message) {
    markupStatus.textContent = message;
  }

  downloadMarkupBtn.addEventListener("click", function () {
    var original = downloadMarkupBtn.textContent;
    downloadMarkupBtn.disabled = true;
    downloadMarkupBtn.textContent = "Rendering…";
    setMarkupStatus("Preparing the marked-up PNG…");

    captureViewerBlob()
      .then(loadBlobImage)
      .then(function (image) {
        var output = document.createElement("canvas");
        output.width = markupCanvas.width;
        output.height = markupCanvas.height;
        var context = output.getContext("2d");
        context.fillStyle = "#111417";
        context.fillRect(0, 0, output.width, output.height);
        context.drawImage(image, 0, 0, output.width, output.height);
        context.drawImage(markupCanvas, 0, 0, output.width, output.height);

        return new Promise(function (resolve, reject) {
          output.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error("Markup export returned no image."));
          }, "image/png");
        });
      })
      .then(function (blob) {
        var filename = slugify(config && config.label || "anatomy-model") + "-marked-view.png";
        downloadBlob(blob, filename);
        downloadMarkupBtn.textContent = "Downloaded (" + formatFileSize(blob.size) + ")";
        setMarkupStatus("Marked view downloaded. Resume 3D when you are finished.");
      })
      .catch(function () {
        downloadMarkupBtn.textContent = "Download failed";
        setMarkupStatus("The browser could not export this view. Your on-screen marks are still here.");
      })
      .then(function () {
        window.setTimeout(function () {
          downloadMarkupBtn.disabled = false;
          downloadMarkupBtn.textContent = original;
        }, 1600);
      });
  });

  function loadBlobImage(blob) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var url = URL.createObjectURL(blob);
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read captured viewer image."));
      };
      image.src = url;
    });
  }

  window.addEventListener("resize", function () {
    if (markupModeOn) resizeMarkupCanvas();
  });

  document.addEventListener("keydown", function (event) {
    if (markupModeOn && event.key === "Escape") exitMarkupMode();
  });

  /* ====================================================================
     MATERIALS — selection, highlighting, isolation
     ==================================================================== */

  function snapshotMaterials() {
    materialStates = [];

    if (!viewer.model || !viewer.model.materials) {
      return;
    }

    viewer.model.materials.forEach(function (mat) {
      var pbr = mat.pbrMetallicRoughness;
      var base = pbr && pbr.baseColorFactor
        ? Array.prototype.slice.call(pbr.baseColorFactor)
        : [1, 1, 1, 1];

      var emissive = mat.emissiveFactor
        ? Array.prototype.slice.call(mat.emissiveFactor)
        : [0, 0, 0];

      var alphaMode = "OPAQUE";
      try {
        if (mat.getAlphaMode) alphaMode = mat.getAlphaMode();
        else if (mat.alphaMode) alphaMode = mat.alphaMode;
      } catch (e) { /* keep default */ }

      materialStates.push({
        name: mat.name || "(unnamed material)",
        material: mat,
        baseColor: base,
        emissive: emissive,
        alphaMode: alphaMode
      });
    });
  }

  function prettifyName(raw) {
    return raw
      .replace(/\.\d{3}$/, "")            // strip Blender's .001 suffix
      .replace(/_/g, " ")
      .replace(/\.r$/i, " (right)")
      .replace(/\.l$/i, " (left)")
      .trim();
  }

  function setEmissive(state, rgb) {
    try {
      state.material.setEmissiveFactor(rgb);
    } catch (e) { /* material may not support it */ }
  }

  /**
   * Apply a look to one material.
   *   rgb   - [r,g,b] linear colour, or null to keep the material's own colour
   *   alpha - 0..1 opacity
   */
  function applyLook(state, rgb, alpha) {
    var pbr = state.material.pbrMetallicRoughness;
    if (!pbr) return;

    var c = rgb || state.baseColor;

    try {
      if (alpha < 1) {
        state.material.setAlphaMode("BLEND");
      } else {
        state.material.setAlphaMode(state.alphaMode);
      }
      pbr.setBaseColorFactor([c[0], c[1], c[2], alpha]);
    } catch (e) { /* ignore */ }
  }

  function highlight(state) {
    applyLook(state, HIGHLIGHT_COLOR, 1);
    setEmissive(state, HIGHLIGHT_EMISSIVE);
  }

  function restoreMaterial(state) {
    setEmissive(state, state.emissive);
    applyLook(state, null, state.baseColor.length > 3 ? state.baseColor[3] : 1);
  }

  function restoreAll() {
    materialStates.forEach(restoreMaterial);
  }

  /* -------------------------------------------------------- Selection API */

  function selectByName(name, options) {
    options = options || {};

    selectedName = name;

    // Reset every material, then re-apply the current view mode.
    restoreAll();

    var state = findState(name);

    if (!state) {
      clearSelection();
      return;
    }

    highlight(state);

    selectionName.textContent = prettifyName(state.name);
    selectionName.classList.remove("selection__name--empty");

    isolateBtn.disabled = false;
    ghostBtn.disabled = false;
    showAllBtn.disabled = false;

    markBoneListActive(name);

    // Re-apply isolate/ghost around the NEW selection if one was active.
    if (viewMode === "isolate") applyIsolate(false);
    else if (viewMode === "ghost") applyIsolate(true);

    if (options.scrollIntoView !== false) {
      var el = boneList.querySelector('[data-mat="' + cssEscape(name) + '"]');
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: "nearest" });
      }
    }

    hideStageHint();
  }

  function findState(name) {
    for (var i = 0; i < materialStates.length; i++) {
      if (materialStates[i].name === name) return materialStates[i];
    }
    return null;
  }

  function clearSelection() {
    selectedName = null;
    selectionName.textContent = "Click a bone in the model";
    selectionName.classList.add("selection__name--empty");
    isolateBtn.disabled = true;
    ghostBtn.disabled = true;
    markBoneListActive(null);
  }

  function applyIsolate(ghost) {
    if (!selectedName) return;

    materialStates.forEach(function (state) {
      if (state.name === selectedName) {
        highlight(state);
      } else {
        applyLook(state, null, ghost ? GHOST_ALPHA : 0);
      }
    });

    viewMode = ghost ? "ghost" : "isolate";
    isolateBtn.classList.toggle("btn--active", viewMode === "isolate");
    ghostBtn.classList.toggle("btn--active", viewMode === "ghost");
    showAllBtn.disabled = false;
  }

  function showAll() {
    viewMode = "all";
    restoreAll();

    if (selectedName) {
      var state = findState(selectedName);
      if (state) highlight(state);
    }

    isolateBtn.classList.remove("btn--active");
    ghostBtn.classList.remove("btn--active");
  }

  isolateBtn.addEventListener("click", function () {
    if (viewMode === "isolate") showAll();
    else applyIsolate(false);
  });

  ghostBtn.addEventListener("click", function () {
    if (viewMode === "ghost") showAll();
    else applyIsolate(true);
  });

  showAllBtn.addEventListener("click", showAll);

  /* ------------------------------------------------------------ Bone index */

  function buildBoneList() {
    boneList.innerHTML = "";

    if (!materialStates.length) {
      boneList.innerHTML =
        '<li class="empty-note">No materials found in this model, so click-to-select is unavailable.</li>';
      boneCount.textContent = "";
      boneSearch.style.display = "none";
      return;
    }

    boneCount.textContent = "(" + materialStates.length + ")";

    var sorted = materialStates.slice().sort(function (a, b) {
      return prettifyName(a.name).localeCompare(prettifyName(b.name));
    });

    sorted.forEach(function (state) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.className = "bone-btn";
      btn.type = "button";
      btn.dataset.mat = state.name;
      btn.textContent = prettifyName(state.name);
      btn.addEventListener("click", function () {
        selectByName(state.name, { scrollIntoView: false });
      });
      li.appendChild(btn);
      boneList.appendChild(li);
    });
  }

  function markBoneListActive(name) {
    Array.prototype.forEach.call(
      boneList.querySelectorAll(".bone-btn"),
      function (b) {
        b.classList.toggle("is-active", name !== null && b.dataset.mat === name);
      }
    );
  }

  boneSearch.addEventListener("input", function () {
    var q = boneSearch.value.trim().toLowerCase();
    var shown = 0;

    Array.prototype.forEach.call(boneList.children, function (li) {
      var btn = li.querySelector(".bone-btn");
      if (!btn) return;
      var match = btn.textContent.toLowerCase().indexOf(q) !== -1;
      li.style.display = match ? "" : "none";
      if (match) shown++;
    });

    boneCount.textContent = q ? "(" + shown + ")" : "(" + materialStates.length + ")";
  });

  /* ------------------------------------------------- Click-to-select logic
     camera-controls means dragging orbits the model. We only treat a pointer
     interaction as a "click" if it barely moved, so orbiting never fires a
     selection.                                                            */

  var pointerStart = null;

  viewer.addEventListener("pointerdown", function (event) {
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  viewer.addEventListener("pointerup", function (event) {
    if (!pointerStart) return;

    var dx = Math.abs(event.clientX - pointerStart.x);
    var dy = Math.abs(event.clientY - pointerStart.y);
    pointerStart = null;

    if (dx > CLICK_SLOP || dy > CLICK_SLOP) return;   // it was a drag

    // NOTE: model-viewer expects ABSOLUTE coordinates (clientX/clientY),
    // not coordinates relative to the element.
    if (authorModeOn) {
      captureHotspotPoint(event.clientX, event.clientY);
      return;
    }

    if (!viewer.materialFromPoint) return;

    var mat = viewer.materialFromPoint(event.clientX, event.clientY);

    if (!mat) {
      // Clicked empty space — deselect and restore the full model.
      showAll();
      clearSelection();
      return;
    }

    selectByName(mat.name || "(unnamed material)");
  });

  function hideStageHint() {
    if (stageHint) stageHint.classList.add("is-hidden");
  }

  /* -------------------------------------------------------------- Hotspots */

  function buildHotspots(hotspots) {
    Array.prototype.forEach.call(
      viewer.querySelectorAll("[slot^='hotspot-']"),
      function (el) { el.remove(); }
    );
    hotspotList.innerHTML = "";
    hotspotData = hotspots.map(normalizeAnnotation);

    if (!hotspotData.length) {
      showEmptyAnnotationMessage();
      updateAnnotationControls();
      return;
    }

    hotspotData.forEach(function (h) {
      addHotspotToScene(h);
      addHotspotToSidebar(h);
    });

    updateAnnotationVisibility();
    updateAnnotationControls();
  }

  function normalizeAnnotation(h) {
    var supported = ["landmark", "origin", "insertion", "note"];
    var type = supported.indexOf(h.type) !== -1 ? h.type : "landmark";
    return {
      id: String(h.id || "h" + Date.now() + (++hotspotCounter)),
      type: type,
      label: String(h.label || annotationTypeLabel(type)),
      muscle: h.muscle ? String(h.muscle) : "",
      description: h.description ? String(h.description) : "",
      position: String(h.position || "0 0 0"),
      normal: h.normal ? String(h.normal) : ""
    };
  }

  function annotationTypeLabel(type) {
    return {
      landmark: "Bone landmark",
      origin: "Muscle origin",
      insertion: "Muscle insertion",
      note: "General note"
    }[type] || "Annotation";
  }

  function showEmptyAnnotationMessage() {
    hotspotList.innerHTML =
      '<li class="empty-note">No annotations yet. Use Author Mode to add some.</li>';
  }

  function addHotspotToScene(h) {
    var wrapper = document.createElement("div");
    wrapper.className = "hotspot hotspot--" + h.type;
    wrapper.dataset.hotspotId = h.id;
    wrapper.dataset.annotationType = h.type;
    wrapper.setAttribute("slot", "hotspot-" + h.id);
    wrapper.dataset.position = h.position;
    if (h.normal) wrapper.dataset.normal = h.normal;

    var pin = document.createElement("div");
    pin.className = "hotspot__pin";

    var label = document.createElement("div");
    label.className = "hotspot__label";

    var type = document.createElement("span");
    type.className = "hotspot__type";
    type.textContent = annotationTypeLabel(h.type);

    var title = document.createElement("span");
    title.className = "hotspot__title";
    title.textContent = h.label;

    label.appendChild(type);
    label.appendChild(title);

    if (h.muscle) {
      var muscle = document.createElement("span");
      muscle.className = "hotspot__detail";
      muscle.textContent = h.muscle;
      label.appendChild(muscle);
    }

    if (h.description) {
      var description = document.createElement("span");
      description.className = "hotspot__detail";
      description.textContent = h.description;
      label.appendChild(description);
    }

    wrapper.appendChild(pin);
    wrapper.appendChild(label);
    wrapper.addEventListener("click", function () { focusHotspot(h.id); });
    viewer.appendChild(wrapper);
  }

  function addHotspotToSidebar(h) {
    var empty = hotspotList.querySelector(".empty-note");
    if (empty) empty.remove();

    var li = document.createElement("li");
    li.dataset.annotationType = h.type;
    li.dataset.annotationId = h.id;
    var btn = document.createElement("button");
    btn.className = "hotspot-btn hotspot-btn--" + h.type;
    btn.type = "button";
    btn.title = annotationTypeLabel(h.type) + ": " + h.label;

    var marker = document.createElement("span");
    marker.className = "hotspot-btn__marker";

    var text = document.createElement("span");
    text.className = "hotspot-btn__text";

    var label = document.createElement("span");
    label.className = "hotspot-btn__label";
    label.textContent = h.label;
    text.appendChild(label);

    var detailText = h.muscle || annotationTypeLabel(h.type);
    var detail = document.createElement("span");
    detail.className = "hotspot-btn__detail";
    detail.textContent = detailText;
    text.appendChild(detail);

    btn.appendChild(marker);
    btn.appendChild(text);
    btn.addEventListener("click", function () { focusHotspot(h.id); });

    li.appendChild(btn);
    hotspotList.appendChild(li);
  }

  annotationFilters.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-annotation-filter]");
    if (!btn) return;

    var type = btn.dataset.annotationFilter;
    annotationVisibility[type] = !annotationVisibility[type];
    btn.classList.toggle("is-active", annotationVisibility[type]);
    btn.setAttribute("aria-pressed", annotationVisibility[type] ? "true" : "false");
    updateAnnotationVisibility();
  });

  function updateAnnotationVisibility() {
    Array.prototype.forEach.call(
      viewer.querySelectorAll(".hotspot[data-annotation-type]"),
      function (el) {
        el.classList.toggle("is-filtered", !annotationVisibility[el.dataset.annotationType]);
      }
    );

    Array.prototype.forEach.call(
      hotspotList.querySelectorAll("[data-annotation-type]"),
      function (el) {
        el.hidden = !annotationVisibility[el.dataset.annotationType];
      }
    );
  }

  function updateAnnotationControls() {
    downloadAnnotationsBtn.disabled = hotspotData.length === 0;
  }

  function focusHotspot(id) {
    var el = viewer.querySelector('[data-hotspot-id="' + cssEscape(id) + '"]');
    if (!el) return;

    Array.prototype.forEach.call(
      viewer.querySelectorAll(".hotspot"),
      function (h) { h.classList.remove("is-focused"); }
    );
    el.classList.add("is-focused");

    var pos = el.dataset.position.split(" ").map(Number);
    if (pos.length === 3 && pos.every(function (n) { return !isNaN(n); })) {
      viewer.cameraTarget = pos[0] + "m " + pos[1] + "m " + pos[2] + "m";
    }

    window.setTimeout(function () { el.classList.remove("is-focused"); }, 2200);
  }

  /* ----------------------------------------------------------- Author Mode */

  authorModeBtn.addEventListener("click", function () {
    setAuthorMode(!authorModeOn);
  });

  function setAuthorMode(enabled) {
    authorModeOn = enabled;
    authorModeBtn.classList.toggle("btn--active", authorModeOn);
    authorBanner.classList.toggle("is-active", authorModeOn);
    authorPanel.classList.toggle("is-active", authorModeOn);
  }

  [annotationType, annotationLabel, annotationMuscle, annotationDescription]
    .forEach(function (field) {
      field.addEventListener("input", updatePendingAnnotation);
      field.addEventListener("change", updatePendingAnnotation);
    });

  function captureHotspotPoint(clientX, clientY) {
    var hit = viewer.positionAndNormalFromPoint(clientX, clientY);

    if (!hit) {
      authorSnippet.textContent = "// no surface hit — click directly on the model";
      pendingPoint = null;
      pendingAnnotation = null;
      previewAnnotationBtn.disabled = true;
      copySnippetBtn.disabled = true;
      return;
    }

    hotspotCounter += 1;

    var p = hit.position;
    var n = hit.normal;
    pendingPoint = {
      id: "h" + Date.now() + hotspotCounter,
      position: p.x.toFixed(3) + " " + p.y.toFixed(3) + " " + p.z.toFixed(3),
      normal: n.x.toFixed(3) + " " + n.y.toFixed(3) + " " + n.z.toFixed(3)
    };

    updatePendingAnnotation();
  }

  function updatePendingAnnotation() {
    if (!pendingPoint) return;

    var type = annotationType.value;
    var label = annotationLabel.value.trim();
    var fallback = {
      landmark: "NAME THIS LANDMARK",
      origin: "NAME THIS ORIGIN",
      insertion: "NAME THIS INSERTION",
      note: "NAME THIS NOTE"
    }[type];

    pendingAnnotation = {
      id: pendingPoint.id,
      type: type,
      label: label || fallback,
      position: pendingPoint.position,
      normal: pendingPoint.normal
    };

    var muscle = annotationMuscle.value.trim();
    var description = annotationDescription.value.trim();
    if (muscle) pendingAnnotation.muscle = muscle;
    if (description) pendingAnnotation.description = description;

    authorSnippet.textContent = JSON.stringify(pendingAnnotation, null, 2);
    previewAnnotationBtn.disabled = false;
    copySnippetBtn.disabled = false;
  }

  previewAnnotationBtn.addEventListener("click", function () {
    if (!pendingAnnotation) return;

    var annotation = normalizeAnnotation(pendingAnnotation);
    hotspotData.push(annotation);
    addHotspotToScene(annotation);
    addHotspotToSidebar(annotation);
    updateAnnotationVisibility();
    updateAnnotationControls();

    pendingPoint = null;
    pendingAnnotation = null;
    authorSnippet.textContent = "// annotation added to this view — click another point to continue";
    previewAnnotationBtn.disabled = true;
    copySnippetBtn.disabled = true;
  });

  copySnippetBtn.addEventListener("click", function () {
    var text = authorSnippet.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var original = copySnippetBtn.textContent;
        copySnippetBtn.textContent = "Copied!";
        window.setTimeout(function () { copySnippetBtn.textContent = original; }, 1200);
      }).catch(function () {
        authorSnippet.textContent = text + "\n\n// Clipboard blocked — select the text above manually.";
      });
    } else {
      authorSnippet.textContent = text + "\n\n// Clipboard unavailable — select the text above manually.";
    }
  });

  downloadAnnotationsBtn.addEventListener("click", function () {
    if (!hotspotData.length) return;

    var payload = JSON.stringify({ hotspots: hotspotData }, null, 2) + "\n";
    var blob = new Blob([payload], { type: "application/json" });
    var filename = slugify(config && config.label || "anatomy-model") + "-annotations.json";
    downloadBlob(blob, filename);
    setTemporaryButtonText(downloadAnnotationsBtn, "Downloaded!", 1400);
  });

  /* ---------------------------------------------------------------- Utils */

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "anatomy-model";
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function setTemporaryButtonText(button, text, duration) {
    var original = button.textContent;
    button.textContent = text;
    window.setTimeout(function () { button.textContent = original; }, duration);
  }

  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  /* ------------------------------------------------------------------- Go */

  init();

})();
