'use strict';
const targetPicker = document.getElementById('target');
const fields = [
  ['identification', 'Identification', 'Describe the location and recognition cues you use to identify this muscle.'],
  ['attachments', 'Attachments', 'Name its origin and insertion. Distinguish named heads or parts where appropriate.'],
  ['actions', 'Actions', 'Describe its actions and identify the joints involved.'],
  ['innervation', 'Innervation', 'Name its nerve supply. Include the stated levels when supplied by the reference.'],
  ['relationships', 'Relationships', 'Describe its position relative to nearby anatomy and connect its attachments to the relevant bones or tissues.'],
  ['application', 'Movement application', 'Use the movement connection for this muscle. Choose one listed action and explain how its attachments support that action at the relevant joint.'],
];
const storageKey = 'bio201-shoulder-arm-responses-v1';
let lesson;
let exportUrl;
let drafts = {};
try { drafts = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { drafts = {}; }
if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) drafts = {};

function text(parent, tag, value) {
  const element = document.createElement(tag);
  element.textContent = value;
  parent.append(element);
  return element;
}

function currentTarget() {
  return lesson.targets.find(target => target.id === targetPicker.value);
}

function answerFor(target, objective) {
  switch (objective) {
    case 'identification': return target.location + ' ' + target.recognition;
    case 'attachments': return 'Origin — ' + target.origin + '\nInsertion — ' + target.insertion;
    case 'actions': return target.action + '\nUse the attachment descriptions to identify the joint or joints crossed; explain your reasoning.';
    case 'innervation': return target.parts.map(part => part.name.replace(/\.r$/, '') + ' — ' + part.details.innervation).join('\n');
    case 'relationships': return target.location + ' ' + target.recognition + '\nOrigin — ' + target.origin + '\nInsertion — ' + target.insertion;
    case 'application': return 'Reference action — ' + target.action + '\nSupport your explanation using these attachments.\nOrigin — ' + target.origin + '\nInsertion — ' + target.insertion + '\nCompare your explanation with the stated action and discuss the line of pull with your instructor.';
  }
}

