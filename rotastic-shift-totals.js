/* Shift-specific totals and clinic room exclusivity for rota rendering. */
(()=>{
'use strict';
if(window.__rotasticShiftTotalsInstalled)return;window.__rotasticShiftTotalsInstalled=true;
function install(){
 if(typeof window.renderShiftCard!=='function'||window.renderShiftCard.__rotasticShiftTotals)return;
 const original=window.renderShiftCard;
 const wrapped=function(day,period,...rest){
  const html=original.call(this,day,period,...rest);
  try{
   const group=window.rotasticGetShiftGroupDoctors?.(day,period,true)||[];
   const canonical=n=>window.canonicalRotaName?.(n)||String(n||'').trim().toLowerCase();
   const groupKeys=new Set(group.map(canonical));
   const extras=(window.rotasticCollectShiftDoctors?.(day,period)||[]).filter(n=>!groupKeys.has(canonical(n)));
   const all=new Set([...group,...extras].map(canonical).filter(Boolean));
   const leave=new Set();
   const submissions=window.Storage?.getJSON?.('rotastic_leave_submissions',[])||[];
   const date=day?.isoDate||'';
   const matches=(item)=>{const v=String(item?.shift||'').toUpperCase();return !v||v==='ALL'||v==='BOTH'||(period==='am'?/AM|09:00|9-4/.test(v):/PM|14:00|16:00|2-8/.test(v))};
   for(const item of submissions){
    if(!item?.doc||!item?.startDate||date<item.startDate||date>(item.endDate||item.startDate)||!matches(item))continue;
    const status=String(item.status||'').toLowerCase(),type=String(item.type||'').toLowerCase();
    if(/reject|cancel|withdraw|declin|pending|await|request/.test(status)&&type!=='sick')continue;
    leave.add(canonical(item.doc));
   }
   // Day-wide leave records apply to both shifts; shift-specific reports apply only to their own.
   for(const name of (window.getDisplayedLeaveDoctorsForDay?.(day)||[])) {
    const key=canonical(name);
    if(!submissions.some(x=>canonical(x?.doc)===key&&x.startDate<=date&&(x.endDate||x.startDate)>=date&&String(x.shift||'').trim()))leave.add(key);
   }
   const onLeave=[...leave].filter(n=>all.has(n)).length;
   const total=Math.max(0,all.size-onLeave);
   return html.replace(/<small class="rotastic-shift-day-total">Day total[^<]*<\/small>/,
    '<small class="rotastic-shift-day-total">Shift total '+total+'</small>');
  }catch(e){console.warn('ROTASTIC shift total fallback',e);return html.replace(/Day total\s*\d+/,'Shift total')}
 };
 wrapped.__rotasticShiftTotals=true;
 window.renderShiftCard=wrapped;
}
install();document.addEventListener('DOMContentLoaded',install,{once:true});setTimeout(install,500);setInterval(install,3000);
})();