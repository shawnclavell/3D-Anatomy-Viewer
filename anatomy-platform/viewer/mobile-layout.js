/* Keep the model connected while adapting control order for narrow screens. */
(function () {
  "use strict";
  var narrow = window.matchMedia("(max-width: 760px), (max-width: 1024px) and (any-pointer: coarse)");
  var sidebar = document.querySelector(".sidebar");
  var stage = document.querySelector(".stage");
  var layers = document.getElementById("structureLayers");
  var controls = stage.querySelector(".access-controls");
  function updateLayout() {
    var focused = document.activeElement;
    var fullscreen = (document.fullscreenElement || document.webkitFullscreenElement) === stage;
    stage.classList.toggle("stage--compact", narrow.matches || fullscreen);
    if (narrow.matches || fullscreen) {
      if (sidebar.nextElementSibling === stage) stage.after(sidebar);
      if (layers.parentElement !== stage) controls.after(layers);
    } else {
      if (stage.nextElementSibling === sidebar) stage.before(sidebar);
      if (layers.parentElement !== sidebar) sidebar.querySelector(".sidebar__header").after(layers);
    }
    if (focused && document.activeElement !== focused && focused.isConnected) focused.focus({preventScroll:true});
  }
  narrow.addEventListener("change", updateLayout);
  document.addEventListener("fullscreenchange", updateLayout);
  document.addEventListener("webkitfullscreenchange", updateLayout);
  updateLayout();
}());
