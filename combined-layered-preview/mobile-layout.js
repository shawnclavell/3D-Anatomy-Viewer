/* Match the reading and keyboard order to the narrow-screen layout. */
(function () {
  'use strict';
  var narrow = window.matchMedia('(max-width: 760px), (max-width: 1024px) and (any-pointer: coarse)');
  var sidebar = document.querySelector('.sidebar');
  var stage = document.querySelector('.stage');
  var controls = stage.querySelector('.access-controls');
  var search = document.getElementById('boneSearch');
  var viewer = document.getElementById("viewer");
  var jump = document.createElement('a');
  jump.className = 'mobile-structure-link';
  jump.href = '#boneSearch';
  jump.textContent = 'Find a structure';
  jump.addEventListener('click', function (event) {
    event.preventDefault();
    search.focus({ preventScroll: true });
    search.scrollIntoView({ block: 'center' });
  });
  controls.insertBefore(jump, controls.querySelector('.viewer-history-controls'));
  var back = document.createElement('a');
  back.className = 'mobile-model-link';
  back.href = '#viewer';
  back.textContent = 'Back to 3D model';
  back.addEventListener('click', function (event) {
    event.preventDefault();
    viewer.focus({ preventScroll: true });
    viewer.scrollIntoView({ block: 'start' });
  });
  search.closest('.sidebar__section').appendChild(back);

  function updateLayout() {
    var compact = narrow.matches;
    var focused = document.activeElement;
    stage.classList.toggle('stage--compact', compact);
    // Move the sidebar so the WebGL element and fullscreen target stay connected.
    if (compact && sidebar.nextElementSibling === stage) {
      stage.after(sidebar);
    } else if (!compact && stage.nextElementSibling === sidebar) {
      stage.before(sidebar);
    }
    if (sidebar.contains(focused) && focused !== back && document.activeElement !== focused) {
      focused.focus({ preventScroll: true });
    } else if (!compact && focused === back) {
      viewer.focus();
    } else if (!compact && focused === jump) {
      search.focus();
    }
  }
  narrow.addEventListener('change', updateLayout);
  updateLayout();
}());
