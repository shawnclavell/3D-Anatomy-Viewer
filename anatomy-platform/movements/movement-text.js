const studySequences = {
  elbow: ['Source start: upper arm fixed; forearm and hand extended.', 'Flexion: forearm and hand bend toward the upper arm.', 'Peak flexion: illustrative 120° offset.', 'Extension: return toward source start.'],
  forearm: ['Elbow held at 90°; ulna fixed.', 'Radius and hand rotate together about the estimated forearm axis.', 'Rotation endpoint: illustrative 140° excursion; pronation direction requires review.', 'Radius and hand return along the same path.'],
  ankle: ['Source-rest lower leg and foot.', 'Dorsiflexion: foot moves toward the front of the lower leg; illustrative 20° offset.', 'Return to source rest.', 'Plantarflexion: foot points downward; illustrative 35° offset, then returns.'],
  hip: ['Source-rest pelvis and right leg.', 'Flexion: right leg moves forward; illustrative 90° offset.', 'Return to source rest.', 'Extension: right leg moves backward; illustrative 20° offset, then returns.'],
  hipabduction: ['Source-rest pelvis and right leg at 0 seconds.', 'Abduction: right leg moves away from the midline to an illustrative 40° offset at 1.5 seconds; held to 2 seconds.', 'Adduction: right leg returns toward the midline between 2 and 3.5 seconds.', 'Source-rest pose held to 4 seconds; leg does not cross the midline.'],
  hipflexion: ['0 seconds: source-rest right leg, pelvis fixed and knee extended.', '0–2.5 seconds: leg moves forward into hip flexion, reaching an illustrative 90° offset.', '2.5–4 seconds: flexion endpoint held. No extension phase is shown.', 'The video ends at the flexion endpoint.'],
  hipextension: ['0 seconds: source-rest right leg, pelvis fixed and knee extended.', '0–2.5 seconds: leg moves backward into hip extension, reaching an illustrative 20° offset.', '2.5–4 seconds: extension endpoint held. No flexion phase is shown.', 'The video ends at the extension endpoint.'],
  knee: ['Source-rest extended knee; femur fixed.', 'Lower leg and foot bend behind the thigh in flexion.', 'Illustrative hinge endpoint: 120° offset.', 'Lower leg and foot return toward extension.'],
  kneefull: ['Source-rest extended knee; femur fixed.', 'Lower leg and foot bend behind the thigh, with positional change from selected source tracking controls.', 'Endpoint: approximately 117.5° of lower-leg rotation.', 'Lower leg and foot return toward the source-rest pose. Patella is not included.'],
  kneerest: ['Static source-rest right knee.', 'Femur, tibia, fibula, patella and foot are present.', 'Patella is shown in its source position.', 'No motion or patella tracking is demonstrated.'],
};
studySequences.baseline = studySequences.forearm;
studySequences.headfit = studySequences.forearm;

studySequences.shoulder = [
  '0 seconds: right arm in its source-rest pose; the scapula, clavicle, sternum, and manubrium stay fixed.',
  '0–1.5 seconds: the humerus moves outward away from the trunk. Forearm and hand follow rigidly, with their starting elbow, wrist, and finger positions preserved.',
  '1.5–2 seconds: hold at an illustrative 45-degree additional rotation. This angle is an offset from the source pose, not measured total arm elevation.',
  '2–3.5 seconds: the arm returns toward the trunk along the same path. The source-rest pose is held until 4 seconds.'
];
