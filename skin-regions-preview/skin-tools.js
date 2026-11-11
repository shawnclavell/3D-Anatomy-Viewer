/* Surface-model controls; use existing layer actions and preserve removed patches. */
(function () {
  'use strict';
  if ((new URLSearchParams(location.search).get('model') || document.documentElement.dataset.defaultModel) !== 'skin-regions') return;
  var viewer = document.getElementById('viewer');
  var picker = document.querySelector('.specimen-picker');
  var panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Skin surface controls');
  panel.className = 'skin-tools';
  var previewNote = document.createElement('p');
  previewNote.className = 'empty-note';
  previewNote.textContent = 'Review preview. Region names and boundaries are pending instructor review. Some finger and toe surfaces are grouped.';
  var toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'btn btn--wide';
  toggle.textContent = 'Skin surface layers';
  toggle.id = 'skinSurfaceToggle';
  toggle.setAttribute('aria-pressed', 'true');
  toggle.setAttribute('aria-describedby', 'skinSurfaceHelp');
  toggle.disabled = true;
  var help = document.createElement('p');
  help.id = 'skinSurfaceHelp'; help.className = 'empty-note';
  help.textContent = 'Turn off to reveal muscles and skeleton. Individual regions remain available under Anatomy Layers. Use Restore for separately removed patches.';
  var link = document.createElement('a');
  link.href = document.documentElement.dataset.skinGuide || 'skin-regions-guide.html'; link.className = 'btn skin-guide-link';
  link.textContent = 'Body regions study guide';
  document.getElementById('textStudyTitle').after(link.cloneNode(true));
  var status = document.createElement('p');
  status.className = 'empty-note'; status.id = 'skinSurfaceStatus';
  status.setAttribute('role', 'status'); status.setAttribute('aria-atomic', 'true');
  previewNote.classList.add('visually-hidden'); help.classList.add('visually-hidden');
  toggle.title = help.textContent;
  panel.append(previewNote, toggle, help, link, status);
  var surfaceTools = document.createElement('details'); surfaceTools.className = 'sidebar-disclosure';
  var summary = document.createElement('summary'); summary.textContent = 'Surface tools';
  surfaceTools.append(summary, panel);
  document.querySelector('.viewer-tools-body').appendChild(surfaceTools);
  var ids = ['head', 'trunk', 'upper', 'lower'];
  function controls() {
    return ids.map(function (id) { return document.querySelector('#layerButtons [data-layer="' + id + '"]'); }).filter(Boolean);
  }
  function sync() {
    var buttons = controls();
    if (buttons.length !== ids.length) return;
    var count = buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length;
    toggle.setAttribute('aria-pressed', count === 4 ? 'true' : count === 0 ? 'false' : 'mixed');
    toggle.disabled = !viewer.loaded;
  }
  toggle.addEventListener('click', function () {
    var show = toggle.getAttribute('aria-pressed') !== 'true';
    controls().forEach(function (button) {
      if ((button.getAttribute('aria-pressed') === 'true') !== show) button.click();
    });
    sync();
    status.textContent = show ? 'All skin-area layers enabled. Separately removed patches stay removed.' : 'All skin-area layers hidden. Underlying anatomy layers keep their current settings.';
  });
  new MutationObserver(sync).observe(document.getElementById('layerButtons'), {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed']});
  viewer.addEventListener('load', sync);
  function surfaceInstructions() {
    document.querySelectorAll('.dissection-panel > p.empty-note').forEach(function (p) {
      p.textContent = 'Select a skin region, muscle or bone, then use Remove to hide it. Removing a skin region reveals the anatomy underneath. Linked tendon pieces follow their muscle. Use Undo last hide or a named Restore control to replace removed anatomy. Restoring respects Anatomy Layers settings. Hidden structures reset when you load another model.';
    });
    document.querySelectorAll('[aria-label="Multiple muscle selection"]').forEach(function (group) {
      group.setAttribute('aria-label', 'Multiple structure selection');
      var p = group.querySelector('p');
      if (p) p.textContent = 'Click to select one skin region or muscle. Hold Ctrl while clicking to add or deselect regions and muscles. Keyboard: Ctrl+Enter or Ctrl+Space on a named result or Select structure button. Isolate and Ghost Others apply to the group; Remove applies to the active structure. Selecting a bone replaces the group. Clear selection does not restore removed anatomy.';
    });
  }
  viewer.addEventListener('load', surfaceInstructions);
  surfaceInstructions();
  sync();
}());
