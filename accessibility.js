/* Accessible controls and a linear view of the existing anatomy content.
   This interface is an accessibility improvement, not a conformance claim. */
(function () {
  "use strict";
  var viewer = document.getElementById("viewer");
  var stage = document.querySelector(".stage");
  var config = null;
  var studyReturnFocus = null;
  var markupReturnFocus = null;
  var searchTimer;
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
  status.setAttribute("aria-atomic", "true");
  stage.appendChild(status);
  function announce(message) { status.textContent = message; }
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
    '<p>Use Tab and Shift+Tab to move between controls, and Enter or Space to activate buttons. Search the structure index to select anatomy. Camera buttons rotate, pan and zoom without dragging. In fullscreen, this text study view provides structure selection and the available teaching notes.</p>' +
    '<p>Freeze &amp; Mark Up supports pen drawing and typed labels. Use the horizontal and vertical position fields with Place typed label to add text without a mouse. Download your work before Resume 3D clears it. Freehand drawing is visual; typed labels are also listed as text.</p>' +
    '<p id="studyCoverage">The available names and teaching notes are provided below. This is a text view of existing content; detailed spatial descriptions and an equivalent path for every course learning objective are still being reviewed.</p>' +
    '<label for="studySearch">Search text study</label><input id="studySearch" type="search" autocomplete="off" placeholder="Search names and teaching notes">' +
    '<p id="studyCount" role="status" aria-atomic="true"></p><section id="studySelectedDetails" aria-label="Selected structure information"></section><div id="studyContent"></div>';
  stage.appendChild(dialog);
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
      var available = !config || !config.structureMembership || !config.structureGroups || config.structureGroups.every(function (group) {
        if (config.structureMembership[source.dataset.mat] !== group.id) return true;
        var layer = document.querySelector('#layerButtons [data-layer="' + group.id + '"]');
        return !layer || layer.getAttribute("aria-pressed") !== "false";
      });
      var button = el("button", source.textContent, item);
      button.type = "button";
      button.disabled = !available;
      button.setAttribute("aria-pressed", source.getAttribute("aria-pressed") || "false");
      if (!available) el("span", " — layer hidden; enable it in Anatomy Layers to select", item);
      button.addEventListener("click", function () {
        source.click();
        list.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === button ? "true" : "false"); });
        announce("Selected " + source.textContent + ". Close text study to examine the model.");
        count.textContent = "Selected " + source.textContent + ".";
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
    });
    if (!notes.length) el("p", "No teaching annotations have been added for this model.", content);
    count.textContent = matches + " matching structures and teaching annotations.";
    updateSelectedDetails();
  }
  studyButton.addEventListener("click", function () {
    studyReturnFocus = document.activeElement;
    search.value = "";
    renderStudy();
    dialog.showModal();
    document.getElementById("closeStudyBtn").focus();
  });
  document.getElementById("closeStudyBtn").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("close", function () { if (studyReturnFocus && studyReturnFocus.isConnected) studyReturnFocus.focus(); });
  search.addEventListener("input", function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(renderStudy, 180);
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
  document.addEventListener("fullscreenchange", function () {
    var active = document.fullscreenElement === stage;
    document.querySelector(".sidebar").inert = active;
    document.querySelector(".skip-links").inert = active;
    if (dialog.open) dialog.close();
    if (!active) document.getElementById("fullscreenBtn").focus();
  });
  document.querySelectorAll(".skip-links a").forEach(function (link) {
    link.addEventListener("click", function () {
      var target = document.querySelector(link.getAttribute("href"));
      if (target) target.focus();
    });
  });
  window.AnatomyAccessibility = {
    configure: function (value) { config = value; },
    loaded: function () {
      controls.querySelectorAll("[data-camera]").forEach(function (button) { button.disabled = false; });
      announce((config.label || "Anatomy model") + " loaded. Structure search, text study and camera controls are ready.");
    }
  };
}());
