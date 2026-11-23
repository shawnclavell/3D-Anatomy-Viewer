'use strict';
const search = document.getElementById('search');
const model = document.getElementById('model');
const results = document.getElementById('results');
const more = document.getElementById('more');
let registry;
let visibleCount = 40;

function linkFor(entry, representation) {
  const params = new URLSearchParams({model: representation.model});
  if (representation.base === 'viewer' && representation.indexed !== false) params.set('structure', representation.sourceName);
  if (registry.pilot.some(item => item.id === entry.id) && representation.model === 'layered') params.set('view', 'Right Elbow — Context');
  return representation.base + '/index.html?' + params.toString();
}

function addText(parent, tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  parent.append(element);
  return element;
}

function structureCard(entry, preferredModel) {
  const card = document.createElement('article');
  addText(card, 'h3', entry.label.replace(/\.l$/, ' (left)').replace(/\.r$/, ' (right)'));
  const representation = entry.representations.find(item => item.base + '/' + item.model === preferredModel)
    || entry.representations.find(item => item.model === preferredModel)
    || entry.representations.find(item => item.model === 'layered') || entry.representations[0];
  addText(card, 'small', representation.groupLabel + ' · ' + entry.side);
  const anchor = addText(card, 'a', 'Open in ' + representation.model);
  anchor.href = linkFor(entry, representation);
  anchor.style.display = 'block';
  if (entry.referenceCard) {
    const sourceCard = entry.referenceCard;
    addText(card, 'p', sourceCard.location);
    addText(card, 'p', sourceCard.description);
    if (sourceCard.relations) addText(card, 'p', 'Related anatomy — ' + sourceCard.relations);
  }
  if (entry.muscleDetails) {
    const disclosure = document.createElement('details');
    addText(disclosure, 'summary', 'Origin, insertion, action, and innervation');
    const list = document.createElement('dl');
    for (const field of ['origin', 'insertion', 'action', 'innervation']) {
      addText(list, 'dt', field[0].toUpperCase() + field.slice(1));
      addText(list, 'dd', entry.muscleDetails[field] || 'Description pending');
    }
    disclosure.append(list);
    card.append(disclosure);
  }
  const sources = entry.muscleDetails?.sources || entry.referenceCard?.sources || [];
  for (const source of sources) {
    const paragraph = document.createElement('p');
    const citation = addText(paragraph, 'a', source.title);
    citation.href = source.url;
    card.append(paragraph);
  }
  addText(card, 'small', entry.reviewStatus);
  return card;
}

function renderResults() {
  if (!registry) return;
  const query = search.value.trim().toLowerCase();
  const matches = registry.entries.filter(entry =>
    (entry.label + ' ' + entry.sourceName).toLowerCase().includes(query)
    && (!model.value || entry.representations.some(item => item.base + '/' + item.model === model.value)));
  results.replaceChildren();
  for (const entry of matches.slice(0, visibleCount)) {
    results.append(structureCard(entry, model.value));
  }
  document.getElementById('status').textContent = matches.length + ' matching structures. Showing ' + Math.min(visibleCount, matches.length) + '.';
  more.hidden = visibleCount >= matches.length;
}

fetch('registry.json').then(response => {
  if (!response.ok) throw new Error('Registry request failed');
  return response.json();
}).then(data => {
  registry = data;
  document.getElementById('inventory').textContent = data.entries.length.toLocaleString() + ' exact source identities across ' + data.models.length + ' model configurations. Similar source names await a reviewed crosswalk.';
  for (const item of data.models) {
    const option = addText(model, 'option', item.base + ' / ' + item.label);
    option.value = item.base + '/' + item.route;
  }
  const byId = new Map(data.entries.map(entry => [entry.id, entry]));
  for (const item of data.pilot) document.getElementById('pilot-links').append(structureCard(byId.get(item.id), 'layered'));
  renderResults();
}).catch(() => {
  document.getElementById('inventory').textContent = 'The registry could not load. Open this package through the local web server described in README.md, then reload.';
});
search.addEventListener('input', () => { visibleCount = 40; renderResults(); });
model.addEventListener('change', () => { visibleCount = 40; renderResults(); });
more.addEventListener('click', () => { visibleCount += 40; renderResults(); });
