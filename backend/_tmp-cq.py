import io
edits = {
 'frontend/src/main.tsx': [('Loading Cozy Quiz...', 'Loading CozyQuiz...')],
 'frontend/src/pages/QQModeratorPage.tsx': [("label: '🍺 Cozy Quiz'", "label: '🍺 CozyQuiz'"), ("title: 'Cozy Quiz', sub: 'Pub", "title: 'CozyQuiz', sub: 'Pub")],
 'frontend/src/pages/QQSetupWizard.tsx': [("'Cozy Quiz (Grid)'", "'CozyQuiz (Grid)'")],
}
for f, pairs in edits.items():
    with io.open(f, encoding='utf-8') as fh: s = fh.read()
    for a,b in pairs:
        if a in s: s = s.replace(a,b); print('ok', f, repr(a[:30]))
        else: print('MISS', f, repr(a[:30]))
    with io.open(f,'w',encoding='utf-8',newline='') as fh: fh.write(s)
