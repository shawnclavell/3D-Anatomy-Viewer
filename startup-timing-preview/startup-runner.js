(function () {
  'use strict';

  const runButton = document.getElementById('run');
  const stopButton = document.getElementById('stop');
  const download = document.getElementById('download');
  const frame = document.getElementById('target');
  const status = document.getElementById('status');
  const output = document.getElementById('results');
  const readyMark = 'startup:controls-ready';
  let interrupted = '';

  function interrupt(reason) {
    if (runButton.disabled && !interrupted) interrupted = reason;
  }

  stopButton.addEventListener('click', () => interrupt('Stopped by user.'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) interrupt('Page went into the background.');
  });

  function elapsed(start, end) {
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null;
  }

  function summarize(child, run) {
    const timing = child.performance;
    const marks = Object.fromEntries(timing.getEntriesByType('mark')
      .filter(entry => entry.name.startsWith('startup:'))
      .map(entry => [entry.name.slice(8), entry.startTime]));
    const resources = timing.getEntriesByType('resource')
      .filter(entry => /\.(glb|wasm)(\?|$)|model-viewer|layered\.config\.json/.test(entry.name))
      .map(entry => ({
        path: new URL(entry.name).pathname,
        startMs: entry.startTime,
        requestStartMs: entry.requestStart || null,
        responseStartMs: entry.responseStart || null,
        responseEndMs: entry.responseEnd || null,
        transferBytes: entry.transferSize,
        decodedBytes: entry.decodedBodySize
      }));
    const asset = resources.find(resource => resource.path.endsWith('/overview-layered.glb'));
    return {
      run,
      complete: true,
      cacheMode: 'Normal browser cache. Use transfer bytes to interpret this load.',
      marksMsFromFrameNavigation: marks,
      resourcesMsFromFrameNavigation: resources,
      phasesMs: {
        untilModelRequestStarted: asset?.startMs ?? null,
        modelRequestThroughResponse: elapsed(asset?.startMs, asset?.responseEndMs),
        modelResponseEndToLoadEvent: elapsed(asset?.responseEndMs, marks['model-loaded']),
        modelLoadEventToControlsReady: elapsed(marks['model-loaded'], marks['controls-ready']),
        materialSetup: elapsed(marks['material-setup-start'], marks['structure-index-start']),
        structureIndexBuild: elapsed(marks['structure-index-start'], marks['layer-setup-start']),
        layerSetup: elapsed(marks['layer-setup-start'], marks['control-setup-start']),
        finalControlSetup: elapsed(marks['control-setup-start'], marks['controls-ready']),
        totalControlsReady: marks['controls-ready']
      }
    };
  }

  async function load(run, session) {
    status.textContent = 'Measuring load ' + run + ' of 2.';
    const url = new URL('viewer/index.html?model=layered', location.href);
    url.searchParams.set('startupRun', session + '-' + run);
    frame.src = url.href;
    const deadline = performance.now() + 120000;
    let scrolled = false;
    while (!interrupted && performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 75));
      if (interrupted) break;
      const child = frame.contentWindow;
      if (child.location.href !== url.href) continue;
      const model = child.document.getElementById('viewer');
      if (!model) continue;
      if (!scrolled &&
          child.performance.getEntriesByName('startup:model-source-assigned').length &&
          child.performance.getEntriesByName('startup:model-viewer-defined').length) {
        child.performance.mark('startup:viewer-scroll-requested');
        model.scrollIntoView({block: 'center', behavior: 'instant'});
        scrolled = true;
      }
      if (child.performance.getEntriesByName('startup:model-error').length) {
        throw Error('The 3D model failed to load.');
      }
      if (child.performance.getEntriesByName(readyMark).length) {
        return summarize(child, run);
      }
    }
    throw Error(interrupted || 'Model startup exceeded two minutes.');
  }

  runButton.addEventListener('click', async () => {
    const report = {
      startupDiagnosticVersion: 1,
      device: document.getElementById('device').value.trim(),
      userAgent: navigator.userAgent,
      embedded: parent !== window,
      referrerOrigin: document.referrer ? new URL(document.referrer).origin : null,
      studentViewConfirmedByHuman: document.getElementById('student-view').checked,
      runs: []
    };
    const session = Date.now().toString(36);
    interrupted = document.hidden ? 'Page went into the background.' : '';
    output.value = '';
    runButton.disabled = true;
    stopButton.disabled = false;
    download.disabled = true;
    try {
      for (let run = 1; run <= 2; run++) report.runs.push(await load(run, session));
      status.textContent = 'Complete. Download both startup measurements.';
    } catch (error) {
      report.error = error.message;
      status.textContent = error.message + ' The unfinished load was excluded.';
      frame.removeAttribute('src');
    } finally {
      output.value = JSON.stringify(report, null, 2);
      runButton.disabled = false;
      stopButton.disabled = true;
      download.disabled = false;
    }
  });

  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([output.value], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'layered-anatomy-startup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}());
