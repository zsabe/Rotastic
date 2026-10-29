from pathlib import Path

p = Path('rotastic-export-template.js')
s = p.read_text(encoding='utf-8')
old = "while(normal.length<4)normal.push(['','','','']);return{d,rows:base.concat(normal.slice(0,4))}"
new = "while(normal.length<4)normal.push(['','','','']);return{d,rows:base.concat(normal.slice(0,4))}"
# Preserve the locked 10-row export geometry. Make physicians in noRoomDocs visible by
# prioritising them ahead of ordinary room rows; named clinics remain first.
needle = "const preferred=['9','10','12','13','14','39','21','22','24','25','26','27','32','38'];"
if needle not in s:
    raise SystemExit('export preferred-room anchor missing')
room_loop = "  const roomKeys=[...preferred,...Object.keys(d.rooms||{}).filter(r=>!preferred.includes(String(r)))];\n  for(const room of roomKeys){const raw=d.rooms?.[room];const doc=doctor(raw);if(!isDoc(doc)||seen.has(key(doc)))continue;seen.add(key(doc));out.push(['',doc,'',String(room)])}\n  for(const raw of d.noRoomDocs||[]){const doc=doctor(raw);if(!isDoc(doc)||seen.has(key(doc)))continue;seen.add(key(doc));out.push(['',doc,'',''])}"
priority_loop = "  for(const raw of d.noRoomDocs||[]){const doc=doctor(raw);if(!isDoc(doc)||seen.has(key(doc)))continue;seen.add(key(doc));out.push(['',doc,'',''])}\n  const roomKeys=[...preferred,...Object.keys(d.rooms||{}).filter(r=>!preferred.includes(String(r)))];\n  for(const room of roomKeys){const raw=d.rooms?.[room];const doc=doctor(raw);if(!isDoc(doc)||seen.has(key(doc)))continue;seen.add(key(doc));out.push(['',doc,'',String(room)])}"
if priority_loop not in s:
    if room_loop not in s:
        raise SystemExit('export normal-row ordering anchor missing')
    s = s.replace(room_loop, priority_loop, 1)
if old not in s:
    raise SystemExit('locked export row-count invariant missing')
p.write_text(s, encoding='utf-8')
print('Prioritised generated no-room physicians in the locked export rows; UI and geometry unchanged.')
