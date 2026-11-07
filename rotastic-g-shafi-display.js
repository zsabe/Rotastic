/* Workbook display name for Dr Gani M. / Dr G Shafi (same doctor). */
(()=>{'use strict';if(window.__rotasticGShafiName)return;window.__rotasticGShafiName=true;
const old=/\bDr\s+Gani\s*M\.?\b/gi;
function update(){const root=document.getElementById('scheduleMatrixContainer');if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))if(old.test(node.nodeValue)){node.nodeValue=node.nodeValue.replace(old,'Dr G Shafi');old.lastIndex=0}}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});document.addEventListener('DOMContentLoaded',update);setTimeout(update,600);
})();