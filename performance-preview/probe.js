/* Private diagnostics only. Loaded before the app to capture load events. */
(function(){
  const viewer=document.getElementById('viewer');
  const data={modelLoadedMs:null,modelVisibleMs:null,renderScale:[],longTasks:[],errors:[]};
  viewer.addEventListener('load',()=>{data.modelLoadedMs=performance.now();});
  viewer.addEventListener('model-visibility',e=>{if(e.detail.visible&&data.modelVisibleMs===null)data.modelVisibleMs=performance.now();});
  viewer.addEventListener('render-scale',e=>data.renderScale.push({at:performance.now(),...e.detail}));
  window.addEventListener('error',e=>data.errors.push(String(e.message)));
  try{new PerformanceObserver(list=>list.getEntries().forEach(e=>data.longTasks.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});}catch(e){data.longTaskSupport=false;}
  window.AnatomyPerfProbe=data;
}());
