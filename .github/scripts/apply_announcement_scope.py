from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='ROTASTIC announcement scope expansion 2026-10-27'
if marker not in s:
    needle="  {country:'Pakistan',weight:10,text:'🇵🇰 Pakistan adult diabetes prevalence is estimated at 31.4%.'}"
    extra="""  {country:'Pakistan',weight:10,text:'🇵🇰 Pakistan adult diabetes prevalence is estimated at 31.4%.'},
  {country:'Global',weight:12,text:'🩺 WHO: about 1.28 billion adults aged 30–79 live with hypertension.'},
  {country:'Global',weight:11,text:'🫁 WHO: asthma affected about 262 million people and caused 455,000 deaths in 2019.'},
  {country:'Global',weight:11,text:'🫁 WHO: COPD caused about 3.5 million deaths in 2021 — around 5% of all deaths.'},
  {country:'Global',weight:11,text:'🧠 WHO: more than 57 million people were living with dementia in 2021.'},
  {country:'Global',weight:11,text:'🧠 WHO: depression affects about 280 million people worldwide.'},
  {country:'Global',weight:11,text:'🎗️ IARC: about 20 million new cancer cases occurred worldwide in 2022.'},
  {country:'Global',weight:11,text:'🚭 WHO: tobacco kills more than 7 million people each year.'},
  {country:'Global',weight:10,text:'🦠 WHO: 10.8 million people fell ill with tuberculosis in 2023.'},
  {country:'Global',weight:10,text:'❤️ WHO: cardiovascular diseases cause about 19.8 million deaths each year.'},
  {country:'Global',weight:10,text:'🩸 WHO: anaemia affects about 30% of women aged 15–49 worldwide.'} // ROTASTIC announcement scope expansion 2026-10-27"""
    if needle not in s: raise SystemExit('stats anchor missing')
    s=s.replace(needle,extra,1)
    cpd_anchor='const ROTASTIC_CPD_EVENTS = ['
    cpd_extra="""const ROTASTIC_CPD_EVENTS = [
  {startDate:'2026-10-29', endDate:'2026-10-31', text:'🇶🇦 CPD • Pediatric Neuroscience Conference • 29–31 Oct 2026 • 16.25 CPD hours • hybrid', link:'https://www.sidra.org/events-calendar/'},
  {startDate:'2026-11-27', endDate:'2026-11-28', text:'🇶🇦 CPD • Qatar Pediatric Endocrine & Diabetes Conference • 27–28 Nov 2026 • Doha', link:'https://www.sidra.org/media/news/2026/sidra-medicine-to-host-qatar-pediatric-endocrine-and-diabetes-conference-2026/'},
  {startDate:'2026-12-02', endDate:'2026-12-02', text:'🇶🇦 CPD • Essentials of Tracheostomy Care in Pediatrics • 2 Dec 2026 • Cat 1: 3.75 + Cat 3: 2.25', link:'https://www.sidra.org/events/essentials-of-tracheostomy-care-in-pediatrics-december/'},
  {startDate:'2026-12-04', endDate:'2026-12-05', text:'🇶🇦 CPD • Qatar Advancements in Pediatric Excellence • 4–5 Dec 2026 • Doha', link:'https://www.sidra.org/events-calendar/'},"""
    if cpd_anchor not in s: raise SystemExit('CPD anchor missing')
    s=s.replace(cpd_anchor,cpd_extra,1)
    css='''\n<style id="rotastic-final-announcement-alignment">\n#swapsNewsTicker:not(.ticker-greeting-mode){overflow:hidden!important;padding-right:12px!important;box-sizing:border-box!important}\n#tickerInnerRow:not(.ticker-fullwidth-mode){max-width:100%!important;box-sizing:border-box!important;padding-right:12px!important}\n#tickerInnerRow:not(.ticker-fullwidth-mode) .news-stage,#tickerInnerRow:not(.ticker-fullwidth-mode) #tickerContent,#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-message-card,#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-message-text,#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-medical-link{max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}\n#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-message-card.ticker-prayer-card{transform:translateY(10px)!important}\n@media(max-width:520px){#swapsNewsTicker:not(.ticker-greeting-mode){padding-right:8px!important}#tickerInnerRow:not(.ticker-fullwidth-mode){padding-right:8px!important}#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-message-card.ticker-prayer-card{transform:translateY(9px)!important}}\n</style>\n'''
    if '</body>' not in s: raise SystemExit('body anchor missing')
    s=s.replace('</body>',css+'</body>',1)
    p.write_text(s)
