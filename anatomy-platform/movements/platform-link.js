const requestedMovement = new URLSearchParams(location.search).get('movement');
const picker = document.getElementById('movement');
if (Array.from(picker.options).some(option => option.value === requestedMovement)) {
  picker.value = requestedMovement;
}
const back = document.createElement('a');
back.href = '../index.html#pilot';
back.textContent = 'Return to anatomy platform';
document.querySelector('main').prepend(back);

if (requestedMovement === 'shoulder') {
  activeMovementId = 'shoulder';
  document.querySelector('#movement-title').textContent = movements.shoulder.title;
  document.querySelector('#movement-description').textContent = movements.shoulder.description;
  document.querySelector('#review-warning').textContent = movements.shoulder.warning;
  document.querySelector('#bone-key').textContent = movements.shoulder.key;
  viewer.setAttribute('animation-name', movements.shoulder.clip);
  viewer.setAttribute('src', movements.shoulder.file);
  picker.dispatchEvent(new Event('change', {bubbles:true}));
  customElements.whenDefined('model-viewer').then(() => loadMovement());
  const course = new URLSearchParams(location.search).get('course');
  back.href = '../shoulder-arm.html?target=' + (course === 'MUSC-032' ? course : 'MUSC-031');
  back.textContent = 'Return to shoulder muscle lesson';
}
