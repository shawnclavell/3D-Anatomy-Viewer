/* Compact reference layout. Keep the existing controls and event handlers. */
(function () {
  "use strict";
  var sidebar = document.querySelector(".sidebar");
  var stage = document.querySelector(".stage");
  var controls = stage.querySelector(".access-controls");
  var list = document.getElementById("boneList");
  var search = document.getElementById("boneSearch");
  var searchSection = list.closest(".sidebar__section");
  var selection = sidebar.querySelector(".selection");
  var layers = document.getElementById("structureLayers");
  var footer = sidebar.querySelector(".sidebar__footer");

  function disclosure(title, contents, parent) {
    var details = document.createElement("details");
    details.className = "sidebar-disclosure";
    var summary = document.createElement("summary");
    summary.textContent = title;
    details.appendChild(summary);
    contents.forEach(function (node) { if (node) details.appendChild(node); });
    parent.appendChild(details);
    return details;
  }

  // Use the existing result buttons directly, including their reveal and Ctrl-selection behavior.
  searchSection.classList.remove("sidebar__section--grow");
  searchSection.classList.add("structure-search-panel");
  searchSection.querySelector("h2").classList.add("visually-hidden");
  var searchLabel = document.createElement("label");
  searchLabel.htmlFor = "boneSearch";
  searchLabel.textContent = "Find anatomy";
  search.before(searchLabel);
  search.placeholder = "Search a structure…";
  search.setAttribute("aria-controls", "boneList");
  search.setAttribute("aria-describedby", "searchStatus");
  var noResults = document.createElement("p");
  noResults.className = "empty-note";
  noResults.hidden = true;
  list.after(noResults);
  function syncResults() {
    var query = search.value.trim();
    var frozen = document.getElementById("markupModeBtn").getAttribute("aria-pressed") === "true";
    list.hidden = !query || frozen;
    var matches = Array.from(list.children).filter(function (li) { return li.querySelector("button") && li.style.display !== "none"; });
    if (query && window.rankAnatomyStructureQuery) {
      var previousOrder = matches.slice();
      matches.sort(function (a, b) {
        return window.rankAnatomyStructureQuery(a.querySelector("button").textContent, query) -
          window.rankAnatomyStructureQuery(b.querySelector("button").textContent, query);
      });
      if (matches.some(function (li, index) { return li !== previousOrder[index]; })) {
        matches.forEach(function (li) { list.appendChild(li); });
      }
    }
    noResults.hidden = !query || matches.length > 0 || frozen;
    noResults.textContent = "No matching structures.";
    list.querySelectorAll("button").forEach(function (button) {
      if (button.disabled !== frozen) button.disabled = frozen;
    });
  }
  search.addEventListener("input", syncResults);
  document.addEventListener("anatomy-markup", syncResults);
  new MutationObserver(syncResults).observe(list, {
    childList:true, subtree:true, attributes:true,
    attributeFilter:["data-hidden-layer", "data-dissection-hidden", "aria-pressed"]
  });
  // Filtering changes li style. Read it after the search and visibility handlers finish.
  document.addEventListener("anatomy-visibility", syncResults);
  document.getElementById("muscleInformationOnly").addEventListener("change", syncResults);
  list.addEventListener("click", function (event) {
    if (!event.isTrusted || event.ctrlKey || !event.target.closest("button")) return;
    if (window.matchMedia("(max-width: 760px), (max-width: 1024px) and (any-pointer: coarse)").matches) {
      var viewer = document.getElementById("viewer");
      viewer.focus({preventScroll:true});
      viewer.scrollIntoView({block:"start"});
    }
  });
  syncResults();

  var layerHeading = layers.querySelector("h2");
  layerHeading.classList.add("visually-hidden");
  var customLayers = disclosure("Customize layers", [document.getElementById("layerButtons")], layers);
  customLayers.id = "customLayerControls";

  // One toolbar for the frequent global actions.
  var history = controls.querySelector(".viewer-history-controls");
  history.classList.add("reference-toolbar");
  history.setAttribute("aria-label", "Viewer actions");
  var undo = history.querySelector("[data-viewer-undo]");
  var reset = history.querySelector("[data-model-reset]");
  undo.textContent = "Go back";
  reset.textContent = "Reset";
  history.appendChild(document.getElementById("fullscreenBtn"));
  controls.appendChild(history);
  var tools = disclosure("Tools", [], controls);
  tools.id = "viewerTools";
  var toolsBody = document.createElement("div");
  toolsBody.className = "viewer-tools-body";
  tools.appendChild(toolsBody);
  var closeTools = document.createElement("button");
  closeTools.type = "button";
  closeTools.className = "close-viewer-tools";
  closeTools.textContent = "Close tools";
  toolsBody.appendChild(closeTools);
  function closeToolsMenu() { tools.open = false; tools.querySelector("summary").focus(); }
  closeTools.addEventListener("click", closeToolsMenu);
  tools.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { event.preventDefault(); closeToolsMenu(); }
  });
  toolsBody.appendChild(document.getElementById("openStudyBtn"));
  toolsBody.appendChild(document.getElementById("cameraControls"));
  document.getElementById("fullscreenMarkupBtn").hidden = true;
  [document.getElementById("markupModeBtn"), document.getElementById("downloadViewBtn"),
    document.getElementById("resetBtn"), document.getElementById("authorModeBtn"), footer.querySelector("a")]
    .forEach(function (node) { toolsBody.appendChild(node); });
  footer.hidden = true;
  // Other history controls stay in Text Study for its modal workflow.
  Array.from(footer.querySelectorAll("[data-viewer-undo], [data-model-reset]")).forEach(function (node) { node.hidden = true; });

  var reviewNote = document.getElementById("modelReviewNote");
  disclosure("Model notes", [reviewNote], toolsBody);
  disclosure("Search options", [document.getElementById("muscleInformationCoverage")], toolsBody);
  var annotations = document.getElementById("annotationFilters").closest(".sidebar__section");
  annotations.querySelector("h2").classList.add("visually-hidden");
  disclosure("Annotations", [annotations], toolsBody);
  var removal = document.getElementById("sidebarDissectionTitle").closest("section");
  document.getElementById("sidebarDissectionTitle").classList.add("visually-hidden");
  disclosure("Restore removed structures", [removal], toolsBody);
  var attachmentHelp = document.getElementById("attachmentStatus");
  disclosure("Attachment details", [attachmentHelp, document.getElementById("attachmentViewBtn"), document.getElementById("attachmentEndpointControls")], toolsBody);

  // The selected structure owns contextual actions and its information.
  document.getElementById("ghostBtn").textContent = "Fade others";
  var remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn--sm";
  remove.textContent = "Remove";
  remove.id = "removeActiveStructure";
  var selectionActions = selection.querySelector(".selection__actions");
  selectionActions.appendChild(remove);
  selectionActions.setAttribute("role", "group");
  controls.appendChild(selectionActions);
  remove.addEventListener("click", function () { window.AnatomyDissection.hideSelected(); });
  toolsBody.appendChild(document.getElementById("showAllBtn"));
  var multi = sidebar.querySelector('section[aria-label="Multiple muscle selection"]');
  if (multi) {
    var instructions = multi.querySelector("p");
    disclosure("Selection help", [instructions], toolsBody);
  }
  function syncSelection() {
    var empty = document.getElementById("selectionName").classList.contains("selection__name--empty");
    var focusedInside = selection.contains(document.activeElement);
    selection.hidden = empty;
    selectionActions.hidden = empty;
    selectionActions.inert = document.getElementById("markupModeBtn").getAttribute("aria-pressed") === "true";
    selectionActions.setAttribute("aria-label", "Actions for " + document.getElementById("selectionName").textContent);
    if (multi) multi.hidden = multi.querySelectorAll("li").length < 2;
    remove.disabled = !window.AnatomyDissection.state().ready || empty;
    if (empty && focusedInside) search.focus();
  }
  document.addEventListener("anatomy-visibility", syncSelection);
  document.addEventListener("anatomy-markup", syncSelection);
  syncSelection();

  var viewPanel = document.getElementById("sidebarViewPicker").closest(".view-picker-panel");
  var views = viewPanel.closest(".sidebar__section");
  views.querySelector("h2").classList.add("visually-hidden");
  disclosure("Camera views", [viewPanel, document.getElementById("presetList")], views);

  var header = sidebar.querySelector(".sidebar__header");
  header.querySelector(".sidebar__eyebrow").hidden = true;
  var modelChoice = header.querySelector(".specimen-picker");
  var loadModel = document.getElementById("loadModelBtn");
  if (document.getElementById("modelPicker").options.length === 1) {
    modelChoice.hidden = true;
    loadModel.hidden = true;
  } else disclosure("Choose model", [modelChoice, loadModel], toolsBody);
  header.after(layers);
  layers.after(searchSection);
  searchSection.after(selection);
  selection.after(views);
  if (document.documentElement.dataset.referenceCards === "review") {
    var information = document.getElementById("muscleDetails");
    var informationDetails = disclosure("Structure information", [information], selection);
    information.querySelector("h3").classList.add("visually-hidden");
    function syncInformation() { informationDetails.hidden = information.hidden; }
    new MutationObserver(syncInformation).observe(information, {attributes:true,attributeFilter:["hidden"]});
    syncInformation();
  }
  document.querySelector(".app").classList.add("reference-layout");
}());
