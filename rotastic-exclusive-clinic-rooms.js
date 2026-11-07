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
  // Refill vacated rooms from the same shift's unroomed, eligible doctors.
  const vacated=Object.keys(shift.rooms).filter(room=>blocked.has(key(shift.rooms[room])));
  for(const room of vacated)shift.rooms[room]='-';
  const occupied=new Set(Object.values(shift.rooms).map(key).filter(Boolean));
  const otherClinicFields=['ncdDoc','isoDoc','smokingDoc','iucdDoc','sdiDoc','hearingDoc','wicDoc','htDoc'];
  const unavailable=new Set([...blocked,...otherClinicFields.map(field=>key(shift[field])).filter(Boolean)]);
  const eligibleCohort=window.rotasticGetShiftGroupDoctors?.(day,period,true)||[];
  const cohortKeys=new Set(eligibleCohort.map(key));
  const women=new Set(['fazila','laila','maya','saima','rida','oula','tayseer','saba','fahima']);
  const female=name=>women.has(String(name).replace(/^dr\\.?\\s*/i,'').split(' ')[0].toLowerCase());
  const candidates=(shift.noRoomDocs||[]).map(raw=>({raw,name:String(raw).replace(/\\s*\\([^)]*\\)\\s*$/,'').trim()}))
    .filter(x=>/^dr\\.?\\s/i.test(x.name)&&cohortKeys.has(key(x.name))&&!occupied.has(key(x.name))&&!unavailable.has(key(x.name))&&key(x.name)!=='abdulgafoork');
  for(const room of vacated){
   const index=candidates.findIndex(x=>(Number(room)>20||!female(x.name))&&(Number(room)!==39||key(x.name)==='abdulgafoork'));
   if(index<0)continue;
   const chosen=candidates.splice(index,1)[0];
   shift.rooms[room]=chosen.name;occupied.add(key(chosen.name));
   shift.noRoomDocs=shift.noRoomDocs.filter(x=>x!==chosen.raw);
  }
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