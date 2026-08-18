# 12 Motive: D. Bemaltes Holz

> Proof-of-concept fuer die Produktion. Seed speichern — alle 12 mit DEMSELBEN Seed rendern.
> Zielgroesse: 512x512 transparent, Motiv fuellt ~80%.

## Basis-Block (wortgleich, alle 12 Motive)

```
A set of 12 icons in one consistent style, arranged in a single row on a plain
flat background, evenly spaced, all rendered with the SAME camera, the SAME
lighting and the SAME optical weight.

The 12 subjects, in this order:
1. a fox
2. a panda
3. a shrimp
4. a whale
5. a dragon
6. a thumbs-up hand
7. a waving hand
8. a heart
9. a party celebration symbol
10. a beer mug
11. a book
12. a lightbulb

Hard rules, they define the set:
- Faces ONLY on the fox, panda, whale and dragon. The hands, the heart, mug,
  book and lightbulb have NO face, no eyes, no mouth. This is critical.
- Where there are eyes: small, matte, no specular highlights, no eyelashes.
  Calm, attentive expression. No smiling. No blushing cheeks. Not cute.
- Matte surface throughout. No gloss, no plastic shine, no rim highlights.
- One soft key light from the upper left at roughly 35 degrees, identical on all
  twelve, plus faint ambient fill from the lower right. A soft contact shadow
  under each object so it reads as a physical thing, not a sticker.
- Each object carries one small warm glow inside it, like a firefly is sitting
  in it. Subtle, not a lamp.
- Every object is slightly tilted, never perfectly upright.
- Slight handmade irregularity: uneven edges, small dents, nothing machine perfect.
- Simplified forms. No fur strands, no individual feathers, no scales.
- Muted, warm, desaturated colours. No candy colours.
- No outlines, no text, no background scenery, no reflections.
- All twelve objects fill the same visual weight: the whale must not dominate
  the heart.

Square framing, each object centred in its own cell, generous margin.
```

## Stil: D. Bemaltes Holz

```
Style: hand-painted carved wood, visible grain under the paint, slightly worn
paint edges, matte varnish, the look of a wooden toy made by a craftsman.
```

---

## Rendering notes

* **Seitenverhaeltnis:** breite Reihe (12 nebeneinander), nicht quadratisch pro Motiv
* **Seed:** [DEIN SEED HIER — SPEICHERN UND VERWENDEN FUER ALLE 12]
* **Hintergrund:** flach und einfarbig, damit sich spaeter sauber freistellen laesst
* **Keine Beschriftung** im Bild

## Nach dem Rendern

1. Freistellen (transparenter Hintergrund, Grund entfernen)
2. Einzelne Motive trennen und in 512x512er Dateien speichern:
   - `D-holz-01-fuchs.png`
   - `D-holz-02-panda.png`
   - `D-holz-03-garnele.png`
   - `D-holz-04-wal.png`
   - `D-holz-05-drache.png`
   - `D-holz-06-daumen.png`
   - `D-holz-07-winken.png`
   - `D-holz-08-herz.png`
   - `D-holz-09-party.png`
   - `D-holz-10-krug.png`
   - `D-holz-11-buch.png`
   - `D-holz-12-gluehbirne.png`
3. Zu `design-assets/avatars/holz/` legen (neu anlegen)
