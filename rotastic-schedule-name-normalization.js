(()=>{
'use strict';
/* Schedule-name normalization only. No layout, CSS, navigation, or rota assignment changes. */
const normalize=s=>String(s??'')
  .replace(/\bDr\.?\s+(?:M\.?\s+)?Moursi\b/gi,'Dr Moursi')
  .replace(/\bDr\.?\s+Morsi\b/gi,'Dr Moursi')
  .replace(/\bDr\.?\s+(?:Mohammad|Muhammad|Mohammed|Mohamed)\s+K\.?\b/gi,'Dr Qaisar')
  .replace(/\bDr\.?\s+(?:Muhammad|Mohammed|Mohamed|Mohammad)\s+(?:Kaisar|Qaisar|Kaiser)\b/gi,'Dr Qaisar')
  .replace(/\bDr\.?\s+(?:Kaisar|Kaiser|Qaisar)\b/gi,'Dr Qaisar');
window.rotasticNormalizeScheduleDoctorName=normalize;
function normalizeTextNode(n){if(!n||n.nodeType!==3)return;const before=n.nodeValue||'';const after=normalize(before);if(after!==before)n.nodeValue=after}
function scan(root=document){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return /\b(?:moursi|morsi|m\.?\s+moursi|kaisar|kaiser|qaisar|mohammad\s+k\.?)\b/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(normalizeTextNode)}
function normalizeScheduleData(value,seen=new WeakSet()){if(typeof value==='string')return normalize(value);if(!value||typeof value!=='object')return value;if(seen.has(value))return value;seen.add(value);if(Array.isArray(value)){for(let i=0;i<value.length;i++)value[i]=normalizeScheduleData(value[i],seen);return value}for(const k of Object.keys(value)){try{value[k]=normalizeScheduleData(value[k],seen)}catch(e){}}return value}
window.rotasticNormalizeScheduleNames=()=>{['currentSchedule','rotasticCurrentSchedule','schedule','rota'].forEach(k=>{try{if(window[k])normalizeScheduleData(window[k])}catch(e){}});scan(document)};
const observer=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')normalizeTextNode(m.target);for(const n of m.addedNodes){if(n.nodeType===3)normalizeTextNode(n);else if(n.nodeType===1)scan(n)}}});
function init(){window.rotasticNormalizeScheduleNames();observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});setInterval(window.rotasticNormalizeScheduleNames,2000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
