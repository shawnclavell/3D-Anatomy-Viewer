(function(){'use strict';
const el=id=>document.getElementById(id),frame=el('target'),results=[];
let cancelled=false;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const check=()=>{if(cancelled)throw Error('Stopped by user');if(document.hidden)throw Error('Page hidden; discard this trial');};
const pct=(a,p)=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor((b.length-1)*p))];};
const save=()=>{let referrerOrigin='';try{referrerOrigin=new URL(document.referrer).origin;}catch(e){}el('results').value=JSON.stringify({diagnosticVersion:1,device:el('device').value,scope:{embedded:parent!==window,referrerOrigin,studentViewConfirmedByHuman:false,lowEndHardwareConfirmedByHuman:false,decision:'Pending real-device Canvas evidence; no automatic engine decision'},results},null,2);el('download').disabled=!results.length;};
function symbol(object,name){for(let p=object;p;p=Object.getPrototypeOf(p)){const found=Object.getOwnPropertySymbols(p).find(s=>s.description===name);if(found)return found;}}
async function measure(w,d,label,off){
 check();const viewer=d.getElementById('viewer');
 const buttons=[...d.querySelectorAll('#layerButtons button[data-layer]')];
 buttons.forEach(b=>{const on=!off.includes(b.dataset.layer)&&b.dataset.layer!=='meninges';if((b.getAttribute('aria-pressed')==='true')!==on)b.click();});
 const scene=viewer[symbol(viewer,'scene')];
 if(!scene||typeof scene.renderCount!=='number')throw Error('Pinned model-viewer render counter unavailable; do not substitute rAF as FPS');
 await delay(500);check();
 const start=w.performance.now(),count=scene.renderCount,times=[],raf=[],scales=[];let previous=count;
 await new Promise((resolve,reject)=>{
  function tick(){try{check();if(w.document.hidden||!viewer.modelIsVisible)throw Error('Viewer not visible; discard trial');
   const now=w.performance.now(),elapsed=now-start;raf.push(now);
   if(scene.renderCount!==previous){times.push(now);previous=scene.renderCount;}
   const theta=elapsed*.018;viewer.cameraOrbit=theta+'deg 90deg 3.8m';
   if(elapsed<8000)w.requestAnimationFrame(tick);else resolve();
  }catch(e){reject(e);}}
  w.requestAnimationFrame(tick);
 });
 const end=w.performance.now(),frames=scene.renderCount-count;
 const intervals=times.slice(1).map((t,i)=>t-times[i]);
 const rafIntervals=raf.slice(1).map((t,i)=>t-raf[i]);
 const box=viewer.getBoundingClientRect();
 return {label,durationMs:end-start,renderedSceneFrames:frames,sceneSubmissionFps:frames*1000/(end-start),renderObservedIntervalMedianMs:pct(intervals,.5),renderObservedIntervalP95Ms:pct(intervals,.95),over50msIntervals:intervals.filter(x=>x>50).length,rafIntervalMedianMs:pct(rafIntervals,.5),rafIntervalP95Ms:pct(rafIntervals,.95),schedulerConfounded:pct(rafIntervals,.5)>250,warning:pct(rafIntervals,.5)>250?'Very slow callback cadence: investigate browser scheduling/environment before attributing low FPS to model GPU cost':null,viewerCssPixels:{width:box.width,height:box.height},renderScale:scene.scaleStep,reportedDpr:w.devicePixelRatio,visibilityValid:true};
}
el('stop').onclick=()=>{cancelled=true;};
el('run').onclick=async function(){this.disabled=true;el('stop').disabled=false;cancelled=false;results.length=0;
 try{for(let run=1;run<=2;run++){
 check();const result={run,cacheDescription:run===1?'First observed load of this diagnostic URL; cache state recorded, not forced cold':'Repeat navigation; cache revalidation may occur',scenarios:[]};results.push(result);
 el('status').textContent='Loading run '+run+' of 2';
 frame.src='viewer/index.html?model=layered&perfRun='+run;
 let w,d,t=performance.now(),scrolled=false;
 while(true){await delay(100);check();try{w=frame.contentWindow;d=frame.contentDocument;if(w.location.search.includes('perfRun='+run)&&d&&d.getElementById('viewer')){if(!scrolled){d.getElementById('viewer').scrollIntoView({block:'center',behavior:'instant'});scrolled=true;}if(w.AnatomyPerfProbe&&!d.getElementById('markupModeBtn').disabled)break;}}catch(e){}if(performance.now()-t>120000)throw Error('Load timeout after120 seconds');}
 result.loadToControlsReadyMs=w.performance.now();
 const viewer=d.getElementById('viewer'),scene=viewer[symbol(viewer,'scene')],renderer=viewer[symbol(viewer,'renderer')];
 let glInfo={};try{const gl=renderer.threeRenderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');glInfo={vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};}catch(e){glInfo={unavailable:true};}
 result.browser={userAgent:w.navigator.userAgent,hardwareConcurrency:w.navigator.hardwareConcurrency,deviceMemory:w.navigator.deviceMemory||null,connection:w.navigator.connection?{effectiveType:w.navigator.connection.effectiveType,downlink:w.navigator.connection.downlink,rtt:w.navigator.connection.rtt}:null,viewport:{width:w.innerWidth,height:w.innerHeight},glInfo};
 for(const [label,off] of [['Skin on',[]],['Muscles exposed',['skin','fascia','bursae','sheaths']],['Skeleton and nerves',['skin','fascia','bursae','sheaths','muscles','tendons','origin','insertion']]]){
  el('status').textContent='Run '+run+': '+label+' — rotating for8 seconds';
  result.scenarios.push(await measure(w,d,label,off));save();
 }
 result.probe=w.AnatomyPerfProbe;
 result.resources=w.performance.getEntriesByType('resource').filter(e=>/\.glb|model-viewer|\.wasm/.test(e.name)).map(e=>({url:new URL(e.name).pathname,durationMs:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize}));
 result.complete=true;save();}
 el('status').textContent=results.some(r=>r.scenarios&&r.scenarios.some(s=>s.schedulerConfounded))?'Complete with slow-callback warning. No engine decision can be made from this run.':'Complete. Review device, Canvas context and cache conditions before making an engine decision.';
 }catch(e){results.push({error:e.message,invalid:true});save();el('status').textContent=e.message;}finally{this.disabled=false;el('stop').disabled=true;}
};
el('download').onclick=()=>{const blob=new Blob([el('results').value],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='layered-anatomy-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}());
