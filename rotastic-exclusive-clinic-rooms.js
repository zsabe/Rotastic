/* Keep special clinic doctors out of ordinary consultation rooms on all rota paths. */
(()=>{
'use strict';
if(window.__rotasticExclusiveClinicRoomsInstalled)return;
window.__rotasticExclusiveClinicRoomsInstalled=true;
const key=s=>String(s||'').toLowerCase().replace(/^dr\.?\s*/,'').replace(/\s*\([^)]*\)\s*$/,'').replace(/[^a-z0-9]/g,'').replace(/^mohammeds$/,'msyed');
function enforce(){
 const days=window.currentSchedule||[];
 if(!Array.isArray(days))return;
 for(const day of days)for(const period of ['am','pm']){
  const shift=day?.[period];if(!shift||!shift.rooms)continue;
  const exclusive=[shift.wbcDoc,shift.ancDoc,shift.cmcDoc,...(shift.specialAssignments||[]).filter(x=>['WBC','ANC','CMC'].includes(String(x.clinic).toUpperCase())).map(x=>x.doctor)].filter(x=>/^dr\.?\s/i.test(String(x||'')));
  const blocked=new Set(exclusive.map(key));
  if(!blocked.size)continue;
  for(const room of Object.keys(shift.rooms))if(blocked.has(key(shift.rooms[room])))shift.rooms[room]='-';
  // WBC, ANC and CMC are exclusive clinical assignments, not ER/Twilight duties.
  for(const field of ['med','fed','ped','timed1Doc','timed2Doc'])if(blocked.has(key(shift[field])))shift[field]='';
  const cb=period==='am'?day.cbAM:day.cbPM;
  if(cb)for(const field of ['tl','tm2','tm3'])if(blocked.has(key(cb[field])))cb[field]='';
 }
}
function install(){
 const fn=window.renderScheduleView;
 if(typeof fn!=='function'||fn.__rotasticExclusiveClinicRooms)return;
 const wrapper=function(...args){enforce();return fn.apply(this,args)};
 wrapper.__rotasticExclusiveClinicRooms=true;
 window.renderScheduleView=wrapper;
}
install();document.addEventListener('DOMContentLoaded',install,{once:true});setTimeout(install,500);setInterval(install,3000);
window.rotasticEnforceExclusiveClinicRooms=enforce;
})();