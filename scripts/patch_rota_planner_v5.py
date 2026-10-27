from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove the entire legacy Week Commencing navigation block at source level,
# including Previous/Next week arrows and the week selector.
week_block=r'''<div class="mb-3" id="plannerWeekHeading">\s*<div class="flex flex-wrap items-center justify-center gap-2">\s*<button aria-label="Previous week".*?</button>\s*<div class="min-w-\[220px\]">.*?<select[^>]+id="plannerWeekSelect".*?</select>\s*</div>\s*<button aria-label="Next week".*?</button>\s*</div>\s*</div>'''
s,n=re.subn(week_block,'',s,count=1,flags=re.S)
if n==0 and 'id="plannerWeekHeading"' in s:
    start=s.find('<div class="mb-3" id="plannerWeekHeading">')
    if start>=0:
        marker='<div class="flex items-center justify-between gap-3 mb-2">'
        end=s.find(marker,start)
        if end<0: raise SystemExit('plannerWeekHeading end anchor missing')
        s=s[:start]+s[end:]

# Remove the old leave day-card calendar from the visible Planner. The schedule matrix
# remains the Planner display; the old element is retained hidden as a compatibility hook
# for existing functions/exports that still look it up by id.
s=s.replace('<div class="leave-date-grid" id="weeklyLeaveCalendar"></div>', '<div class="leave-date-grid hidden" id="weeklyLeaveCalendar" aria-hidden="true"></div>', 1)

# Hide the old weekly group-away summary that belongs to the removed day-card interface.
s=s.replace('<div class="grid grid-cols-2 gap-2 mb-3" id="plannerGroupWeekSummary">', '<div class="hidden" id="plannerGroupWeekSummary" aria-hidden="true">', 1)

# Add a concise ERP reminder directly under the Request Leave / Report Sick Leave button row.
needle='''<i class="fa-solid fa-kit-medical mr-1.5"></i>Report Sick Leave
          </button>
</div>'''
reminder='''<i class="fa-solid fa-kit-medical mr-1.5"></i>Report Sick Leave
          </button>
</div>
<p class="text-[9px] leading-relaxed text-slate-500 text-center mt-2 px-1" id="leaveErpReminder"><i class="fa-solid fa-circle-info mr-1 text-slate-600"></i>Requests submitted through ROTASTIC do not replace the official ERP application. Please make sure you also apply through ERP.</p>'''
if 'id="leaveErpReminder"' not in s:
    if needle not in s: raise SystemExit('Request Leave button row anchor missing')
    s=s.replace(needle,reminder,1)

# Defensive cleanup for cached/older markup. Also keep the obsolete day-card UI hidden
# if another legacy render function populates it after load.
s=s.replace("function hideWeek(){var h=document.getElementById('plannerWeekHeading');if(h){h.style.display='none';return}var s=document.getElementById('plannerWeekSelect');if(s)s.style.display='none'}","function hideWeek(){var h=document.getElementById('plannerWeekHeading');if(h)h.style.display='none';var s=document.getElementById('plannerWeekSelect');if(s)s.style.display='none';var c=document.getElementById('weeklyLeaveCalendar');if(c){c.style.display='none';c.setAttribute('aria-hidden','true')}var g=document.getElementById('plannerGroupWeekSummary');if(g){g.style.display='none';g.setAttribute('aria-hidden','true')}}")

p.write_text(s,encoding='utf-8')
