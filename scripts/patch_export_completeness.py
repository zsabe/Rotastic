from pathlib import Path

p = Path('rotastic-export-template.js')
s = p.read_text(encoding='utf-8')

# Export-only fixes. Do not touch app UI/CSS/navigation.
# This patch is intentionally idempotent because the source export file may already
# contain some/all corrections before the integration workflow runs.
s = s.replace("if(/\\bmoursi\\b/i.test(s))return 'Dr Morsi';", "if(/\\bmoursi\\b/i.test(s))return 'Dr Moursi';")

old = "function clinicRows(day,s){const d=data(day,s),tw=s==='am'?'9-4':'2-8',base=[['Emergency Duty','','em head'],['Male',d.male,'em'],['Female',d.female,'em'],['Paeds',d.paeds,'em'],[tw,d.t1,''],[tw,d.t2,'']],already=[d.male,d.female,d.paeds,d.t1,d.t2],normal=normalRows(d,already);while(normal.length<4)normal.push(['','','','']);return{d,rows:base.concat(normal.slice(0,4))}}"
new = "function clinicRows(day,s){const d=data(day,s),tw=s==='am'?'9-4':'2-8',base=[['Emergency Duty','','em head'],['Male',d.male,'em'],['Female',d.female,'em'],['Paeds',d.paeds,'em'],[tw,d.t1,''],[tw,d.t2,'']],already=[d.male,d.female,d.paeds,d.t1,d.t2],normal=normalRows(d,already);while(normal.length<4)normal.push(['','','','']);if(normal.length>4){const overflow=normal.slice(3).filter(x=>isDoc(x[1]));const names=overflow.map(x=>displayName(x[1])).join(' / ');const rooms=overflow.map(x=>x[3]).filter(Boolean).join('/');normal.splice(3,normal.length-3,['',names,'',rooms])}return{d,rows:base.concat(normal.slice(0,4))}}"
if old in s:
    s = s.replace(old,new,1)
elif new not in s:
    raise SystemExit('export clinicRows anchor missing')

old_data = "function data(day,s){return directData(day,s)}"
new_data = "function data(day,s){const d=directData(day,s);if(!d.male)d.male=doctor(d.rooms?.['10']);if(!d.female)d.female=doctor(d.rooms?.['12']);if(!d.paeds)d.paeds=doctor(d.rooms?.['13']);return d}"
if old_data in s:
    s = s.replace(old_data,new_data,1)
elif new_data not in s:
    raise SystemExit('export data anchor missing')

for token in ["Dr Moursi","normal.length>4","d.rooms?.['10']","d.rooms?.['12']","d.rooms?.['13']"]:
    if token not in s:
        raise SystemExit('missing export fix '+token)

p.write_text(s, encoding='utf-8')
print('Export completeness, ER-name rendering, and Dr Moursi display enforced idempotently; app UI unchanged.')