function renderTarget() {
  const target = currentTarget();
  const links = document.getElementById('part-links');
  const explore = document.getElementById('explore-content');
  const review = document.getElementById('review-content');
  const form = document.getElementById('assignment-form');
  const sources = document.getElementById('sources');
  for (const element of [links, explore, review, form, sources]) element.replaceChildren();
  const movement = document.getElementById('movement-content');
  movement.replaceChildren();
  text(movement, 'p', target.name + ' — ' + target.action);
  for (const connection of target.movementConnections) {
    const activity = document.createElement('article');
    if (connection === 'shoulder') {
      text(activity, 'h3', 'Shoulder movement activity');
      text(activity, 'p', 'Choose a listed shoulder action for ' + target.name + '. Describe how the arm changes position relative to the trunk. Use the muscle’s origin and insertion to explain its pull across the shoulder joint. Distinguish the heads or parts when their actions differ.');
      const parameters = new URLSearchParams({model:'shoulder-arm', structure:target.parts[0].name, return:'shoulder-arm', course:target.id, view:'Right Shoulder — Context'});
      text(activity, 'a', 'Inspect this muscle at the shoulder').href = 'viewer/index.html?' + parameters;
      if (['MUSC-031', 'MUSC-032'].includes(target.id)) {
        const motion = document.createElement('p');
        text(motion, 'a', 'Open shoulder abduction and return').href = 'movements/index.html?movement=shoulder&course=' + target.id;
        activity.append(motion);
        const guide = document.createElement('p');
        text(guide, 'a', 'Read the shoulder movement sequence and practice answers').href = 'movements/study.html#shoulder';
        activity.append(guide);
        text(activity, 'p', 'The joint-motion prototype keeps the scapula fixed and rotates the arm from the source-rest pose. Muscle deformation and full shoulder-girdle motion require further modeling.');
      } else {
        text(activity, 'p', 'Use the anatomy model and text references for this action. Its corresponding movement animation is in preparation.');
      }
    } else {
      const isElbow = connection === 'elbow';
      text(activity, 'h3', isElbow ? 'Elbow movement study' : 'Forearm rotation study');
      text(activity, 'p', isElbow
        ? 'Compare the selected muscle’s elbow action with the flexion and extension sequence. Identify the fixed upper arm and moving forearm and hand.'
        : 'Compare the selected muscle’s forearm action with the radius-and-hand rotation study. The illustrative axis and rotation direction remain under instructor review.');
      text(activity, 'a', 'Open ' + connection + ' movement study').href = 'movements/index.html?movement=' + connection;
      const guide = document.createElement('p');
      text(guide, 'a', 'Read the movement sequence and practice answers').href = 'movements/study.html#' + connection;
      activity.append(guide);
    }
    movement.append(activity);
  }
  for (const part of target.parts) {
    const parameters = new URLSearchParams({model:'shoulder-arm', structure:part.name, return:'shoulder-arm', course:target.id});
    const link = text(links, 'a', part.name.replace(/\.r$/, ' (right)'));
    link.href = 'viewer/index.html?' + parameters;
    link.className = 'part-link';
  }
  text(explore, 'h3', target.name);
  text(explore, 'p', target.location);
  text(explore, 'p', target.recognition);
  const description = document.createElement('dl');
  for (const [label, value] of [['Origin',target.origin],['Insertion',target.insertion],['Actions',target.action],['Innervation',answerFor(target,'innervation')]]) {
    text(description, 'dt', label);
    text(description, 'dd', value);
  }
  explore.append(description);
  for (const [key, label, prompt] of fields) {
    const question = document.createElement('article');
    text(question, 'h3', label);
    text(question, 'p', prompt);
    const answer = document.createElement('details');
    text(answer, 'summary', 'Reveal reference answer');
    text(answer, 'p', answerFor(target, key)).className = 'preserve-lines';
    question.append(answer);
    review.append(question);
    const field = document.createElement('div');
    field.className = 'response-field';
    const labelElement = text(field, 'label', label + ' — ' + prompt);
    labelElement.htmlFor = 'response-' + key;
    const input = document.createElement('textarea');
    input.id = 'response-' + key;
    input.name = key;
    input.rows = 4;
    input.value = typeof drafts[target.id]?.[key] === 'string' ? drafts[target.id][key] : '';
    input.addEventListener('input', () => {
      document.getElementById('export-result').hidden = true;
      if (!drafts[target.id] || typeof drafts[target.id] !== 'object') drafts[target.id] = {};
      drafts[target.id][key] = input.value;
      try {
        localStorage.setItem(storageKey, JSON.stringify(drafts));
        document.getElementById('draft-status').textContent = 'Responses saved in this browser.';
      } catch {
        document.getElementById('draft-status').textContent = 'Browser saving is unavailable. Download your responses before leaving this page.';
      }
    });
    field.append(input);
    form.append(field);
  }
  const references = [{title:'BIO201 atlas anatomy reference',url:target.source}, ...target.parts.flatMap(part => part.details.sources || [])];
  const seen = new Set();
  for (const reference of references) {
    if (seen.has(reference.url)) continue;
    seen.add(reference.url);
    const paragraph = document.createElement('p');
    text(paragraph, 'a', reference.title).href = reference.url;
    sources.append(paragraph);
  }
  text(sources, 'p', target.reviewStatus);
  document.getElementById('draft-status').textContent = 'Your responses are retained separately for each muscle.';
  document.getElementById('export-result').hidden = true;
  const url = new URL(location.href);
  url.searchParams.set('target', target.id);
  history.replaceState(null, '', url);
}

document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(control => {
      const active = control === button;
      control.setAttribute('aria-pressed', String(active));
      document.getElementById(control.dataset.mode).hidden = !active;
    });
    document.getElementById(button.dataset.mode + '-title').focus();
  });
});
targetPicker.addEventListener('change', renderTarget);
document.getElementById('assignment-form').addEventListener('submit', event => event.preventDefault());
document.getElementById('download').addEventListener('click', () => {
  const content = ['BIO201 — Shoulder and arm muscles', 'Written responses', ''];
  for (const target of lesson.targets) {
    if (!drafts[target.id]) continue;
    content.push(target.id + ' — ' + target.name);
    for (const [key, label] of fields) content.push(label, drafts[target.id][key] || '(No response)', '');
  }
  if (content.length === 3) content.push('No responses entered.');
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(new Blob([content.join('\n')], {type:'text/plain;charset=utf-8'}));
  const link = document.getElementById('response-file');
  link.href = exportUrl;
  document.getElementById('response-copy').value = content.join('\n');
  document.getElementById('export-result').hidden = false;
  document.getElementById('draft-status').textContent = 'Response file prepared. Download it or copy the text below.';
  link.focus();
});
fetch('shoulder-arm.json?v=2').then(response => {
  if (!response.ok) throw new Error('Lesson unavailable');
  return response.json();
}).then(data => {
  lesson = data;
  for (const target of lesson.targets) text(targetPicker, 'option', target.name).value = target.id;
  const requested = new URLSearchParams(location.search).get('target');
  if (lesson.targets.some(target => target.id === requested)) targetPicker.value = requested;
  targetPicker.disabled = false;
  document.getElementById('download').disabled = false;
  document.getElementById('scope').textContent = '13 course targets · 20 right-side muscle parts · Shoulder joint and arm/elbow groups from your BIO201 atlas.';
  renderTarget();
}).catch(() => { document.getElementById('scope').textContent = 'The lesson could not load. Reload this page through the local preview server.'; });
