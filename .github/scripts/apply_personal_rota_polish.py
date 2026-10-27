from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=re.sub(r'\n?<style id="rotastic-personal-live-guarantee">.*?</style>\s*','\n',s,flags=re.S)

old="""  if (minuteMatch) {\n    label.textContent = minuteMatch[1] + ' min';\n    if (sub) sub.textContent = 'ETA · Abu Nakhla';\n"""
new="""  if (minuteMatch) {\n    label.textContent = minuteMatch[1] + ' minutes to Abu Nakhlah Health Centre';\n    if (sub) sub.textContent = '';\n"""
assert old in s, 'ETA formatter anchor missing'
s=s.replace(old,new,1)
s=s.replace('fa-solid fa-location-arrow text-[14px] opacity-90','fa-solid fa-car-side text-[13px] opacity-90',1)

old="const subText = isLeave ? '' : '';"
new="const holidayInfo = getQatarHolidayInfo(isoDate);\n  const subText = holidayInfo ? holidayInfo.greeting : '';"
assert old in s, 'rest poster subtext anchor missing'
s=s.replace(old,new,1)

anchor="  const dutyCount = getShiftDisplayedDutyCount(s, period);"
assert anchor in s, 'shift card anchor missing'
insertion="""  const dutyCount = getShiftDisplayedDutyCount(s, period);\n  const headerRooms = (activeUserDocName && sh) ? getRoomAssignmentsForDoctor(sh, activeUserDocName) : [];\n  const headerRoomText = headerRooms.length ? ('Room ' + headerRooms.join(' / ')) : 'Room —';\n  const headerDuration = isAM ? '7 hours' : '6 hours';\n  const headerDayDate = [s.day, s.date].filter(Boolean).join(' · ');"""
s=s.replace(anchor,insertion,1)
duty_line='<div class="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-bold">${isAM ? \'Morning duty\' : \'Evening duty\'}</div>'
assert duty_line in s, 'shift header line missing'
s=s.replace(duty_line,duty_line+'\n          <div class="rotastic-shift-header-meta">${headerDayDate} · ${headerRoomText} · ${headerDuration}</div>',1)

anchor="""  const roomText = rooms.length === 1\n    ? 'Room ' + rooms[0]\n    : rooms.length > 1\n      ? 'Rooms ' + rooms.join(' / ')\n      : (clinics.length ? cleanClinicLabelForSentence(clinics[0]) : 'Duty assigned');\n"""
assert anchor in s, 'personal working summary anchor missing'
add=anchor+"""\n  const personalHoliday = getQatarHolidayInfo(todayISO);\n  const personalHours = shiftWindow && shiftWindow.label ? shiftWindow.label : (timing.period === 'am' ? '07:00 – 14:00' : '16:00 – 22:00');\n  const personalRoom = rooms.length ? rooms.join(' / ') : '—';\n  const personalClinics = clinics.length ? clinics.map(function(c){ return cleanClinicLabelForSentence(c); }).filter(Boolean).join(', ') : '';\n  const personalWish = getRotasticShiftWish ? getRotasticShiftWish() : 'Wishing you a smooth, positive shift today. ✨';\n"""
s=s.replace(anchor,add,1)
today_line='<div class="text-lg sm:text-xl font-black text-white mt-1">Today · ${todayText}</div>'
assert today_line in s, 'personal card today line missing'
summary="""${personalHoliday ? `<div class=\"personal-holiday-greeting\">${personalHoliday.greeting}</div>` : ''}\n        <div class=\"personal-shift-summary\">\n          <div>🕒 You are working ${personalHours} today.</div>\n          <div>🚪 You will be in room ${personalRoom}.</div>\n          ${personalClinics ? `<div>🩺 You are covering ${personalClinics} clinic${clinics.length > 1 ? 's' : ''}.</div>` : ''}\n          <div>⭐ Shift lead is ${shiftLead || 'not assigned'}.</div>\n          <div class=\"personal-shift-wish\">${personalWish} 🌟💪😊</div>\n        </div>"""
s=s.replace(today_line,today_line+'\n        '+summary,1)

