const viewer = document.querySelector('#viewer');
const timeline = document.querySelector('#scrub');
const play = document.querySelector('#play');
const time = document.querySelector('#time');
const status = document.querySelector('#status');
let loaded = false;
let loadFailed = false;
let retryCount = 0;
let activeMovementId = "elbow";
const movements = {
  elbow: {
    file: 'elbow-preview.glb?revision=4', clip: 'Elbow flexion-extension (provisional)',
    title: 'Elbow flexion and extension',
    description: 'Source-referenced elbow hinge with the wrist and fingers held in a fixed pose. Anatomical review pending; muscles are not simulated.',
    warning: 'Review elbow axis, articulation clearance, direction, and the illustrative 0–120° excursion.',
    poses: ['Start pose', 'Mid-flexion', 'Peak flexion', 'Mid-extension']
  },
  forearm: {
    file: 'forearm-preview.glb?revision=2', clip: 'Forearm rotation study (provisional)',
    title: 'Forearm rotation — revised axis study',
    description: 'Elbow held at 90°. Radius and hand rotate together while the ulna remains fixed. Estimated landmarks and a 140° excursion require anatomical review.',
    warning: 'Revised distal axis: transverse ulnar-head region fit, shifted 7.2 mm from the original proxy. In 61 sampled poses, overlap candidates remain in the last seven (up to 8 polygon pairs). This is not anatomical approval. Coupled ulna motion, wrist motion, and muscles are omitted.',
    poses: ['Source rest pose', 'Toward pronation', 'Rotation endpoint', 'Return toward supination']
  }
};
movements.baseline = {
  ...movements.forearm,
  file: 'forearm-baseline.glb',
  title: 'Forearm rotation — original axis study',
  warning: 'Original distal-tip centroid proxy retained for comparison. Screening flagged overlap candidates in four of five original sampled poses (4–22 polygon pairs). Sampling density differs from the revised build; use axis-comparison.json for the matched-angle comparison.'
};
movements.headfit = {
  ...movements.forearm,
  file: 'forearm-headfit.glb?revision=2',
  title: 'Forearm rotation — radial-head fit candidate',
  description: 'Separate review candidate: a circle fit to the radial-head region replaces the rig pivot. Magenta spheres and line are estimated axis guides, not anatomy. The elbow stays at 90°; radius and hand rotate together.',
  warning: 'The 2–6 mm radial-head band fits a circle closely (0.28 mm radial RMS), but clearance is worse: 12 of 61 poses have overlap candidates, up to 15 polygon pairs. This candidate is for landmark review and does not replace the revised-axis model.'
};

movements.ankle = {
  file: 'ankle-preview.glb', clip: 'Ankle dorsiflexion-plantarflexion (provisional)',
  title: 'Ankle dorsiflexion and plantarflexion',
  description: 'Right lower leg and foot. The foot moves toward the front of the leg in dorsiflexion, then points downward in plantarflexion. Tibia and fibula stay fixed; foot and toes move as one segment.',
  warning: 'Source-referenced RightFoot hinge; illustrative 20° dorsiflexion and 35° plantarflexion, not universal normal ranges. Axis, joint clearance and direction require review. Geometry screening flags fibula–talus overlap in the source start pose and tibia–talus overlap during plantarflexion. No subtalar/toe articulation, muscles, tendons or cartilage.',
  poses: ['Neutral', 'Dorsiflexion', 'Return to neutral', 'Plantarflexion'],
  bones: 29, camera: '100deg 75deg 1.8m',
  alt: 'Right tibia, fibula, talus, and foot bones demonstrating ankle dorsiflexion and plantarflexion',
  key: 'Bone key: blue — fibula; amber — talus; ivory — tibia and remaining foot bones.'
};

