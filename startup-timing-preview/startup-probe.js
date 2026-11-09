(function () {
  'use strict';

  const viewer = document.getElementById('viewer');
  customElements.whenDefined('model-viewer').then(() => {
    performance.mark('startup:model-viewer-defined');
  });
  viewer.addEventListener('load', () => performance.mark('startup:model-loaded'), {once: true});
  viewer.addEventListener('error', () => performance.mark('startup:model-error'), {once: true});
  viewer.addEventListener('model-visibility', event => {
    if (event.detail.visible && !performance.getEntriesByName('startup:model-visible').length) {
      performance.mark('startup:model-visible');
    }
  });
}());
