/* Selected-muscle reference text; source IDs remain independent of surface matches. */
(function () {
  'use strict';
  var panel=document.getElementById('muscleDetails');
  var fields=document.getElementById('muscleDetailsFields');
  var note=document.getElementById('muscleDetailsNote');
  var sources=document.getElementById('muscleDetailsSources');
  var entries=null, failed=false;
  var model=new URLSearchParams(location.search).get('model') || 'muscular';
  if(model!=='muscular')return;
  function render(){
    var api=window.AnatomyDissection;
    var selected=api && api.state().selected;
    var entry=selected && entries && entries[selected.name];
    panel.hidden=!entry && !(failed && selected);
    fields.replaceChildren();sources.replaceChildren();
    if(panel.hidden)return;
    if(!entry){note.textContent='Muscle information could not be loaded. Reload to retry.';return;}
    [['Name',selected.label],['Origin',entry.origin],['Insertion',entry.insertion],['Action',entry.action],['Innervation',entry.innervation]].forEach(function(item){
      var dt=document.createElement('dt');dt.textContent=item[0];
      var dd=document.createElement('dd');dd.textContent=item[1];fields.append(dt,dd);
    });
    note.textContent=entry.status+' Text descriptions and colored attachment surfaces have separate review status.';
    (entry.sources||[]).forEach(function(source){
      if(typeof source.url!=='string'||source.url.indexOf('https://')!==0)return;
      var li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title;
      a.target='_blank';a.rel='noopener noreferrer';li.appendChild(a);sources.appendChild(li);
    });
  }
  document.addEventListener('anatomy-visibility',render);
  fetch('models/muscular.details.json?v=20261028').then(function(response){
    if(!response.ok)throw Error('Muscle reference unavailable');return response.json();
  }).then(function(data){entries=data.entries||{};render();}).catch(function(){failed=true;render();});
}());