style='''
<style id="rotastic-requested-personal-rota-polish">
.live-rota-meta-row{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;width:100%!important}
.live-rota-meta-row::before{content:none!important;display:none!important}
.live-rota-meta-row>.rotastic-live-mini{display:inline-flex!important;visibility:visible!important;opacity:1!important;grid-column:1!important;grid-row:1!important;align-items:center!important;justify-self:start!important;gap:4px!important;width:auto!important;min-width:0!important;height:28px!important;min-height:28px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
.rotastic-live-mini-label{display:inline!important;color:#f43f5e!important;font-size:10px!important;line-height:1!important;font-weight:800!important}
#liveRotaUpdatedAt{display:none!important}
.live-drive-slot{grid-column:2!important;grid-row:1!important;display:flex!important;justify-content:center!important;min-width:0!important;overflow:visible!important}
.live-drive-slot #driveTimeBtn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;width:auto!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:32px!important;padding:2px 4px!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#7dd3fc!important;text-align:center!important;overflow:hidden!important}
.live-drive-slot #driveTimeBtn>i{display:inline-block!important;flex:0 0 auto!important;font-size:12px!important}
#driveTimeBtnText{display:block!important;max-width:220px!important;white-space:normal!important;overflow-wrap:normal!important;word-break:normal!important;text-overflow:clip!important;font-size:10px!important;line-height:1.15!important;font-weight:800!important;text-align:center!important}
#driveTimeBtnSub{display:none!important}
#weatherBadge{grid-column:3!important;grid-row:1!important;justify-self:end!important;width:auto!important;min-width:0!important;height:28px!important;min-height:28px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#weatherTemp{font-size:10px!important;line-height:1!important;font-weight:800!important}
.personal-poster-card,.personal-poster-content{min-height:clamp(500px,58dvh,620px)!important}
.my-shift-presence-card{min-height:clamp(500px,58dvh,620px)!important}
.personal-holiday-greeting{margin-top:8px;font-size:12px;font-weight:900;color:#fde68a;line-height:1.3}
.personal-shift-summary{margin-top:12px;padding:12px 13px;border-radius:14px;border:1px solid rgba(56,189,248,.18);background:rgba(2,6,23,.42);display:grid;gap:6px;font-size:12px;line-height:1.35;color:#e2e8f0;font-weight:700}
.personal-shift-wish{margin-top:3px;color:#99f6e4;font-weight:900}
.rotastic-shift-header-meta{margin-top:4px;font-size:9px;line-height:1.25;font-weight:800;color:#cbd5e1;white-space:normal;overflow-wrap:anywhere}
@media(max-width:520px){.live-rota-meta-row{grid-template-columns:auto minmax(0,1fr) auto!important;gap:6px!important}#driveTimeBtnText{max-width:190px!important;font-size:9px!important;line-height:1.12!important}.live-drive-slot #driveTimeBtn>i{font-size:11px!important}.personal-poster-card,.personal-poster-content,.my-shift-presence-card{min-height:clamp(520px,62dvh,650px)!important}.rotastic-shift-head{align-items:flex-start!important}.rotastic-shift-header-meta{font-size:8px!important;max-width:100%!important}}
</style>
'''
s=re.sub(r'\n?<style id="rotastic-requested-personal-rota-polish">.*?</style>\s*','\n',s,flags=re.S)
s=s.replace('</body>',style+'</body>',1)

for needle in ['id="rotasticLiveMini"','id="driveTimeBtn"','id="weatherBadge"','id="rotaZoomBtn"','onclick="openSwapRequestModal()"','onclick="toggleRotaExportMenu()"']:
    assert needle in s, needle
assert 'minutes to Abu Nakhlah Health Centre' in s
assert 'rotastic-shift-header-meta' in s
assert 'You are working ${personalHours} today.' in s
p.write_text(s,encoding='utf-8')
