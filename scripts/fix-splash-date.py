from pathlib import Path
import subprocess

p = Path('index.html')
s = p.read_text()

def replace_js_function(src, name, replacement):
    start = src.find(f'function {name}(')
    if start < 0:
        raise SystemExit(f'{name} not found')
    brace = src.find('{', start)
    if brace < 0:
        raise SystemExit(f'{name} opening brace not found')
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(src):
        c = src[i]
        nxt = src[i + 1] if i + 1 < len(src) else ''
        if line_comment:
            if c == '\n':
                line_comment = False
        elif block_comment:
            if c == '*' and nxt == '/':
                block_comment = False
                i += 1
        elif quote:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == quote:
                quote = None
        else:
            if c in ("'", '"', '`'):
                quote = c
            elif c == '/' and nxt == '/':
                line_comment = True
                i += 1
            elif c == '/' and nxt == '*':
                block_comment = True
                i += 1
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return src[:start] + replacement + src[i + 1:]
        i += 1
    raise SystemExit(f'{name} closing brace not found')

qatar_today = '''function getQatarTodayISO() {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Qatar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const value = {};
    parts.forEach(function(part) {
      if (part.type !== 'literal') value[part.type] = part.value;
    });
    if (!value.year || !value.month || !value.day) throw new Error('Qatar date unavailable');
    return [value.year, value.month, value.day].join('-');
  } catch (e) {
    const qatarNow = new Date(Date.now() + (3 * 60 * 60 * 1000));
    const y = qatarNow.getUTCFullYear();
    const m = String(qatarNow.getUTCMonth() + 1).padStart(2, '0');
    const d = String(qatarNow.getUTCDate()).padStart(2, '0');
    return [y, m, d].join('-');
  }
}'''

qatar_long = '''function getQatarLongDateText(isoDate) {
  try {
    const iso = String(isoDate || getQatarTodayISO());
    const match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso);
    if (!match) throw new Error('Invalid Qatar date');
    const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Qatar',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Qatar',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }
}'''

s = replace_js_function(s, 'getQatarTodayISO', qatar_today)
s = replace_js_function(s, 'getQatarLongDateText', qatar_long)

required = [
    'id="tickerContent"',
    'You are off today',
    'id="topActionGrid"',
    'id="scheduleMatrixContainer"',
    'id="rotasticSplashDate"',
    "dateEl.textContent = 'Today is ' + getQatarLongDateText(getQatarTodayISO());"
]
missing = [item for item in required if item not in s]
if missing:
    raise SystemExit('Accepted UI anchor missing: ' + ', '.join(missing))

p.write_text(s)

test = qatar_today + '\n' + qatar_long + "\nconsole.log(getQatarTodayISO()); console.log(getQatarLongDateText(getQatarTodayISO()));\n"
test_path = Path('/tmp/qatar-date-test.js')
test_path.write_text(test)
r = subprocess.run(['node', str(test_path)], capture_output=True, text=True)
print(r.stdout)
if r.returncode:
    print(r.stderr)
    raise SystemExit('Qatar date helper test failed')
if '2026-10-26' not in r.stdout or '26 October 2026' not in r.stdout:
    raise SystemExit('Qatar date output was not the expected current date')
