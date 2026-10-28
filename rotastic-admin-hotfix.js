(()=>{
'use strict';
function removeCodeCreationBoxes(){
  ['tempAdminCodeManagerCard','adminAccessGrantCard'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      el.classList.add('hidden');
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
    }
  });
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',removeCodeCreationBoxes,{once:true});
}else{
  removeCodeCreationBoxes();
}
const observer=new MutationObserver(removeCodeCreationBoxes);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
})();
