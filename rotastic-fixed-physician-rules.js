(()=>{
'use strict';
if(window.__rotasticFixedPhysicianRules)return;window.__rotasticFixedPhysicianRules=true;
const key=v=>String(v||'').trim().toLowerCase().replace(/\./g,'').replace(/^dr\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
const isFahima=v=>/^fahima(?:\s+n)?$/.test(key(v));
const isMoursi=v=>/^(?:m\s+)?moursi$/.test(key(v))||/^(?:m\s+)?morsi$/.test(key(v));
function clearDoctorFromShift(sh,test){
  if(!sh||typeof sh!=='object')return 0;let changed=0;
  if(sh.rooms&&typeof sh.rooms==='object')for(const r of Object.keys(sh.rooms))if(test(sh.rooms[r])){sh.rooms[r]='';changed++}
  for(const k of Object.keys(sh)){
    if(k==='rooms')continue;
    const v=sh[k];
    if(typeof v==='string'&&test(v)){sh[k]='';changed++}
    else if(Array.isArray(v))for(let i=v.length-1;i>=0;i--){const x=v[i],n=typeof x==='string'?x:(x?.doctor||x?.name||x?.physician||'');if(test(n)){v.splice(i,1);changed++}}
  }
  return changed;
}
function enforceFahima(day){let changed=0;for(const p of ['am','pm'])changed+=clearDoctorFromShift(day?.[p],isFahima);for(const k of ['cbAM','cbPM']){const cb=day?.[k];if(cb&&typeof cb==='object')for(const f of Object.keys(cb))if(isFahima(cb[f])){cb[f]='';changed++}}return changed}
function enforceMoursi(day){const sh=day?.am;if(!sh||!sh.rooms||typeof sh.rooms!=='object')return 0;let changed=0;
  for(const r of Object.keys(sh.rooms))if(String(r)!=='9'&&isMoursi(sh.rooms[r])){sh.rooms[r]='';changed++}
  if(isMoursi(sh.rooms['9']))return changed;
  const displaced=sh.rooms['9'];
  if(displaced){for(let r=10;r<=20;r++){const k=String(r);if(!sh.rooms[k]){sh.rooms[k]=displaced;break}}}
  sh.rooms['9']='Dr Moursi';return changed+1;
}
function enforce(schedule){const root=schedule||window.currentSchedule;const days=Array.isArray(root)?root:Array.isArray(root?.days)?root.days:[];let changed=0;for(const day of days){changed+=enforceFahima(day);changed+=enforceMoursi(day)}return changed}
function install(){for(const name of ['generateDutyScheduleFromPlanner','generateSchedule','generateRota','buildSchedule','buildRota','createSchedule','createRota']){const fn=window[name];if(typeof fn!=='function'||fn.__rotasticFixedPhysicianGuard)continue;const wrapped=function(...args){const out=fn.apply(this,args);if(out&&typeof out.then==='function')return out.then(v=>{enforce(v);enforce(window.currentSchedule);window.renderSchedule?.();return v});enforce(out);enforce(window.currentSchedule);window.renderSchedule?.();return out};wrapped.__rotasticFixedPhysicianGuard=true;window[name]=wrapped}}
window.rotasticEnforceFixedPhysicianRules=enforce;window.rotasticIsFahima=isFahima;window.rotasticIsMoursi=isMoursi;
install();setInterval(()=>{install();enforce(window.currentSchedule)},500);
})();
