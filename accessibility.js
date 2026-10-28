/* Accessible controls and a linear view of the existing anatomy content.
   This interface is an accessibility improvement, not a conformance claim. */
(function () {
  "use strict";
  var viewer = document.getElementById("viewer");
  var stage = document.querySelector(".stage");
  var config = null;
  var modelLoaded = false;
  var studyReturnFocus = null;
  var markupReturnFocus = null;
  var markupActive = false;
  var searchTimer;
  var priorityMarker = null;
  var layoutScheduled = false;
  function layoutMarkers() {
    layoutScheduled = false;
    var bounds = stage.getBoundingClientRect();
    var blockers = Array.prototype.slice.call(stage.querySelectorAll(".access-controls, .stage__fullscreen-btn, .stage__markup-btn, .author-panel"));
    var occupied = blockers.filter(function (e) { return e.getClientRects().length && !e.hidden && getComputedStyle(e).display !== "none"; }).map(function (e) { return e.getBoundingClientRect(); });
    var pins = Array.prototype.slice.call(viewer.querySelectorAll(".hotspot"));
    var focusedPin = document.activeElement && document.activeElement.closest(".hotspot");
    pins.sort(function (a,b) {
      var rank = function (pin) { return pin === focusedPin ? 2 : pin.dataset.hotspotId === priorityMarker ? 1 : 0; };
      return rank(b) - rank(a);
    });
    pins.forEach(function (pin) {
      pin.classList.remove("is-crowded");
      if (pin.classList.contains("is-filtered")) return;
      var r = pin.getBoundingClientRect();
      var crowded = r.width < 24 || r.height < 24 || r.left < bounds.left || r.right > bounds.right || r.top < bounds.top || r.bottom > bounds.bottom || occupied.some(function (o) { return r.left < o.right + 3 && r.right + 3 > o.left && r.top < o.bottom + 3 && r.bottom + 3 > o.top; });
      pin.classList.toggle("is-crowded", crowded);
      if (crowded && pin === focusedPin) {
        studyButton.focus();
        announce("The focused marker moved out of view. Use Text study and help to select its named annotation.");
      }
      if (!crowded) occupied.push(r);
    });
  }
  function scheduleMarkerLayout() {
    if (!layoutScheduled) { layoutScheduled = true; window.requestAnimationFrame(layoutMarkers); }
  }
  viewer.addEventListener("camera-change", scheduleMarkerLayout);
  window.addEventListener("resize", scheduleMarkerLayout);
  viewer.addEventListener("pointerover", function (event) { var pin=event.target.closest(".hotspot"); if(pin && !pin.contains(event.relatedTarget)) pin.classList.remove("is-label-dismissed"); });
  viewer.addEventListener("focusin", function (event) { var pin=event.target.closest(".hotspot"); if(pin) pin.classList.remove("is-label-dismissed"); });
  document.addEventListener("keydown", function (event) { if(event.key==="Escape") viewer.querySelectorAll(".hotspot").forEach(function (pin) { pin.classList.add("is-label-dismissed"); }); });
  var markerHelp = document.createElement("p");
  markerHelp.className = "empty-note";
  markerHelp.textContent = "Crowded markers are hidden to prevent overlap. Every annotation remains available in the Annotations list and Text study & help. Press Escape to dismiss a marker label.";
  document.getElementById("annotationFilters").insertAdjacentElement("afterend", markerHelp);
  var controls = document.createElement("div");
  controls.className = "access-controls";
  controls.innerHTML = '<button type="button" id="openStudyBtn" aria-haspopup="dialog">Text study &amp; help</button>' +
    '<details id="cameraControls"><summary>Camera controls</summary><div class="camera-controls" role="group" aria-label="Camera controls without dragging">' +
    '<button type="button" data-camera="left">Rotate left</button><button type="button" data-camera="right">Rotate right</button>' +
    '<button type="button" data-camera="up">Rotate up</button><button type="button" data-camera="down">Rotate down</button>' +
    '<button type="button" data-camera="in">Zoom in</button><button type="button" data-camera="out">Zoom out</button>' +
    '<button type="button" data-camera="pan-left">Pan left</button><button type="button" data-camera="pan-right">Pan right</button>' +
    '<button type="button" data-camera="pan-up">Pan up</button><button type="button" data-camera="pan-down">Pan down</button>' +
    '<button type="button" data-camera="reset">Reset view</button></div></details>';
  stage.appendChild(controls);
  var status = document.createElement("div");
  status.className = "visually-hidden";
  status.setAttribute("role", "status");
  status.id = "viewerActionStatus";
  status.setAttribute("aria-atomic", "true");
  stage.appendChild(status);
  function announce(message) {
    // Background live regions can be excluded while a modal is open.
    var destination = dialog && dialog.open ? dialogStatus : status;
    var other = destination === status ? dialogStatus : status;
    if (other) other.textContent = "";
    destination.textContent = message;
  }
  viewer.setAttribute("aria-describedby", "viewerInstructions");
  var instructions = document.createElement("p");
  instructions.id = "viewerInstructions";
  instructions.className = "visually-hidden";
  instructions.textContent = "Interactive anatomy model. Use the structure search and buttons to select anatomy without clicking the model. Camera controls provide rotation, pan and zoom without dragging. Text study and help contains the available teaching descriptions. Tab moves to the next control; Escape closes an open study dialog.";
  stage.appendChild(instructions);

  var dialog = document.createElement("dialog");
  dialog.id = "textStudyDialog";
  dialog.className = "study-dialog";
  dialog.setAttribute("aria-labelledby", "textStudyTitle");
  dialog.innerHTML = '<button type="button" id="closeStudyBtn">Close text study</button>' +
    '<h2 id="textStudyTitle">Text study and keyboard help</h2>' +
    '<section aria-labelledby="screenReaderTipsTitle"><h3 id="screenReaderTipsTitle">Screen-reader reading tips</h3>' +
    '<p>Tab visits controls; it does not read every paragraph. Use your screen reader to read the text and named structures below. The 3D image itself is not a complete text description.</p>' +
    '<p>In NVDA, use your configured NVDA modifier key: Insert, or Caps Lock if enabled. These are screen-reader commands, not viewer shortcuts.</p>' +
    '<ul><li>Read from the current position: NVDA+A with the laptop keyboard layout, or NVDA+Down Arrow with the desktop layout.</li>' +
    '<li>Stop speech: Ctrl.</li><li>In browse mode, use the arrow keys to read content. NVDA+Space switches between browse and focus modes when needed.</li></ul>' +
    '<p>If navigating the Canvas embed is difficult, try the separate-tab viewer link provided below the embed. <a href="https://www.nvaccess.org/get-help/accessibility-testing-with-nvda-free-sample/" target="_blank" rel="noopener">NV Access reading and navigation guide (opens a new tab)</a>.</p></section>' +
    '<h3>Viewer keyboard controls</h3>' +
    '<p>Use Tab and Shift+Tab to move between controls, and Enter or Space to activate buttons. Search the structure index to select anatomy. Camera buttons rotate, pan and zoom without dragging. In fullscreen, this text study view provides structure selection and the available teaching notes.</p>' +
    '<p>Freeze &amp; Mark Up supports pen drawing and typed labels. Use the horizontal and vertical position fields with Place typed label to add text without a mouse. Download your work before Resume 3D clears it. Freehand drawing is visual; typed labels are also listed as text.</p>' +
    '<p id="studyCoverage">The available names and teaching notes are provided below. This is a text view of existing content; detailed spatial descriptions and an equivalent path for every course learning objective are still being reviewed.</p>' +
    '<label for="studySearch">Search text study</label><input id="studySearch" type="search" autocomplete="off" placeholder="Search names and teaching notes">' +
    '<p id="studyCount" role="status" aria-atomic="true"></p><section id="studySelectedDetails" aria-label="Selected structure information"></section><div id="studyContent"></div>';
  stage.appendChild(dialog);
  var dialogStatus = document.createElement("div");
  dialogStatus.id = "studyActionStatus";
  dialogStatus.className = "visually-hidden";
  dialogStatus.setAttribute("role", "status");
  dialogStatus.setAttribute("aria-atomic", "true");
  dialog.appendChild(dialogStatus);
  if (document.documentElement.dataset.skullBaseStudy === "preview" && new URLSearchParams(window.location.search).get("model") === "skull-base") {
    var guideNote = document.createElement("p");
    var guideLink = document.createElement("a");
    guideLink.href = "study.html?model=skull-base";
    guideLink.target = "_blank";
    guideLink.rel = "noopener";
    guideLink.textContent = "Read skull-base orientation and landmark guide (no 3D required; opens a new tab)";
    guideNote.appendChild(guideLink);
    dialog.insertBefore(guideNote, document.getElementById("studyCoverage"));
  }
  var search = document.getElementById("studySearch");
  var content = document.getElementById("studyContent");
  var count = document.getElementById("studyCount");
  var studyButton = document.getElementById("openStudyBtn");
  var dissectionPanels = [];
  var viewPickers = [];
  function updateViewAvailability() {
    viewPickers.forEach(function (picker) {
      picker.select.disabled = !modelLoaded || markupActive || !config || !config.cameraPresets || !config.cameraPresets.length;
      picker.apply.disabled = picker.select.disabled || picker.select.value === "";
    });
  }
  function buildViewPicker(parent, id, before) {
    var section = document.createElement("section");
    section.className = "view-picker-panel";
    var label = document.createElement("label");
    label.htmlFor = id; label.textContent = "Choose a view";
    var select = document.createElement("select");
    select.id = id;
    var apply = document.createElement("button");
    apply.type = "button"; apply.textContent = "Apply view";
    var help = document.createElement("p");
    help.className = "empty-note"; help.id = id + "Help";
    help.textContent = "Choose a preset, then Apply view. This changes the camera, not which structures are removed.";
    select.setAttribute("aria-describedby", help.id);
    section.appendChild(label); section.appendChild(select); section.appendChild(apply); section.appendChild(help);
    if (before) parent.insertBefore(section, before); else parent.appendChild(section);
    viewPickers.push({ select: select, apply: apply });
    select.addEventListener("change", updateViewAvailability);
    apply.addEventListener("click", function () {
      if (select.disabled || select.value === "") return;
      var button = document.getElementById("presetList").querySelectorAll(".preset-btn")[Number(select.value)];
      if (!button || button.disabled) return;
      button.click();
      announce("View applied: " + config.cameraPresets[Number(select.value)].name + ".");
    });
  }
  function configureViewPickers() {
    viewPickers.forEach(function (picker) {
      picker.select.textContent = "";
      var placeholder = document.createElement("option");
      placeholder.value = ""; placeholder.textContent = "Choose a view";
      picker.select.appendChild(placeholder);
      (config && config.cameraPresets || []).forEach(function (preset, index) {
        var option = document.createElement("option");
        option.value = String(index); option.textContent = preset.name;
        picker.select.appendChild(option);
      });
    });
    updateViewAvailability();
  }
  var presetListElement = document.getElementById("presetList");
  presetListElement.hidden = true;
  buildViewPicker(presetListElement.parentElement, "sidebarViewPicker", presetListElement);
  buildViewPicker(dialog, "studyViewPicker", dialog.querySelector('section[aria-labelledby="screenReaderTipsTitle"]'));
  document.addEventListener("anatomy-viewchange", function (event) {
    viewPickers.forEach(function (picker) { picker.select.value = event.detail.index >= 0 ? String(event.detail.index) : ""; });
    updateViewAvailability();
  });
  configureViewPickers();
  function buildDissectionPanel(parent, id) {
    var section = document.createElement("section");
    section.className = "dissection-panel";
    section.setAttribute("aria-labelledby", id + "Title");
    var title = document.createElement("h3");
    title.id = id + "Title";
    title.textContent = "Remove and restore structures";
    section.appendChild(title);
    var help = document.createElement("p");
    help.className = "empty-note";
    help.textContent = "Select a named bone or muscle, then hide it to reveal anatomy already in this model. Shared-material pieces hide together; linked tendon pieces follow their muscle. Scene markers pause while any structure is hidden; annotation descriptions remain in Text Study. Restoring respects Anatomy Layers switches. Hidden structures reset when you load another model.";
    section.appendChild(help);
    var actions = document.createElement("div");
    actions.className = "dissection-actions";
    section.appendChild(actions);
    var hide = document.createElement("button");
    hide.type = "button"; hide.id = id + "Hide";
    var undo = document.createElement("button");
    undo.type = "button"; undo.textContent = "Undo last hide";
    var all = document.createElement("button");
    all.type = "button"; all.textContent = "Restore all hidden";
    actions.appendChild(hide); actions.appendChild(undo); actions.appendChild(all);
    var status = document.createElement("p");
    status.id = id + "Status"; status.tabIndex = -1;
    section.appendChild(status);
    var list = document.createElement("ul");
    list.setAttribute("aria-label", "Hidden structures");
    section.appendChild(list);
    var panel = { section: section, hide: hide, undo: undo, all: all, status: status, list: list };
    dissectionPanels.push(panel);
    hide.addEventListener("click", function () {
      window.AnatomyDissection.hideSelected();
      (undo.disabled ? status : undo).focus();
    });
    undo.addEventListener("click", function () {
      window.AnatomyDissection.undo();
      if (undo.disabled) status.focus();
    });
    all.addEventListener("click", function () {
      window.AnatomyDissection.restoreAll();
      status.focus();
    });
    parent.appendChild(section);
  }
  buildDissectionPanel(document.querySelector(".selection"), "sidebarDissection");
  buildDissectionPanel(dialog, "studyDissection");
  dialog.insertBefore(dissectionPanels[1].section, dialog.querySelector('label[for="studySearch"]'));
  function renderDissection() {
    var api = window.AnatomyDissection;
    var state = api ? api.state() : { ready: false, selected: null, hidden: [] };
    dissectionPanels.forEach(function (panel) {
      panel.hide.textContent = state.selected ? "Remove selected: " + state.selected.label : "Remove selected structure";
      panel.hide.disabled = !state.ready || !state.selected;
      panel.undo.disabled = !state.ready || !state.undoName;
      panel.all.disabled = !state.ready || !state.hidden.length;
      panel.status.textContent = state.ready ? state.hidden.length + " structures hidden." :
        "Hiding is unavailable while loading, frozen, or when this model's surface adapter is unavailable.";
      panel.list.textContent = "";
      state.hidden.forEach(function (item) {
        var li = document.createElement("li");
        var restore = document.createElement("button");
        restore.type = "button";
        restore.textContent = "Restore: " + item.label;
        restore.disabled = !state.ready;
        restore.addEventListener("click", function () { api.restore(item.name); panel.status.focus(); });
        li.appendChild(restore); panel.list.appendChild(li);
      });
    });
  }
  document.addEventListener("anatomy-visibility", function (event) {
    renderDissection();
    if (dialog.open && !event.detail.selectionOnly) renderStudy();
    if (dialog.open && event.detail.selectionOnly) {
      dialog.querySelectorAll('button[data-study-key^="structure:"]').forEach(function (button) {
        var name = button.getAttribute("data-study-key").slice("structure:".length);
        var source = Array.prototype.find.call(document.querySelectorAll("#boneList button"), function (item) { return item.dataset.mat === name; });
        if (source) button.setAttribute("aria-pressed", source.getAttribute("aria-pressed") || "false");
      });
      updateSelectedDetails();
    }
    if (event.detail.message) announce(event.detail.message);
    scheduleMarkerLayout();
  });
  document.addEventListener("anatomy-markup", renderDissection);
  renderDissection();
  function el(tag, text, parent) {
    var element = document.createElement(tag);
    element.textContent = text;
    if (parent) parent.appendChild(element);
    return element;
  }
  function updateSelectedDetails() {
    var destination = document.getElementById("studySelectedDetails");
    destination.textContent = "";
    var panel = document.getElementById("muscleDetails");
    if (panel && !panel.hidden) {
      el("h3", "Selected muscle information", destination);
      var fields = document.getElementById("muscleDetailsFields").cloneNode(true);
      fields.removeAttribute("id");
      destination.appendChild(fields);
      el("p", document.getElementById("muscleDetailsNote").textContent, destination);
      var sources = document.getElementById("muscleDetailsSources").cloneNode(true);
      sources.removeAttribute("id");
      destination.appendChild(sources);
    }
    var attachments = document.getElementById("attachmentStatus");
    if (attachments && !attachments.hidden) el("p", attachments.textContent, destination);
  }
  var detailsPanel = document.getElementById("muscleDetails");
  if (detailsPanel) new MutationObserver(function () { if (dialog.open) updateSelectedDetails(); }).observe(detailsPanel, {childList:true,subtree:true,attributes:true});
  function renderStudy() {
    var oldFocus = document.activeElement;
    var hadResultFocus = content.contains(oldFocus);
    var focusKey = hadResultFocus ? oldFocus.getAttribute("data-study-key") : null;
    content.textContent = "";
    var query = search.value.trim().toLowerCase();
    var matches = 0;
    el("h3", "Structures", content);
    var list = el("ul", "", content);
    var buttons = Array.prototype.slice.call(document.querySelectorAll("#boneList .bone-btn"));
    buttons.forEach(function (source) {
      if (source.textContent.toLowerCase().indexOf(query) === -1) return;
      matches++;
      var item = el("li", "", list);
      // Ignore the sidebar's search query, but respect anatomy layer visibility.
      var manuallyHidden = source.dataset.dissectionHidden === "true";
      var available = !manuallyHidden && (!config || !config.structureMembership || !config.structureGroups || config.structureGroups.every(function (group) {
        if (config.structureMembership[source.dataset.mat] !== group.id) return true;
        var layer = document.querySelector('#layerButtons [data-layer="' + group.id + '"]');
        return !layer || layer.getAttribute("aria-pressed") !== "false";
      }));
      var button = el("button", source.textContent, item);
      button.type = "button";
      button.setAttribute("data-study-key", "structure:" + source.dataset.mat);
      button.disabled = !available;
      button.setAttribute("aria-pressed", source.getAttribute("aria-pressed") || "false");
      if (!available) el("span", manuallyHidden ? " — hidden; use Hide and restore structures to select again" : " — layer hidden; enable it in Anatomy Layers to select", item);
      button.addEventListener("keydown", function (event) {
        if (event.ctrlKey && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          button.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
        }
      });
      button.addEventListener("click", function (event) {
        source.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: event.ctrlKey }));
        list.querySelectorAll("button[data-study-key]").forEach(function (b) {
          var key = b.getAttribute("data-study-key").slice("structure:".length);
          var original = Array.prototype.find.call(document.querySelectorAll("#boneList button"), function (item) { return item.dataset.mat === key; });
          if (original) b.setAttribute("aria-pressed", original.getAttribute("aria-pressed") || "false");
        });
        var selected = source.getAttribute("aria-pressed") === "true";
        announce((selected ? "Selected " : "Deselected ") + source.textContent + ". Close text study to examine the model.");
        count.textContent = (selected ? "Selected " : "Deselected ") + source.textContent + ".";
        updateSelectedDetails();
      });
    });
    if (!buttons.length) el("p", "Structure names become available when the model loads. Teaching notes below do not require the 3D file.", content);
    el("h3", "Teaching annotations", content);
    var notes = config && config.hotspots || [];
    notes.forEach(function (note) {
      if ([note.label, note.description, note.muscle, note.type].join(" ").toLowerCase().indexOf(query) === -1) return;
      matches++;
      var article = el("article", "", content);
      el("h4", note.label, article);
      el("p", "Type: " + (note.type || "landmark") + (note.muscle ? ". Muscle: " + note.muscle : ""), article);
      el("p", note.description || "No teaching description has been supplied for this annotation.", article);
      var focusButton = el("button", "Focus landmark: " + note.label, article);
      focusButton.type = "button";
      focusButton.setAttribute("data-study-key", "annotation:" + note.id);
      focusButton.disabled = !modelLoaded || !!(window.AnatomyDissection && window.AnatomyDissection.state().hidden.length);
      if (!modelLoaded) el("p", "Landmark focus is unavailable until the 3D model loads. The description above remains available.", article);
      focusButton.addEventListener("click", function () {
        var sourceItem = Array.prototype.find.call(document.querySelectorAll("#hotspotList li"), function (li) { return li.dataset.annotationId === note.id; });
        dialog.close();
        if (sourceItem) sourceItem.querySelector("button").click();
        announce("Focused landmark " + note.label + ".");
      });
    });
    if (!notes.length) el("p", "No teaching annotations have been added for this model.", content);
    count.textContent = matches + " matching structures and teaching annotations.";
    updateSelectedDetails();
    // A delayed search rebuild must not strand focus on a removed result.
    if (hadResultFocus && dialog.open) {
      var replacement = Array.prototype.find.call(content.querySelectorAll("button[data-study-key]"), function (button) {
        return focusKey && button.getAttribute("data-study-key") === focusKey && !button.disabled;
      });
      if (replacement) replacement.focus();
      else {
        search.focus();
        announce("The focused result is no longer available. Continue from Search text study.");
      }
    }
  }
  studyButton.addEventListener("click", function () {
    studyReturnFocus = document.activeElement;
    status.textContent = "";
    dialogStatus.textContent = "";
    search.value = "";
    renderStudy();
    dialog.showModal();
    document.getElementById("closeStudyBtn").focus();
  });
  document.getElementById("closeStudyBtn").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("close", function () {
    window.clearTimeout(searchTimer);
    searchTimer = null;
    dialogStatus.textContent = "";
    if (studyReturnFocus && studyReturnFocus.isConnected) studyReturnFocus.focus();
  });
  search.addEventListener("input", function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      searchTimer = null;
      renderStudy();
    }, 180);
  });
  search.addEventListener("keydown", function (event) {
    // Complete filtering before native Tab chooses its next focus target.
    // Otherwise a delayed rebuild can remove the result the user just reached.
    if (event.key === "Tab" && searchTimer != null) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
      renderStudy();
    }
  });
  controls.querySelectorAll("[data-camera]").forEach(function (button) {
    button.disabled = true;
    button.addEventListener("click", function () {
      var direction = button.dataset.camera;
      if (direction === "reset") document.getElementById("resetBtn").click();
      else {
        var orbit = viewer.getCameraOrbit();
        var target = viewer.getCameraTarget();
        var step = Math.PI / 12;
        if (direction === "left") orbit.theta -= step;
        if (direction === "right") orbit.theta += step;
        if (direction === "up") orbit.phi = Math.max(0.01, orbit.phi - step);
        if (direction === "down") orbit.phi = Math.min(Math.PI - 0.01, orbit.phi + step);
        if (direction === "in") orbit.radius *= 0.85;
        if (direction === "out") orbit.radius *= 1.15;
        if (direction.indexOf("pan-") === 0) {
          var distance = orbit.radius * 0.08;
          var horizontal = direction === "pan-left" ? -distance : direction === "pan-right" ? distance : 0;
          target.x += horizontal * Math.cos(orbit.theta);
          target.z -= horizontal * Math.sin(orbit.theta);
          target.y += direction === "pan-up" ? distance : direction === "pan-down" ? -distance : 0;
          viewer.setAttribute("camera-target", target.x + "m " + target.y + "m " + target.z + "m");
        } else viewer.setAttribute("camera-orbit", orbit.theta + "rad " + orbit.phi + "rad " + orbit.radius + "m");
        document.querySelectorAll(".preset-btn").forEach(function (b) { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) viewer.jumpCameraToGoal();
      }
      announce(button.textContent + ".");
    });
  });
  document.addEventListener("anatomy-markup", function (event) {
    var active = event.detail.active;
    markupActive = active;
    updateViewAvailability();
    updateBypassAvailability();
    controls.hidden = active;
    viewer.inert = active;
    if (active) {
      markupReturnFocus = document.activeElement;
      document.getElementById("markupPenBtn").focus();
    } else {
      var destination = markupReturnFocus && markupReturnFocus.isConnected && markupReturnFocus.getClientRects().length ? markupReturnFocus : studyButton;
      destination.focus();
    }
  });
  function updateBypassAvailability() {
    var fullscreen = (document.fullscreenElement || document.webkitFullscreenElement) === stage;
    // Frozen-mode targets are disabled, hidden or inert. Keep those bypass
    // links out of the tab order until their destinations are usable again.
    document.querySelector(".skip-links").inert = markupActive || fullscreen;
  }
  function handleFullscreenChange() {
    var active = (document.fullscreenElement || document.webkitFullscreenElement) === stage;
    document.querySelector(".sidebar").inert = active;
    updateBypassAvailability();
    if (dialog.open) dialog.close();
    if (!active) document.getElementById("fullscreenBtn").focus();
  }
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.querySelectorAll(".skip-links a").forEach(function (link) {
    link.addEventListener("click", function () {
      var target = document.querySelector(link.getAttribute("href"));
      if (target) target.focus();
    });
  });
  window.AnatomyAccessibility = {
    prioritizeMarker: function (id) { priorityMarker=id; scheduleMarkerLayout(); },
    configure: function (value) { config = value; modelLoaded = false; configureViewPickers(); },
    loaded: function () {
      modelLoaded = true;
      updateViewAvailability();
      scheduleMarkerLayout();
      controls.querySelectorAll("[data-camera]").forEach(function (button) { button.disabled = false; });
      announce((config.label || "Anatomy model") + " loaded. Structure search, text study and camera controls are ready.");
    }
  };
}());
