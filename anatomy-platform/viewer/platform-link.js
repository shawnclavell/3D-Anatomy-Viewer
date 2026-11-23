(function () {
  "use strict";
  const query = new URLSearchParams(location.search);
  const back = document.createElement('a');
  back.href = query.get('return') === 'shoulder-arm' ? '../shoulder-arm.html' : '../index.html#systems';
  back.textContent = 'Return to anatomy platform';
  if (query.get('return') === 'shoulder-arm') {
    back.textContent = 'Return to shoulder and arm lesson';
    if (/^MUSC-\d{3}$/.test(query.get('course') || '')) back.href += '?target=' + query.get('course');
  }
  back.style.cssText = 'display:block;padding:12px;background:#142e39;color:white;min-height:44px;box-sizing:border-box';
  document.body.prepend(back);
  const sourceName = query.get('structure');
  if (!sourceName) return;
  const list = document.getElementById('boneList');
  const search = document.getElementById('boneSearch');
  function selectRequestedStructure() {
    const button = Array.from(list.querySelectorAll('button[data-mat]')).find(item => item.dataset.mat === sourceName);
    if (!button || button.disabled) return false;
    search.value = button.textContent;
    search.dispatchEvent(new Event('input', {bubbles:true}));
    button.click();
    const viewName = query.get('view');
    const views = document.getElementById('sidebarViewPicker');
    const option = views && Array.from(views.options).find(item => item.textContent === viewName);
    if (option) {
      views.value = option.value;
      views.dispatchEvent(new Event('change', {bubbles:true}));
    }
    observer.disconnect();
    return true;
  }
  const observer = new MutationObserver(selectRequestedStructure);
  observer.observe(list, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled']});
  selectRequestedStructure();
  document.getElementById('viewer').addEventListener('error', () => observer.disconnect(), {once:true});
})();
