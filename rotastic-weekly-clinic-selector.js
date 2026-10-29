(()=>{
'use strict';
if(window.__rotasticWeeklyClinicSelectorInstalled)return;window.__rotasticWeeklyClinicSelectorInstalled=true;
const CLINICS=[
 {id:'anc',label:'ANC',fields:['ancDoc'],patterns:[/\bANC\b/i]},
 {id:'wbc',label:'Well Baby Clinic',fields:['wbcDoc','wicDoc'],patterns:[/well\s*baby|\bWBC\b/i]},
 {id:'iud',label:'IUD / IUCD',fields:['iudDoc','iucdDoc'],patterns:[/\bIUD\b|\bIUCD\b/i]},
 {id:'ncd',label:'NCD',fields:['ncdDoc'],patterns:[/\bNCD\b/i]}
];
const state=Object.fromEntries(CLINICS.map(c=>[c.id,true]));
const enabled=id=>state[id]!==false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function findGenerateButton(){return [...document.querySelectorAll('button')].find(b=>/^\s*generate(?:\s+rota|\s+schedule)?\s*$/i.test((b.textContent||'').trim())||/generate/i.test(b.id||''))}
function installUI(){if(document.getElementById('rotastic-weekly-clinics'))return true;const btn=findGenerateButton();if(!btn||!btn.parentElement)return false;const box=document.createElement('div');box.id='rotastic-weekly-clinics';box.className='mb-3';box.innerHTML=`<div class="text-[10px] uppercase tracking-wider font-bold text-slate-300 mb-2">Clinics running this week</div><div class="grid grid-cols-2 gap-2">${CLINICS.map(c=>`<label class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" data-clinic="${esc(c.id)}" checked class="accent-teal-500"><span>${esc(c.label)}</span></label>`).join('')}</div>`;btn.parentElement.insertBefore(box,btn);box.querySelectorAll('input[data-clinic]').forEach(i=>i.addEventListener('change',()=>{state[i.dataset.clinic]=i.checked}));return true}
function closedClinicForText(s){s=String(s||'');return CLINICS.find(c=>!enabled(c.id)&&c.patterns.some(r=>r.test(s)))}
function closeShift(shift){if(!shift||typeof shift!=='object')return;for(const c of CLINICS){if(enabled(c.id))continue;for(const f of c.fields)if(f in shift)shift[f]='No Clinic';if(shift.rooms&&typeof shift.rooms==='object')for(const k of Object.keys(shift.rooms)){const v=shift.rooms[k];if(closedClinicForText(k)||closedClinicForText(v?.clinic||v?.label||v?.duty||'')){if(v&&typeof v==='object'){if('doctor'in v)v.doctor='No Clinic';if('physician'in v)v.physician='No Clinic';if('name'in v)v.name='No Clinic'}else shift.rooms[k]='No Clinic'}}}
function apply(schedule){const root=schedule||window.currentSchedule;if(!root)return root;const days=Array.isArray(root)?root:(Array.isArray(root.days)?root.days:[]);for(const d of days){closeShift(d?.am);closeShift(d?.pm);for(const k of Object.keys(d||{})){const c=closedClinicForText(k);if(c&&typeof d[k]==='string')d[k]='No Clinic'}}return root}
function installGuards(){['generateSchedule','generateRota','buildSchedule','buildRota','createSchedule','createRota'].forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__rotasticWeeklyClinics)return;const wrapped=function(...args){window.ROTASTIC_WEEKLY_CLINICS={...state};const out=fn.apply(this,args);if(out&&typeof out.then==='function')return out.then(v=>{apply(v);apply(window.currentSchedule);window.renderSchedule?.();return v});apply(out);apply(window.currentSchedule);return out};wrapped.__rotasticWeeklyClinics=true;window[name]=wrapped});}
window.rotasticWeeklyClinics=state;window.rotasticClinicEnabled=enabled;window.rotasticApplyWeeklyClinicClosures=apply;
const boot=()=>{installUI();installGuards()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,400),{once:true});else setTimeout(boot,400);setInterval(boot,1500);
})();
