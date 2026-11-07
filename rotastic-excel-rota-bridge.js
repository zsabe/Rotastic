/* Opt-in Excel-first generation bridge. Never replaces existing generation silently.
   Output is mapped into the established Rota View schedule shape. */
(()=>{
'use strict';
if(window.__rotasticExcelBridgeInstalled)return;window.__rotasticExcelBridgeInstalled=true;
const getEngine=()=>window.rotasticExcelRotaEngine;
const dateKey=d=>String(d?.date||d?.isoDate||d?.dayDate||'').slice(0,10);
function mapShift(s){
 const rooms={};for(const [room,name] of Object.entries(s.rooms))rooms[room]=name;
 return {rooms,med:s.er.male||'',fed:s.er.female||'',ped:s.er.paeds||'',
  timed1Doc:s.twilight[0]||'',timed2Doc:s.twilight[1]||'',
  ancDoc:s.specialClinics.find(x=>x.kind==='ANC')?.doctor||'',
  wbcDoc:s.specialClinics.find(x=>x.kind==='WBC')?.doctor||'',
  noRoomDocs:[]};
}
function mapSchedule(result){
 return result.days.map(d=>({
  date:d.date,dayIndex:d.dayIndex,am:mapShift(d.shifts.AM),pm:mapShift(d.shifts.PM),
  cbAM:{tl:d.shifts.AM.codeBlue.TL,tm2:d.shifts.AM.codeBlue.TM2,tm3:d.shifts.AM.codeBlue.TM3},
  cbPM:{tl:d.shifts.PM.codeBlue.TL,tm2:d.shifts.PM.codeBlue.TM2,tm3:d.shifts.PM.codeBlue.TM3}
 }));
}
function generateAndDisplay(options){
 const engine=getEngine();if(!engine)throw Error('Excel scheduling engine has not loaded');
 const result=engine.generate(options);
 engine.assertValid(result);
 const days=mapSchedule(result);
 const previous={schedule:window.currentSchedule,mode:window.__rotasticExcelModeActive,result:window.rotasticExcelGeneratedResult};
 if(typeof window.renderSchedule!=='function'&&typeof window.renderScheduleView!=='function')
  throw Error('Rota View renderer is unavailable; existing schedule preserved');
 // Transactional publish: restore the previous rota if rendering throws.
 try{
  window.__rotasticExcelModeActive=true;
  window.currentSchedule=days;
  window.rotasticExcelGeneratedResult=result;
  window.rotasticPatchExportActualRota?.();
  if(typeof window.renderSchedule==='function')window.renderSchedule();
  if(typeof window.renderScheduleView==='function')window.renderScheduleView();
  if(window.currentSchedule!==days)throw Error('Another module replaced the Excel-generated rota');
 }catch(e){
  window.currentSchedule=previous.schedule;
  window.__rotasticExcelModeActive=previous.mode;
  window.rotasticExcelGeneratedResult=previous.result;
  try{window.renderSchedule?.();window.renderScheduleView?.()}catch(_ignored){}
  throw Error('Rota View update failed; original rota restored: '+e.message);
 }
 return result;
}
function sundayOf(value){
 const text=String(value||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return '';
 const d=new Date(text+'T12:00:00Z');
 if(!Number.isFinite(d.getTime()))return '';
 d.setUTCDate(d.getUTCDate()-d.getUTCDay());
 return d.toISOString().slice(0,10);
}
function resolveWeekStart(){
 const explicit=window.rotasticExcelWeekStart;
 if(explicit)return sundayOf(explicit);
 const dateFields=[...document.querySelectorAll('input[type="date"]')];
 const active=dateFields.find(el=>el.offsetParent!==null&&el.value)||dateFields.find(el=>el.value);
 if(active)return sundayOf(active.value);
 const fromPlanner=window.currentSchedule?.[0]?.isoDate||window.currentSchedule?.[0]?.date||
  window.rotasticCurrentSchedule?.[0]?.isoDate||window.rotasticCurrentSchedule?.[0]?.date;
 if(fromPlanner)return sundayOf(fromPlanner);
 // Default to the upcoming Sunday; no hidden historical date is assumed.
 const today=new Date(),local=new Date(today.getFullYear(),today.getMonth(),today.getDate()+((7-today.getDay())%7));
 return [local.getFullYear(),String(local.getMonth()+1).padStart(2,'0'),String(local.getDate()).padStart(2,'0')].join('-');
}
function install(){
 if(document.getElementById('rotastic-excel-generate'))return;
 const candidates=[...document.querySelectorAll('button')];
 const target=candidates.find(b=>/generateDutyScheduleFromPlanner/.test(b.getAttribute('onclick')||''))||
  candidates.find(b=>/^generate\s+(rota|schedule|duty schedule)$/i.test((b.textContent||'').trim()));
 if(!target)return;
 const button=document.createElement('button');button.type='button';button.id='rotastic-excel-generate';
 button.className=target.className;button.textContent='Generate from Excel template';
 button.addEventListener('click',()=>{
  const date=resolveWeekStart();
  if(!date){alert('Unable to determine the selected rota week.');return}
  try{
   const inputs=window.rotasticExcelWeeklyInputs;
   if(!inputs||!inputs.offByDate||!inputs.leaveByDate)throw Error('Weekly OFF and leave inputs must be supplied before Excel generation.');
   if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date))throw Error('Select a valid Sunday week-start date.');
   const result=generateAndDisplay({...inputs,weekStart:date});
   alert('Excel-template rota generated and validated: '+result.days.length+' days. Check Rota View before exporting.');
  }catch(e){console.error('Excel generation rejected',e);alert('Excel generation stopped: '+e.message+' Existing rota has not been replaced.')}
 });
 target.insertAdjacentElement('afterend',button);
}
window.rotasticGenerateFromExcelTemplate=generateAndDisplay;
window.rotasticExcelMapSchedule=mapSchedule;
window.rotasticExcelResolveWeekStart=resolveWeekStart;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
