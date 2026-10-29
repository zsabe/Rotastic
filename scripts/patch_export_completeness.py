from pathlib import Path

p = Path('rotastic-export-template.js')
s = p.read_text(encoding='utf-8')

# Export-only fixes. Do not touch app UI/CSS/navigation.
# Keep the approved fixed 10-row/day geometry, but never silently drop generated doctors.
s = s.replace("if(/\\bmoursi\\b/i.test(s))return 'Dr Morsi';", "if(/\\bmoursi\\b/i.test(s))return 'Dr Moursi';")

# Named clinics stay first. Generic room/no-room assignments are then packed into the
# remaining four physical rows. If more than four generated assignments exist, preserve
# every doctor by joining overflow names into the final row rather than truncating them.
old = "function clinicRows(day,s){const d=data(day,s),tw=s==='am'?'9-4':'2-8',base=[['Emergency Duty','','em head'],['Male',d.male,'em'],['Female',d.female,'em'],['Paeds',d.paeds,'em'],[tw,d.t1,''],[tw,d.t2,'']],already=[d.male,d.female,d.paeds,d.t1,d.t2],normal=normalRows(d,already);while(normal.length<4)normal.push(['','','','']);return{d,rows:base.concat(normal.slice(0,4))}}"
new = "function clinicRows(day,s){const d=data(day,s),tw=s==='am'?'9-4':'2-8',base=[['Emergency Duty','','em head'],['Male',d.male,'em'],['Female',d.female,'em'],['Paeds',d.paeds,'em'],[tw,d.t1,''],[tw,d.t2,'']],already=[d.male,d.female,d.paeds,d.t1,d.t2],normal=normalRows(d,already);while(normal.length<4)normal.push(['','','','']);if(normal.length>4){const overflow=normal.slice(3).filter(x=>isDoc(x[1]));const names=overflow.map(x=>displayName(x[1])).join(' / ');const rooms=overflow.map(x=>x[3]).filter(Boolean).join('/');normal.splice(3,normal.length-3,['',names,'',rooms])}return{d,rows:base.concat(normal.slice(0,4))}}"
if old not in s:
    raise SystemExit('export clinicRows anchor missing')
s = s.replace(old,new,1)

# Make Emergency rows resilient to older/currentSchedule variants without inventing
# assignments: if a named ER field is absent, use the doctor already generated in the
# conventional ER room for that same shift. Male=10, Female=12, Paeds=13.
old_data = "function data(day,s){return directData(day,s)}"
new_data = "function data(day,s){const d=directData(day,s);if(!d.male)d.male=doctor(d.rooms?.['10']);if(!d.female)d.female=doctor(d.rooms?.['12']);if(!d.paeds)d.paeds=doctor(d.rooms?.['13']);return d}"
if old_data not in s:
    raise SystemExit('export data anchor missing')
s = s.replace(old_data,new_data,1)

for token in ["Dr Moursi","normal.length>4","d.rooms?.['10']","d.rooms?.['12']","d.rooms?.['13']"]:
    if token not in s:
        raise SystemExit('missing export fix '+token)

p.write_text(s, encoding='utf-8')
print('Export completeness, ER-name rendering, and Dr Moursi display fixed; app UI unchanged.')
