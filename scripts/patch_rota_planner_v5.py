from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove the Week Commencing navigation block at source level. Keep planner content below it.
week_pattern=r'<div class="planner-week-toolbar[^"]*"[^>]*>.*?id="plannerWeekSelect".*?</div>\s*</div>'
s,n=re.subn(week_pattern,'',s,count=1,flags=re.S)
if n==0:
    # Fallback: remove the closest wrapper containing the authoritative week select.
    s=re.sub(r'<div[^>]*>\s*(?:<[^>]+>.*?</[^>]+>\s*)*<select[^>]+id="plannerWeekSelect".*?</select>.*?</div>','',s,count=1,flags=re.S)

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

# Keep the existing matrix implementation, but ensure its hide routine removes the full Week Commencing control wrapper.
s=s.replace("function hideWeek(){var s=document.getElementById('plannerWeekSelect');if(s&&s.parentElement)s.parentElement.classList.add('rotastic-hide-week-select')}","function hideWeek(){var s=document.getElementById('plannerWeekSelect');if(!s)return;var p=s.parentElement;while(p&&p.parentElement&&p.parentElement!==document.body){var t=(p.textContent||'').toUpperCase();if(t.indexOf('WEEK COMMENCING')>=0){p.style.display='none';return}p=p.parentElement}s.style.display='none'}")

p.write_text(s,encoding='utf-8')