movements.knee = {
  file: 'knee-preview.glb', clip: 'Knee flexion-extension (provisional)',
  title: 'Knee flexion and extension',
  description: 'Right femur, tibia, fibula, and foot. The lower leg bends behind the thigh and returns toward extension. The ankle and toes stay fixed. Patella tracking is not modeled in this animation.',
  warning: 'Illustrative source-referenced 0–120° hinge approximation. Femur–tibia overlap candidates occur in 56 of 61 sampled outward poses; joint translation and rollback are omitted. This is an unapproved motion study, with no cartilage, menisci, ligaments or muscles.',
  poses: ['Extended source pose', 'Mid-flexion', 'Flexion endpoint', 'Returning to extension'],
  bones: 30, camera: '100deg 75deg 2.2m',
  alt: 'Right femur, tibia, fibula and foot demonstrating provisional knee flexion and extension; patella omitted',
  key: 'Bone key: blue — tibia; amber — fibula; ivory — femur and foot.'
};
movements.kneerest = {
  ...movements.knee, file: 'knee-neutral.glb', clip: '', static: true,
  title: 'Knee source-rest reference with patella',
  description: 'Static source-rest reference including the patella in pink. Patella tracking is unresolved and is not animated. This view retains the source position without inventing a movement path.',
  warning: 'The source Patella.r mesh is linked to a bone named Patella.l.001. Its constraints require further inspection before motion can be used. Static geometry and joint alignment still need anatomical review.',
  key: 'Bone key: pink — patella; blue — tibia; amber — fibula; ivory — femur and foot.',
  alt: 'Static right femur, tibia, fibula, patella and foot in the source rest pose',
  bones: 31, staticStatus: 'Static knee reference loaded — 31 meshes, including patella; no animation.'
};
movements.kneefull = {
  ...movements.knee,
  file: 'knee-source-controls.glb', clip: 'Knee source-control flexion (provisional)',
  title: 'Knee flexion — refined source controls',
  description: 'Source RightLeg target drives two knee tracking controls. The lower leg follows the resulting rotation and positional change while the femur stays fixed. Patella tracking is not included.',
  warning: 'Improved source-control study: 11 of 61 outward poses have femur–tibia overlap candidates (maximum 27 polygon pairs). Endpoint is approximately 117.5° of lower-leg rotation. This reproduces selected source constraints, not measured knee biomechanics; cartilage, menisci, muscles and patella motion remain absent.'
};
movements.hip = {
  file: 'hip-preview.glb', clip: 'Hip flexion-extension (provisional)',
  title: 'Hip flexion and extension',
  description: 'The right limb moves forward in hip flexion and backward in extension while the pelvis stays fixed. The knee and ankle remain in their source-rest positions; patella moves with the limb without separate tracking.',
  warning: 'Source RightUpLeg control; illustrative 90° flexion and 20° extension offsets, not measured normal ranges. Hip-bone/femur surface overlap candidates include the source-rest pose and remain unresolved. No pelvic compensation, muscles, cartilage or capsule is modeled.',
  poses: ['Source rest pose', 'Hip flexion', 'Return to source rest', 'Hip extension'],
  bones: 35, camera: '100deg 75deg 2.7m',
  key: 'Bone key: blue — right hip bone; amber — right femur; pink — patella; ivory — remaining pelvis and limb.',
  alt: 'Fixed pelvis and right lower limb demonstrating hip flexion and extension with the knee held extended'
};
movements.hipabduction = {
  ...movements.hip,
  file: 'hip-abduction.glb', clip: 'Hip abduction-adduction (provisional)',
  title: 'Hip abduction and adduction',
  description: 'The right leg moves outward in abduction, then returns toward the midline in adduction. The pelvis stays fixed; knee and ankle remain in the source-rest pose. Adduction stops at the source-rest position.',
  warning: 'Illustrative 40° excursion using the source RightUpLeg rest local Z axis. This is a geometric motion study, not a measured normal range. Source-rest hip/femur surface overlap flags remain; joint alignment and direction require anatomical review. No pelvic compensation, muscles, cartilage or capsule is modeled.',
  poses: ['Source rest pose', 'Abduction endpoint', 'Adduction toward midline', 'Returned to source rest'],
  times: [0, 1.5, 2.75, 3.5], camera: '0deg 80deg 2.7m',
  alt: 'Fixed pelvis and right lower limb moving outward in hip abduction, then returning toward the midline in adduction'
};
for (const [id, label, slug] of [['hipflexion', 'Hip flexion', 'hip-flexion'], ['hipextension', 'Hip extension', 'hip-extension']]) {
  movements[id] = {
    ...movements.hip, file: slug + '.glb', clip: label + ' (provisional)',
    title: label + ' — separate demonstration', once: true, video: slug + '.mp4',
    alt: 'Right leg demonstrating ' + label.toLowerCase() + ', with the pelvis fixed and knee extended.',
    description: label + ' from the source-rest pose, followed by an endpoint hold. Pelvis stays fixed and knee remains extended. Reset to replay.',
    poses: ['Source rest pose', 'During movement', label, 'Endpoint hold'],
    times: [0, 1.25, 2.5, 3.5]
  };
}
movements.shoulder = {
  file: 'shoulder-abduction.glb', clip: 'Shoulder abduction-return (provisional)',
  title: 'Shoulder abduction and return — joint-motion study',
  description: 'Right humerus and the rest of the arm move away from the trunk, then return. Scapula, clavicle, sternum, and manubrium remain fixed. Compare this motion with the deltoid and supraspinatus anatomy references.',
  warning: 'Illustrative 45-degree additional rotation from the source-rest pose, which already has the arm offset from the trunk. Scapular motion, humeral axial rotation, joint translation, and muscle deformation remain to be modeled. This is a glenohumeral hinge approximation with anatomy review pending.',
  poses: ['Source-rest arm', 'During abduction', 'Abduction endpoint', 'Return to source rest'],
  times: [0, 0.75, 1.5, 3.5], bones: 34, camera: '0deg 85deg 1.5m',
  alt: 'Right arm bones move outward about a source shoulder pivot while the scapula, clavicle, and two sternal bones remain fixed, then the arm returns.',
  key: 'Bone key: blue — scapula; amber — humerus; ivory — clavicle, sternal bones, forearm, and hand. Names and text identify the structures as well as color.'
};

