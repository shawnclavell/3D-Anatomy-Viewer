/* Keep fullscreen focused on anatomy, with optional help and screen annotation. */
(function () {
  'use strict';
  const stage = document.querySelector('.stage');
  const controls = stage.querySelector('.access-controls');
  const layers = document.getElementById('structureLayers');
  const fullscreenButton = document.getElementById('fullscreenBtn');
  const markupTrigger = document.getElementById('fullscreenMarkupBtn');
  const cameraControls = document.getElementById('cameraControls');
  const cameraHome = document.createComment('Camera controls location');
  cameraControls.before(cameraHome);

  const dock = document.createElement('div');
  dock.className = 'fullscreen-tools';
  dock.setAttribute('role', 'group');
  dock.setAttribute('aria-label', 'Fullscreen tools');
  dock.hidden = true;
  function button(label, action) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', action);
    dock.append(element);
    return element;
  }

  const guide = document.createElement('dialog');
  guide.className = 'study-dialog fullscreen-guide';
  guide.setAttribute('aria-labelledby', 'fullscreenGuideTitle');
  guide.innerHTML = '<h2 id="fullscreenGuideTitle">Quick tool guide</h2>' +
    '<p>Rotate the model with mouse or touch. Use the camera buttons below to rotate, pan, and zoom without dragging.</p>' +
    '<p><strong>Annotate</strong> freezes the current view. Use Pen to draw or Text to place labels. Download your marked view or typed notes before choosing Resume 3D.</p>' +
    '<p>Press Escape or use Exit fullscreen to return to the full study interface.</p>' +
    '<div class="fullscreen-guide-camera"></div>' +
    '<button type="button" class="fullscreen-guide-close">Close guide</button>';
  stage.append(guide);
  const cameraHost = guide.querySelector('.fullscreen-guide-camera');
  const help = button('Quick guide', () => {
    cameraHost.append(cameraControls);
    guide.showModal();
    guide.querySelector('.fullscreen-guide-close').focus();
  });
  help.setAttribute('aria-haspopup', 'dialog');
  const annotate = button('Annotate', () => markupTrigger.click());
  annotate.className = 'fullscreen-annotate';
  button('Exit', () => fullscreenButton.click()).setAttribute('aria-label', 'Exit fullscreen');
  stage.querySelector('.stage__viewport').append(dock);
  guide.querySelector('.fullscreen-guide-close').addEventListener('click', () => guide.close());
  guide.addEventListener('close', () => {
    cameraHome.after(cameraControls);
    if (!dock.hidden) help.focus();
  });

  let wasFullscreen = false;
  function syncFullscreen() {
    const active = (document.fullscreenElement || document.webkitFullscreenElement) === stage;
    dock.hidden = !active;
    controls.inert = active;
    layers.inert = active;
    if (active && !wasFullscreen) {
      document.getElementById('viewerTools').open = false;
      const author = document.getElementById('authorModeBtn');
      if (author.getAttribute('aria-pressed') === 'true') author.click();
      help.focus();
    }
    if (!active && wasFullscreen) {
      if (guide.open) guide.close();
      const destination = stage.classList.contains('is-markup') ? document.getElementById('resume3dBtn') : fullscreenButton;
      destination.focus({preventScroll:true});
    }
    wasFullscreen = active;
  }
  function syncAnnotation() {
    annotate.disabled = markupTrigger.disabled;
  }
  new MutationObserver(syncAnnotation).observe(markupTrigger, {attributes:true, attributeFilter:['disabled']});
  document.addEventListener('anatomy-markup', event => {
    if (!event.detail.active && !dock.hidden) annotate.focus();
  });
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  syncAnnotation();
  syncFullscreen();
})();
