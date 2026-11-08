(()=>{
'use strict';
if(window.__rotasticWeeklyClinicSelectorInstalled)return;window.__rotasticWeeklyClinicSelectorInstalled=true;
const CLINICS=[
 {id:'anc',label:'ANC',fields:['ancDoc'],patterns:[/\bANC\b/i]},
 {id:'wbc',label:'Well Baby Clinic',fields:['wbcDoc','wicDoc'],patterns:[/well\s*baby|\bWBC\b/i]},
 {id:'iud',label:'IUD / IUCD',fields:['iudDoc','iucdDoc'],patterns:[/\bIUD\b|\bIUCD\b/i]},
 {id:'sdi',label:'SDI',fields:['sdiDoc'],patterns:[/\bSDI\b|subdermal/i]},
 {id:'smoking',label:'Smoking Cessation',fields:['smokingDoc'],patterns:[/smoking\s*cessation/i]},
 {id:'cmc',label:'CMC',fields:['cmcDoc'],patterns:[/\bCMC\b|\bNCD\b/i]}
];
const state={...Object.fromEntries(CLINICS.map(c=>[c.id,true]))};
const enabled=id=>state[id]!==false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=e=>String(e?.textContent||e?.value||'').replace(/\s+/g,' ').trim();
function generateButtons(){
 const all=[...document.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]')];
 return all.filter(b=>{
  const t=text(b), oc=String(b.getAttribute?.('onclick')||''), id=String(b.id||''), al=String(b.getAttribute?.('aria-label')||'');
  return /generateDutyScheduleFromPlanner|generateSchedule|generateRota/i.test(oc)||/generate/i.test(id)||/generate/i.test(al)||/\bgenerate\b/i.test(t);
 });
}
function scoreButton(b){
 let n=0,t=text(b),oc=String(b.getAttribute?.('onclick')||'');
 if(/generateDutyScheduleFromPlanner/i.test(oc))n+=100;
 if(/^generate\s+(rota|schedule|duty schedule)$/i.test(t))n+=60;
 if(/generate/i.test(t))n+=20;
 let p=b;for(let i=0;i<6&&p;i++,p=p.parentElement){const s=text(p).slice(0,1200);if(/generate/i.test(s))n+=5;if(/planner|rota|schedule/i.test(s))n+=5;}
 return n;
}
function findGenerateButton(){return document.getElementById('rotastic-excel-generate')||generateButtons().sort((a,b)=>scoreButton(b)-scoreButton(a))[0]||null}
function makeBox(){
 const box=document.createElement('div');box.id='rotastic-weekly-clinics';box.className='mb-3';
 box.innerHTML=`<div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800"><div class="text-[10px] uppercase tracking-wider font-bold text-slate-300 mb-2">Clinics running this week</div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${CLINICS.map(c=>`<label class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" data-clinic="${esc(c.id)}" ${enabled(c.id)?'checked':''} class="accent-teal-500"><span>${esc(c.label)}</span></label>`).join('')}</div></div>`;
 box.querySelectorAll('input[data-clinic]').forEach(i=>i.addEventListener('change',()=>{state[i.dataset.clinic]=i.checked;window.ROTASTIC_WEEKLY_CLINICS={...state}}));return box;
}
function renameGeneratorNCD(){
 // Rename the original Generate-tab label directly, not a second copy of the selector.
 const root=document.getElementById('tabGenerate')||document.getElementById('tabGenerator')||document.getElementById('rotasticWeeklyClinicControls')?.parentElement||document;
 const legacy=document.getElementById('weeklyClinicNCD');
 if(legacy){const label=legacy.closest('label');if(label){
   for(const span of label.querySelectorAll('span'))span.textContent=span.textContent.replace(/\\bNCD\\b/gi,'CMC');
   for(const node of label.childNodes)if(node.nodeType===3)node.nodeValue=node.nodeValue.replace(/\\bNCD\\b/gi,'CMC');
 }}
 // Handle generator text inserted later by legacy rendering.
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
   if(node.parentElement?.closest('script,style,textarea,option,[contenteditable="true"]'))continue;
   if(/\\bNCD\\b/i.test(node.nodeValue))node.nodeValue=node.nodeValue.replace(/\\bNCD\\b/gi,'CMC');
 }
}

function installUI(){
 renameGeneratorNCD();
 // Rename the original planner control, including after dynamic re-renders.
 const original=document.querySelector('#rotasticWeeklyClinicControls #weeklyClinicNCD');
 if(original){const label=original.closest('label');if(label){for(const node of label.querySelectorAll('span'))if(/\bNCD\b/i.test(node.textContent))node.textContent=node.textContent.replace(/\bNCD\b/gi,'CMC');for(const node of label.childNodes)if(node.nodeType===3&&/\\bNCD\\b/i.test(node.nodeValue))node.nodeValue=node.nodeValue.replace(/\\bNCD\\b/gi,'CMC')}}

 const legacy=document.getElementById('weeklyClinicNCD');
 if(legacy){
  const label=legacy.closest('label');
  const name=label?.querySelector('span');
  if(name&&name.textContent.trim()!=='CMC')name.textContent='CMC';
  if(!legacy.dataset.rotasticCmcBound){
   legacy.dataset.rotasticCmcBound='1';
   legacy.addEventListener('change',()=>{state.cmc=legacy.checked;window.ROTASTIC_WEEKLY_CLINICS={...state}});
  }
  // The original NCD checkbox is the CMC control used by the Excel generator.
  if(legacy.checked!==enabled('cmc'))legacy.checked=enabled('cmc');
 }

 // Legacy planner checkbox is labelled NCD but now controls CMC.
 for(const label of document.querySelectorAll('label')){
  if(!/^NCD$/i.test((label.textContent||'').trim()))continue;
  const input=label.querySelector('input[type="checkbox"]');
  if(!input)continue;
  label.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent=n.textContent.replace(/\bNCD\b/g,'CMC')});
  for(const span of label.querySelectorAll('span'))if(/^NCD$/i.test(span.textContent.trim()))span.textContent='CMC';
  input.dataset.clinic='cmc';
  if(!input.dataset.rotasticCmcBound){input.dataset.rotasticCmcBound='1';input.addEventListener('change',()=>{state.cmc=input.checked;window.ROTASTIC_WEEKLY_CLINICS={...state}})}
 }

 let box=document.getElementById('rotastic-weekly-clinics');const btn=findGenerateButton();if(!btn)return false;
 if(!box)box=makeBox();
 /* Put the selector immediately before the actual Generate control. If the button is nested in a small action wrapper, insert before that wrapper instead. */
 let anchor=btn;const parent=btn.parentElement;if(parent&&parent.children.length<=3&&!/^(BODY|MAIN|SECTION)$/i.test(parent.tagName))anchor=parent;
 const host=anchor.parentElement;if(!host)return false;
 if(box.parentElement!==host||box.nextElementSibling!==anchor)host.insertBefore(box,anchor);
 box.style.display='block';box.style.visibility='visible';
 return true;
}
function closedClinicForText(s){s=String(s||'');return CLINICS.find(c=>!enabled(c.id)&&c.patterns.some(r=>r.test(s)))}
function closeShift(shift){if(!shift||typeof shift!=='object')return;if(!enabled('anc')){shift.ancDoc='No Clinic';if(Array.isArray(shift.specialAssignments))shift.specialAssignments=shift.specialAssignments.filter(x=>String(x.clinic||'').toUpperCase()!=='ANC');}for(const c of CLINICS){if(enabled(c.id))continue;for(const f of c.fields)if(f in shift)shift[f]='No Clinic';if(shift.rooms&&typeof shift.rooms==='object')for(const k of Object.keys(shift.rooms)){const v=shift.rooms[k];if(closedClinicForText(k)||closedClinicForText(v?.clinic||v?.label||v?.duty||'')){if(v&&typeof v==='object'){if('doctor'in v)v.doctor='-';if('physician'in v)v.physician='-';if('name'in v)v.name='-'}else shift.rooms[k]='-'}}}}
function apply(schedule){const root=schedule||window.currentSchedule;if(!root)return root;const days=Array.isArray(root)?root:(Array.isArray(root.days)?root.days:[]);for(const d of days){closeShift(d?.am);closeShift(d?.pm);for(const k of Object.keys(d||{})){const c=closedClinicForText(k);if(c&&typeof d[k]==='string')d[k]='No Clinic'}}return root}
function installGuards(){['generateDutyScheduleFromPlanner','generateSchedule','generateRota','buildSchedule','buildRota','createSchedule','createRota'].forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__rotasticWeeklyClinics)return;const wrapped=function(...args){window.ROTASTIC_WEEKLY_CLINICS={...state};const out=fn.apply(this,args);if(out&&typeof out.then==='function')return out.then(v=>{apply(v);apply(window.currentSchedule);window.rotasticEnforcePermanentRules?.(v);window.rotasticEnforcePermanentRules?.(window.currentSchedule);window.renderSchedule?.();return v});apply(out);apply(window.currentSchedule);window.rotasticEnforcePermanentRules?.(out);window.rotasticEnforcePermanentRules?.(window.currentSchedule);window.renderSchedule?.();return out};wrapped.__rotasticWeeklyClinics=true;window[name]=wrapped})}
window.rotasticWeeklyClinics=state;window.ROTASTIC_WEEKLY_CLINICS={...state};window.rotasticClinicEnabled=enabled;window.rotasticApplyWeeklyClinicClosures=apply;
const boot=()=>{installUI();installGuards()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100),{once:true});else setTimeout(boot,100);new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});setInterval(boot,500);
})();
