"""Render representative pages from each completed slide PDF for visual review."""
from pathlib import Path
import json
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

course = json.loads(Path('public/course.json').read_text('utf8'))
out = Path('output/pdf-review')
out.mkdir(parents=True, exist_ok=True)
shots, report = [], []
for lecture in course['lectures']:
    pdf = pdfium.PdfDocument(str(Path('outputs/pdf/student') / (lecture['id'] + '.pdf')))
    assert len(pdf) == len(lecture['slides'])
    selected = [0] + [next(i for i, s in enumerate(lecture['slides']) if s['id'].endswith(suffix))
                      for suffix in ['-c1-definition', '-Q01-worked', '-Q04-practice', '-experiment']]
    replacements = 0
    for i in selected:
        page = pdf[i]
        image = page.render(scale=1).to_pil().convert('RGB')
        name = lecture['id'] + '-' + str(i + 1) + '.png'
        image.save(out / name)
        shots.append((name, image.copy()))
        text = page.get_textpage()
        replacements += text.get_text_range().count('\ufffd')
        text.close()
        page.close()
    report.append({'id': lecture['id'], 'pages': len(pdf), 'rendered': [i + 1 for i in selected],
                   'replacementCharactersInSample': replacements})
    pdf.close()
for start in range(0, len(shots), 20):
    sheet = Image.new('RGB', (1200, 1000), '#e5e5e8')
    draw = ImageDraw.Draw(sheet)
    for j, (name, image) in enumerate(shots[start:start + 20]):
        image.thumbnail((290, 163))
        x, y = (j % 4) * 300 + 5, (j // 4) * 200 + 5
        sheet.paste(image, (x, y))
        draw.text((x, y + 167), name[:42], fill='black')
    sheet.save(out / ('contact-' + str(start // 20 + 1) + '.png'))
Path('reports/pdf-visual-review.json').write_text(json.dumps({'lectures': report, 'renderedPages': len(shots)}, ensure_ascii=False, indent=2) + '\n', 'utf8')
print('Rendered', len(shots), 'pages from', len(report), 'PDFs')