function loadMovement() {
  activeMovementId = document.querySelector("#movement").value;
  const movement = movements[activeMovementId];
  const retry = loadFailed;
  loadFailed = false;
  loaded = false;
  document.querySelector('#pose-status').textContent = '';
  document.querySelector('#camera-status').textContent = '';
  document.querySelector('#seek-time').removeAttribute('aria-invalid');
  if (typeof viewer.pause !== 'function') {
    loadFailed = true;
    setModelControls(false, false);
    updateStudy(activeMovementId);
    document.querySelector('#library-help').hidden = false;
    status.textContent = 'The 3D viewer library is not ready or is unavailable. Text study and the text-only guide remain available. Reload the page to retry the library.';
    return;
  }
  document.querySelector('#library-help').hidden = true;
  viewer.pause();
  setModelControls(false, false);
  document.querySelector('#movement-title').textContent = movement.title;
  document.querySelector('#movement-description').textContent = movement.description;
  document.querySelector('#review-warning').textContent = movement.warning;
  document.querySelector('#bone-key').textContent = movement.key || (movement.static
    ? 'Overlay key: translucent blue/amber — atlas ulna/radius; opaque green/magenta — source ulna/radius.'
    : 'Bone key: blue — ulna; amber — radius; ivory — humerus and hand where included.');
  document.querySelectorAll('[data-time]').forEach((button, i) => {
    button.textContent = movement.poses[i];
    button.dataset.time = (movement.times || [0, 1, 2, 3])[i];
  });
  const video = document.querySelector('#movement-video');
  video.pause();
  document.querySelector('#video-panel').hidden = !movement.video;
  if (movement.video) {
    video.src = movement.video;
    video.setAttribute('aria-label', movement.title + ' video');
    document.querySelector('#video-download').href = movement.video;
    document.querySelector('#video-download').textContent = 'Download ' + movement.title + ' (MP4)';
  } else video.removeAttribute('src');
  document.querySelectorAll('[data-time]').forEach(button => button.hidden = !!movement.static);
  ['#play', '#reset', '#speed', '#scrub', '#time', '#step-back', '#step-forward', '#seek-time', '#seek-button'].forEach(selector => {
    const control = document.querySelector(selector);
    (control.closest('label') || control).hidden = !!movement.static;
  });
  viewer.alt = movement.alt || movement.title + '. ' + movement.description;
  viewer.animationName = movement.clip;
  status.textContent = 'Loading movement…';
  if (retry) viewer.src = movement.file + (movement.file.includes('?') ? '&' : '?') + 'loadRetry=' + (++retryCount);
  else if (viewer.loaded && viewer.src === movement.file) onMovementLoaded();
  else viewer.src = movement.file;
  viewer.cameraOrbit = movement.camera || '45deg 75deg 1.2m';
  updateStudy(activeMovementId);
  document.title = movement.title + ' — anatomy movement review';
  document.querySelector('#choice-status').textContent = movement.title + ' selected for loading.';
}
function sync() {
  timeline.value = viewer.currentTime;
  const current = Number.isFinite(viewer.currentTime) ? viewer.currentTime : 0;
  const duration = Number.isFinite(viewer.duration) ? viewer.duration : 0;
  time.textContent = `${current.toFixed(2)} / ${duration.toFixed(2)} s`;
  timeline.setAttribute('aria-valuetext', current.toFixed(2) + ' seconds of ' + duration.toFixed(2));
  play.textContent = viewer.paused ? 'Play' : 'Pause';
}
function seek(seconds) {
  viewer.pause();
  // model-viewer 3.5 seeks through the animation mixer, whose timeScale also
  // affects setTime. Seek at unit speed, then restore the playback preference.
  const speed = viewer.timeScale;
  viewer.timeScale = 1;
  viewer.currentTime = Math.max(0, Math.min(viewer.duration || 0, seconds));
  viewer.timeScale = speed;
  sync();
}
function onMovementLoaded() {
  loadFailed = false;
  const ready = viewer.availableAnimations.length > 0;
  const movement = movements[activeMovementId];
  loaded = ready;
  viewer.timeScale = Number(document.querySelector('#speed').value);
  setModelControls(ready, true);
  document.querySelector('#view').disabled = false;
  document.querySelector('#speed').disabled = !ready;
  timeline.max = viewer.duration;
  const guides = activeMovementId === 'headfit' ? ', three non-anatomical guides' : '';
  status.textContent = movement.static ? (movement.staticStatus || 'Static registration overlay loaded — four bone meshes, no animation.')
    : ready ? `Ready — ${movement.bones || 30} bone meshes${guides}, one movement clip. Anatomical review pending.` : 'No animation found.';
  sync();
  requestAnimationFrame(() => { timeline.max = viewer.duration; sync(); });
}
viewer.addEventListener('load', onMovementLoaded);
viewer.addEventListener('error', () => { loaded = false; loadFailed = true; setModelControls(false, false); status.textContent = '3D movement could not load. Text study remains available. Use Load selected movement to retry.'; });
play.addEventListener('click', () => {
  if (viewer.paused) {
    const movement = movements[activeMovementId];
    if (movement.once && viewer.currentTime >= viewer.duration - 0.02) seek(0);
    viewer.play(movement.once ? { repetitions: 1 } : undefined);
  } else viewer.pause();
  sync();
});
viewer.addEventListener('finished', () => { viewer.pause(); sync(); });
document.querySelector('#reset').addEventListener('click', () => seek(0));
document.querySelector('#view').addEventListener('click', () => {
  viewer.cameraOrbit = movements[activeMovementId].camera || '45deg 75deg 1.2m';
  viewer.cameraTarget = 'auto auto auto';
});
document.querySelector('#speed').addEventListener('change', event => viewer.timeScale = Number(event.target.value));
timeline.addEventListener('input', () => seek(Number(timeline.value)));
document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => { seek(Number(button.dataset.time)); document.querySelector('#pose-status').textContent = button.textContent + ', ' + viewer.currentTime.toFixed(2) + ' seconds.'; }));
function tick() { if (loaded && !viewer.paused) sync(); requestAnimationFrame(tick); }
requestAnimationFrame(tick);
/* Text access is independent of successful WebGL/model loading. */
function setModelControls(animationReady, cameraReady) {
  document.querySelectorAll('#play, #reset, #speed, #scrub, [data-time], [data-animation-control]').forEach(control => control.disabled = !animationReady);
  document.querySelectorAll('[data-camera], #view').forEach(control => control.disabled = !cameraReady);
}
function populateSequence(container, id) {
  container.replaceChildren();
  studySequences[id].forEach(text => { const li = document.createElement('li'); li.textContent = text; container.append(li); });
}
function updateStudy(id) {
  const movement = movements[id];
  document.querySelector('#study-name').textContent = movement.title;
  document.querySelector('#study-description').textContent = movement.description;
  document.querySelector('#study-limits').textContent = movement.warning;
  populateSequence(document.querySelector('#study-poses'), id);
  const activeVideo = movements[activeMovementId];
  document.querySelector('#video-text').textContent = activeVideo.video ? 'Video alternative: ' + studySequences[activeMovementId].join(' ') + ' ' + activeVideo.warning : '';
}
Object.entries(movements).forEach(([id, movement]) => {
  const article = document.createElement('article');
  const heading = document.createElement('h3'); heading.textContent = movement.title; article.append(heading);
  const description = document.createElement('p'); description.textContent = movement.description; article.append(description);
  const sequence = document.createElement('ol'); populateSequence(sequence, id); article.append(sequence);
  const limits = document.createElement('p'); limits.textContent = movement.warning; article.append(limits);
  document.querySelector('#all-movement-text').append(article);
});
document.querySelector('#movement').addEventListener('change', event => {
  updateStudy(event.target.value);
  document.querySelector('#choice-status').textContent = movements[event.target.value].title + ' text study ready. Use Load selected movement to change the 3D view.';
});
document.querySelector('#load-movement').addEventListener('click', loadMovement);
function stepBy(amount) { seek(viewer.currentTime + amount); document.querySelector('#pose-status').textContent = 'Paused at ' + viewer.currentTime.toFixed(2) + ' seconds.'; }
document.querySelector('#step-back').addEventListener('click', () => stepBy(-0.25));
document.querySelector('#step-forward').addEventListener('click', () => stepBy(0.25));
document.querySelector('#seek-time').addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
document.querySelector('#seek-button').addEventListener('click', () => {
  const input = document.querySelector('#seek-time');
  if (!input.checkValidity() || input.value === '') { input.setAttribute('aria-invalid', 'true'); document.querySelector('#pose-status').textContent = 'Enter a time from 0 to ' + (viewer.duration || 4) + ' seconds.'; input.focus(); return; }
  input.removeAttribute('aria-invalid');
  seek(input.valueAsNumber); document.querySelector('#pose-status').textContent = 'Paused at ' + viewer.currentTime.toFixed(2) + ' seconds.';
});
viewer.addEventListener('load', () => { document.querySelector('#seek-time').max = viewer.duration || 4; });
document.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => {
  const orbit = viewer.getCameraOrbit(), target = viewer.getCameraTarget();
  let theta = orbit.theta * 180 / Math.PI, phi = orbit.phi * 180 / Math.PI, radius = orbit.radius;
  const action = button.dataset.camera;
  if (action === 'left') theta -= 15;
  if (action === 'right') theta += 15;
  if (action === 'up') phi -= 10;
  if (action === 'down') phi += 10;
  if (action === 'in') radius *= 0.85;
  if (action === 'out') radius *= 1.15;
  const pan = radius * 0.08;
  if (action.startsWith('pan-')) {
    const horizontal = action === 'pan-left' ? -pan : action === 'pan-right' ? pan : 0;
    viewer.cameraTarget = `${target.x + horizontal * Math.cos(orbit.theta)}m ${target.y + (action === 'pan-up' ? pan : action === 'pan-down' ? -pan : 0)}m ${target.z - horizontal * Math.sin(orbit.theta)}m`;
  } else viewer.cameraOrbit = `${theta}deg ${Math.max(10, Math.min(170, phi))}deg ${Math.max(0.05, Math.min(3, radius))}m`;
  document.querySelector('#camera-status').textContent = button.textContent + '. Camera position changed.';
  if (reducedMotion.matches) viewer.jumpCameraToGoal();
}));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function applyMotionPreference() {
  document.querySelector('#motion-preference').textContent = reducedMotion.matches ? 'Reduced motion preference detected. Animation remains paused until you select Play. Camera buttons move directly to their new position.' : 'Animations are paused on load. You control playback.';
  if (reducedMotion.matches) { viewer.pause?.(); viewer.interpolationDecay = 0; document.querySelector('#movement-video').pause(); sync(); } else viewer.interpolationDecay = 50;
}
reducedMotion.addEventListener('change', applyMotionPreference);
applyMotionPreference();
updateStudy('elbow');

