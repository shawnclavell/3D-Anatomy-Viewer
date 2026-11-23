/* Organize the combined model's existing controls without changing actions. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('model') !== 'layered') return;
  var host = document.getElementById('layerButtons');
  if (!host) return;
  var groups = [
    ['Skin', ['skin']],
    ['Connective coverings', ['fascia', 'bursae', 'sheaths']],
    ['Muscles and attachments', ['muscles', 'tendons', 'origin', 'insertion']],
    ['Skeleton and nervous system', ['skeleton', 'central', 'peripheral', 'meninges', 'senses']]
  ];
  function arrange() {
    if (host.querySelectorAll('button[data-layer]').length !== 13) return false;
    host.classList.add('layered-groups');
    groups.forEach(function (group) {
      var field = document.createElement('fieldset');
      field.className = 'layered-group';
      var legend = document.createElement('legend');
      legend.textContent = group[0];
      field.appendChild(legend);
      var row = document.createElement('div');
      row.className = 'layered-group__buttons';
      group[1].forEach(function (id) {
        var button = host.querySelector('button[data-layer="' + id + '"]');
        if (button) row.appendChild(button);
      });
      field.appendChild(row);
      host.appendChild(field);
    });
    return true;
  }
  if (!arrange()) {
    var observer = new MutationObserver(function () {
      if (arrange()) observer.disconnect();
    });
    observer.observe(host, {childList: true});
  }
}());
