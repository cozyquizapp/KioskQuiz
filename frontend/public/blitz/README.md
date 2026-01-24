# Blitz Image Assets

Place 5 images per theme in the folders below. Files are served from `/blitz/<theme>/<index>.jpg`.

Themes and files:
- buildings: 1.jpg .. 5.jpg
- films: 1.jpg .. 5.jpg
- gaming: 1.jpg .. 5.jpg
- sports: 1.jpg .. 5.jpg
- stadiums: 1.jpg .. 5.jpg
- theater: 1.jpg .. 5.jpg
- herbs: 1.jpg .. 5.jpg
- mountains: 1.jpg .. 5.jpg
- cars: 1.jpg .. 5.jpg
- flags: 1.jpg .. 5.jpg

Recommended size: 1280x720 or square 1024x1024 (JPG or PNG). Keep filenames simple (1.jpg ... 5.jpg).

Once added, I'll wire `mediaUrl` in `backend/src/data/quizzes.ts` to these paths so Fotoblitz shows images on Beamer and Team views.
