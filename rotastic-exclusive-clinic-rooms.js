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
  shift.ancDoc='No Clinic';
  if(Array.isArray(shift.specialAssignments))shift.specialAssignments=shift.specialAssignments.filter(x=>String(x.clinic||'').toUpperCase()!=='ANC');
  const exclusive=[shift.wbcDoc,shift.cmcDoc,...(shift.specialAssignments||[]).filter(x=>['WBC','CMC'].includes(String(x.clinic).toUpperCase())).map(x=>x.doctor)].filter(x=>/^dr\.?\s/i.test(String(x||'')));
  const blocked=new Set(exclusive.map(key));
  if(!blocked.size)continue;
  // Refill vacated rooms from the same shift's unroomed, eligible doctors.
  const vacated=Object.keys(shift.rooms).filter(room=>blocked.has(key(shift.rooms[room])));
  for(const room of vacated)shift.rooms[room]='-';
  const normalizeName=raw=>String(raw||'').replace(/\s*\([^)]*\)\s*$/,'').trim();
  const occupied=new Set(Object.values(shift.rooms).map(key).filter(Boolean));
  const otherClinicFields=['ncdDoc','isoDoc','smokingDoc','iucdDoc','sdiDoc','hearingDoc','wicDoc','htDoc'];
  const unavailable=new Set([...blocked,...otherClinicFields.map(field=>key(shift[field])).filter(Boolean)]);
  const cohort=window.rotasticExcelRotaContract?.groups?.[window.rotasticExcelRotaContract.sessionGroup(day.dayIndex??days.indexOf(day),period.toUpperCase())]||window.rotasticGetShiftGroupDoctors?.(day,period,true)||[];
  const cohortKeys=new Set(cohort.map(key));
  const women=new Set(['fazila','laila','maya','saima','rida','oula','tayseer','saba','fahima']);
  const female=name=>women.has(String(name).replace(/^dr\.?\s*/i,'').split(' ')[0].toLowerCase());
  const used=new Set([...occupied,...unavailable]);
  const listed=(shift.noRoomDocs||[]).map(normalizeName);
  // The legacy generator can omit working doctors entirely. Recover them from
  // the actual shift cohort rather than silently losing them from the rota.
  const candidates=[...listed,...cohort].filter((name,i,arr)=>/^dr\.?\s/i.test(name)&&arr.findIndex(n=>key(n)===key(name))===i)
   .filter(name=>cohortKeys.has(key(name))&&!used.has(key(name))&&key(name)!=='abdulgafoork'&&key(name)!=='fahiman')
   .filter(name=>!(window.rotasticDoctorIsOnDisplayedLeave?.(name,day)));
  const roomsToFill=[...new Set([...vacated,...Object.keys(shift.rooms).filter(room=>!shift.rooms[room]||shift.rooms[room]==='-')])];
  for(const room of roomsToFill){
   const index=candidates.findIndex(name=>(Number(room)>20||!female(name))&&(Number(room)!==39||key(name)==='abdulgafoork'));
   if(index<0)continue;
   const chosen=candidates.splice(index,1)[0];
   shift.rooms[room]=chosen;used.add(key(chosen));
  }
  const roomKeys=new Set(Object.values(shift.rooms).map(key));
  const otherAssignments=[shift.med,shift.fed,shift.ped,shift.timed1Doc,shift.timed2Doc,...otherClinicFields.map(field=>shift[field])];
  const assignedKeys=new Set([...roomKeys,...otherAssignments.map(key),...blocked]);
  const cb=period==='am'?day.cbAM:day.cbPM;
  for(const name of Object.values(cb||{}))assignedKeys.add(key(name));
  shift.noRoomDocs=cohort.filter(name=>key(name)!=='fahiman'&&!assignedKeys.has(key(name))&&!window.rotasticDoctorIsOnDisplayedLeave?.(name,day)).map(name=>name+' (No Room)');
  // WBC, ANC and CMC are exclusive clinical assignments, not ER/Twilight duties.
  for(const field of ['med','fed','ped','timed1Doc','timed2Doc'])if(blocked.has(key(shift[field])))shift[field]='';
  if(cb)for(const field of ['tl','tm2','tm3'])if(blocked.has(key(cb[field])))cb[field]='';
 }
}
function showNoRoom(){
 const container=document.getElementById('scheduleMatrixContainer');if(!container)return;
 container.querySelectorAll('.rotastic-exclusive-no-room').forEach(el=>el.remove());
 const days=window.currentSchedule||[];
 const panels=[...container.querySelectorAll('.rotastic-shift-panel')];
 for(const panel of panels){
  const sheet=panel.closest('.rotastic-day-sheet');
  const heading=sheet?.querySelector('.rotastic-day-sheet-head')?.textContent||'';
  const day=days.find(d=>heading.includes(d.isoDate))||days[0];
  const period=panel.dataset.shiftPeriod|| (panel.classList.contains('rotastic-shift-pm')?'pm':'am');
  const names=day?.[period]?.noRoomDocs||[];
  if(!names.length)continue;
  const box=document.createElement('div');box.className='rotastic-exclusive-no-room';
  box.style.cssText='margin-top:12px;padding:10px;border:1px solid rgba(45,212,191,.3);border-radius:12px;color:#99f6e4;font-size:12px';
  const title=document.createElement('strong');title.textContent='Doctors without rooms';title.style.display='block';box.appendChild(title);
  for(const name of names){const row=document.createElement('div');row.textContent=name;box.appendChild(row)}
  panel.appendChild(box);
 }
}
function install(){
 const fn=window.renderScheduleView;
 if(typeof fn!=='function'||fn.__rotasticExclusiveClinicRooms)return;
 const wrapper=function(...args){enforce();const result=fn.apply(this,args);showNoRoom();return result};
 wrapper.__rotasticExclusiveClinicRooms=true;
 window.renderScheduleView=wrapper;
}
install();document.addEventListener('DOMContentLoaded',install,{once:true});setTimeout(install,500);setInterval(install,3000);
window.rotasticEnforceExclusiveClinicRooms=enforce;
})();