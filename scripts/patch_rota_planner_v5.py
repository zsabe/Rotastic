from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove the entire legacy Week Commencing navigation block at source level,
# including Previous/Next week arrows and the week selector.
week_block=r'''<div class="mb-3" id="plannerWeekHeading">\s*<div class="flex flex-wrap items-center justify-center gap-2">\s*<button aria-label="Previous week".*?</button>\s*<div class="min-w-\[220px\]">.*?<select[^>]+id="plannerWeekSelect".*?</select>\s*</div>\s*<button aria-label="Next week".*?</button>\s*</div>\s*</div>'''
s,n=re.subn(week_block,'',s,count=1,flags=re.S)
if n==0 and 'id="plannerWeekHeading"' in s:
    # Guarded fallback: remove only the specifically identified planner heading wrapper.
    start=s.find('<div class="mb-3" id="plannerWeekHeading">')
    if start>=0:
        marker='<div class="flex items-center justify-between gap-3 mb-2">'
        end=s.find(marker,start)
        if end<0: raise SystemExit('plannerWeekHeading end anchor missing')
        s=s[:start]+s[end:]

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

# Defensive cleanup for already-rendered/cached markup: hide the full legacy heading if present.
s=s.replace("function hideWeek(){var s=document.getElementById('plannerWeekSelect');if(!s)return;var p=s.parentElement;while(p&&p.parentElement&&p.parentElement!==document.body){var t=(p.textContent||'').toUpperCase();if(t.indexOf('WEEK COMMENCING')>=0){p.style.display='none';return}p=p.parentElement}s.style.display='none'}","function hideWeek(){var h=document.getElementById('plannerWeekHeading');if(h){h.style.display='none';return}var s=document.getElementById('plannerWeekSelect');if(s)s.style.display='none'}")

p.write_text(s,encoding='utf-8')
