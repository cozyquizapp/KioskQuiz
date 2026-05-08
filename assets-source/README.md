# assets-source

Source-Files (SVG-Originals etc.), die NICHT auf das Vercel-CDN sollen.
Liegen hier, damit sie im Git tracked bleiben, aber nicht via `frontend/public/` ausgeliefert werden.

## cozywolf/

4 Cozywolf-SVG-Quellen (~4.7 MB). Die ausgelieferten 22 PNG-Posen werden aus diesen
SVGs via `scripts/compress-cozywolf.js` (sharp-Pipeline) gerendert nach
`frontend/public/avatars/cozywolf/`.

Bei neuen Posen oder Stil-Änderungen: SVGs hier anpassen + Pipeline neu laufen lassen.
