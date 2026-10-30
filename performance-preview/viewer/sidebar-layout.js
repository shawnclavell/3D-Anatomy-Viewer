/* Compact sidebar; retain the original structure buttons for Text Study. */
(function () {
  'use strict';
  var sidebar = document.querySelector('.sidebar');
  var list = document.getElementById('boneList');
  var search = document.getElementById('boneSearch');
  var section = list.closest('.sidebar__section');
  var label = document.createElement('label');
  label.htmlFor = 'structurePicker'; label.textContent = 'Choose a structure';
  var picker = document.createElement('select');
  picker.id = 'structurePicker'; picker.setAttribute('aria-describedby', 'structurePickerHelp');
  var apply = document.createElement('button');
  apply.type = 'button'; apply.className = 'btn'; apply.textContent = 'Select structure';
  var help = document.createElement('p');
  help.id = 'structurePickerHelp'; help.className = 'empty-note';
  help.textContent = 'Search to narrow the choices, then choose a structure and use Select structure. Hold Ctrl while clicking Select structure (or press Ctrl+Enter or Ctrl+Space) to add or deselect a muscle. Without Ctrl, selection replaces the current group.';
  section.insertBefore(label, list); section.insertBefore(picker, list); section.insertBefore(apply, list);
  function disclosure(title, contents, parent, before) {
    var details = document.createElement('details'); details.className = 'sidebar-disclosure';
    var summary = document.createElement('summary'); summary.textContent = title;
    details.appendChild(summary); parent.insertBefore(details, before || null);
    contents.forEach(function (node) { if (node) details.appendChild(node); });
    return details;
  }
  disclosure('Index instructions', [help], section, list);
  disclosure('Browse full index', [list], section);
  section.classList.remove('sidebar__section--grow');
  section.classList.add('structure-picker-panel');
  sidebar.insertBefore(section, sidebar.querySelector('.selection'));
  function sync() {
    var previous = picker.value;
    picker.replaceChildren();
    var placeholder = document.createElement('option'); placeholder.value = '';
    placeholder.textContent = 'Choose a structure'; picker.appendChild(placeholder);
    list.querySelectorAll('.bone-btn').forEach(function (button) {
      if (button.parentElement.style.display === 'none') return;
      var option = document.createElement('option'); option.value = button.dataset.mat;
      option.textContent = (button.getAttribute('aria-pressed') === 'true' ? 'Selected: ' : '') + button.textContent;
      picker.appendChild(option);
    });
    if (Array.from(picker.options).some(function (option) { return option.value === previous; })) picker.value = previous;
    var frozen = document.getElementById('markupModeBtn').getAttribute('aria-pressed') === 'true';
    picker.disabled = frozen || picker.options.length < 2;
    apply.disabled = picker.disabled || !picker.value;
  }
  picker.addEventListener('change', function () { apply.disabled = picker.disabled || !picker.value; });
  apply.addEventListener('keydown', function (event) {
    if (event.ctrlKey && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      apply.dispatchEvent(new MouseEvent('click', {bubbles:true,ctrlKey:true}));
    }
  });
  apply.addEventListener('click', function (event) {
    var button = Array.from(list.querySelectorAll('.bone-btn')).find(function (item) { return item.dataset.mat === picker.value; });
    if (button && !picker.disabled) button.dispatchEvent(new MouseEvent('click', {bubbles:true,ctrlKey:event.ctrlKey}));
    apply.focus();
  });
  new MutationObserver(sync).observe(list, {childList:true, subtree:true, attributes:true, attributeFilter:['aria-pressed','style','data-dissection-hidden']});
  document.addEventListener('anatomy-markup', sync);
  sync();
  // Secondary tools stay discoverable but do not fill the instruction column.
  ['structureLayers','annotationFilters'].forEach(function (id) {
    var node = document.getElementById(id);
    var container = id === 'structureLayers' ? node : node.closest('.sidebar__section');
    var heading = container.querySelector('h2');
    var contents = Array.from(container.children).filter(function (child) { return child !== heading; });
    disclosure(heading.textContent, contents, container); heading.hidden = true;
  });
  var removal = document.getElementById('sidebarDissectionTitle').closest('section');
  disclosure('Remove and restore structures', [removal], removal.parentElement, removal);
  var removalHeading = document.getElementById('sidebarDissectionTitle'); removalHeading.classList.add('visually-hidden');
  var multi = sidebar.querySelector('section[aria-label="Multiple muscle selection"]');
  if (multi) { var instructions = multi.querySelector('p'); disclosure('Selection instructions', [instructions], multi, instructions); }
  var footer = sidebar.querySelector('.sidebar__footer');
  var viewPanel = document.getElementById('sidebarViewPicker').closest('.view-picker-panel');
  var viewHelp = viewPanel.querySelector('p');
  if (viewHelp) disclosure('View instructions', [viewHelp], viewPanel);
  var attachmentHelp = document.getElementById('attachmentStatus');
  var attachmentDetails = disclosure('Attachment details', [attachmentHelp], attachmentHelp.parentElement, attachmentHelp);
  function syncAttachments() { attachmentDetails.hidden = attachmentHelp.hidden; }
  new MutationObserver(syncAttachments).observe(attachmentHelp, {attributes:true, attributeFilter:['hidden']});
  syncAttachments();
  // Requested order: model, layers, views, structures, attachments, removal.
  var layers = document.getElementById('structureLayers');
  var views = viewPanel.closest('.sidebar__section');
  var selection = sidebar.querySelector('.selection');
  sidebar.querySelector('.sidebar__header').insertAdjacentElement('afterend', layers);
  layers.insertAdjacentElement('afterend', views);
  views.insertAdjacentElement('afterend', section);
  section.insertAdjacentElement('afterend', selection);
  attachmentDetails.appendChild(document.getElementById('attachmentViewBtn'));
  selection.appendChild(attachmentDetails);
  selection.appendChild(removal.closest('details'));
  disclosure('Author tools and credits', [document.getElementById('authorModeBtn'),footer.querySelector('a')], footer);
}());
