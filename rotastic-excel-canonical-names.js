/* Display doctor names exactly as in the source Excel workbook (Book 1 (1).xlsx).
   Aliases are display-only: do not create additional doctors or alter assignments. */
(()=>{
'use strict';if(window.__rotasticExcelNames)return;window.__rotasticExcelNames=true;
const canonical={
 'bilalc':'Dr Bilal','mahera':'Dr Maher','abdulgafoork':'Dr A Gafoor','agafoor':'Dr A Gafoor',
 'laitha':'Dr Laith','abdulrashids':'Dr A Rashid','arashid':'Dr A Rashid',
 'selmane':'Dr Selman','husams':'Dr Husam','zaidse':'Dr Zaid','zaids':'Dr Zaid',
 'saiman':'Dr Saima','tayseera':'Dr Tayseer','oulat':'Dr Oula',
 'msyed':'Dr M Syed','mohammeds':'Dr M Syed','mohammedsayed':'Dr M Syed',
 'enan m':'Dr Enan','enanm':'Dr Enan','imrana':'Dr Imran','fazilak':'Dr Fazila',
 'faisalc':'Dr Faisal','shadit':'Dr Shadi','ganim':'Dr G Shafi','ghanim':'Dr G Shafi','gshafi':'Dr G Shafi',
 'qaisar':'Dr Qaisar','qaisark':'Dr Qaisar','muhammadk':'Dr Qaisar',
 'ridac':'Dr Rida','mayas':'Dr Maya','lailaa':'Dr Laila','aminullahz':'Dr Amin',
 'salahm':'Dr Saleh','salehm':'Dr Saleh','moursi':'Dr Moursi','mmoursi':'Dr Moursi',
 'syedi':'Dr N Islam','nislam':'Dr N Islam','sabat':'Dr Saba'
};
const normalize=n=>String(n||'').toLowerCase().replace(/^dr\.?\s*/,'').replace(/[^a-z0-9]/g,'');
function display(v){if(typeof v!=='string')return v;return v.replace(/Dr\.?\s+[A-Za-z]+(?:\s+[A-Za-z]+)?\.?/g,m=>canonical[normalize(m)]||m)}
window.rotasticExcelCanonicalDoctorName=n=>canonical[normalize(n)]||n;
function update(){
 const root=document.getElementById('scheduleMatrixContainer');if(!root)return;
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while((n=walk.nextNode())){const v=display(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});document.addEventListener('DOMContentLoaded',update);setTimeout(update,600);
})();