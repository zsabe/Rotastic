(()=>{
'use strict';
if(window.__rotasticExportPolishInstalled)return;window.__rotasticExportPolishInstalled=true;

/* Export-only finishing pass. Does not touch the live rota UI. */
const POLISH=`
.sheet{width:1087px!important;height:1536px!important;padding:14px 10px 10px!important}
.sheet .title{height:36px!important;font-size:22px!important;line-height:31px!important;font-weight:700!important}
.sheet table{height:1390px!important;font-size:11.6px!important}
.sheet thead,.sheet th{height:36px!important}
.sheet th{font-size:13px!important;padding:2px 3px!important}
.sheet tbody tr,.sheet td{height:27.1px!important}
.sheet td{font-size:11.4px!important;padding:1px 4px!important;line-height:1.1!important}
.sheet .date{font-size:12.8px!important;line-height:1.5!important}
.sheet .notice{font-size:11.8px!important;line-height:1.65!important}
.sheet .doc{font-size:11.2px!important;font-weight:600!important;letter-spacing:-.18px!important;text-overflow:clip!important}
.sheet .roomnum{font-size:10.7px!important;padding-left:1px!important;padding-right:1px!important}
.sheet .management{font-size:11.2px!important}
.sheet .management>b{font-size:11.8px!important}
.sheet .em{background:#fed2b5!important}
.sheet .anc,.sheet .ncd{background:#92e9fd!important}
.sheet .wbc,.sheet .ht{background:#c9fdab!important}
.sheet .closed{background:#fdfd51!important}
.sheet .iso{background:#fdc6c3!important;color:#df3b35!important}
.sheet .cbhalf>b{height:28px!important;line-height:27px!important;font-size:11.8px!important}
.sheet .cbhalf div{height:35px!important;padding:5px 4px!important}
.sheet .cbhalf strong{font-size:12px!important}
.sheet .cbhalf span{font-size:10.7px!important;font-weight:600!important;height:21px!important;white-space:nowrap!important;overflow:hidden!important}
.sheet .write{height:32px!important}
`;

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function onePhysician(text){
  const s=clean(text);
  if(!s||!s.includes('/'))return s;
  const parts=s.split(/\s*\/\s*/).map(clean).filter(Boolean);
  const doctors=parts.filter(x=>/^Dr\.?\s+/i.test(x));
  return doctors[0]||parts[0]||s;
}
function fitOne(el){
  const before=clean(el.textContent);
  if(!before)return;
  const after=onePhysician(before);
  if(after!==before)el.textContent=after;
}
function apply(root){
  const sheet=root?.matches?.('.sheet')?root:root?.querySelector?.('.sheet');
  if(!sheet)return null;
  let style=sheet.querySelector(':scope > style[data-rotastic-export-polish]');
  if(!style){style=document.createElement('style');style.dataset.rotasticExportPolish='2';style.textContent=POLISH;sheet.prepend(style)}
  /* A duty/clinic/Code Blue slot represents one physician. Never print merged fallback candidates. */
  sheet.querySelectorAll('.doc,.cbhalf span').forEach(fitOne);
  return sheet;
}
function install(){
  if(typeof window.html2canvas!=='function')return false;
  if(window.html2canvas.__rotasticPolishedV2)return true;
  const original=window.html2canvas;
  const wrapped=function(element,options){apply(element);return original.call(this,element,options)};
  Object.assign(wrapped,original);wrapped.__rotasticPolishedV2=true;wrapped.__rotasticOriginal=original;
  window.html2canvas=wrapped;
  return true;
}
if(!install()){
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
}
const obs=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)apply(n)});
if(document.documentElement)obs.observe(document.documentElement,{childList:true,subtree:true});
})();
