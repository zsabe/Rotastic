from pathlib import Path
p=Path("index.html")
s=p.read_text()
a=s.index("  if (chars.length) {\n    typeNext();",s.index("function renderOpeningTypewriterBriefing"))
b=s.index("\n  if (!persistent) {",a)
s=s[:a]+"""  // Render the complete message atomically; shared ticker timers may be cancelled.
  detail.textContent = detailText;
  finishGreeting();
"""+s[b:]
old="new MutationObserver(function(){setTimeout(enhance,20);}).observe(document.documentElement,{childList:true,subtree:true});"
new="""var pendingEnhance=null;
  new MutationObserver(function(records){
    if(!records.some(function(r){return Array.from(r.addedNodes).some(function(n){return n.nodeType===1 && (n.matches('table,#rotaPlanner,#rotaPlannerView,[data-rota-planner]') || n.querySelector('table,#rotaPlanner,#rotaPlannerView,[data-rota-planner]'));});}))return;
    if(pendingEnhance!==null)return;
    pendingEnhance=setTimeout(function(){pendingEnhance=null;enhance();},80);
  }).observe(document.documentElement,{childList:true,subtree:true});"""
assert s.count(old)==1
s=s.replace(old,new)
p.write_text(s)
