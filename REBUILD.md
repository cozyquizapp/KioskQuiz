# CozyQuiz / CozyArena — Rebuild Brief

## In one sentence
A **live, hosted projector quiz** for groups: the moderator runs the show, players
answer on their **own phones**, and everything that matters happens big on the
**projector** — with the warmth and play of a cozy brand, not the coldness of typical
quiz tools.

## The experience
It is NOT a solo-phone quiz (not Kahoot). The phone is only **input**; the *show* is the
projector. A human hosts, there is tension, reveals are **staged moments**, not stats.
It should feel like **television / a games night** — warm and communal.

## Three screens (one synced state)
- **Projector** (`/beamer`) — the stage. Questions, reveals, scoring, animation.
  Never scrolls; fixed 1920x1080 canvas scaled via `transform:scale`; cqw/cqh sizing.
- **Moderator** (`/moderator`) — the remote/director. Starts questions, reveals, paces.
  Streamdeck-optimised (space/enter step the show).
- **Phone / Team** (`/team`) — the controller. Join, type answers, wait. Touch-first.
All three attach to the same room code and see the same real-time state.

## Two modes (same brand, different behaviour)
- **CozyQuiz** (small, ~3-4 teams): a **5x5 grid**; answering correctly claims a cell;
  scoring by **largest connected territory**. Steals, jokers, comeback rounds.
- **CozyArena** (large, up to ~40 phones / 100+ people): no grid; sub-teams grouped into
  **8 concept factions** (crest, colour, name, motto). A **bar-race standings** and
  **0-100 per-faction scoring** replace the grid.

## Round loop
Start question -> phones show the right input + a **server-clock** timer -> players submit
(optimistic lock) -> moderator reveals (**staged**) -> points/cells awarded -> standings ->
next question. A game = several **phases/rounds** (~3-4, ~5 questions each) with **finale
multipliers** in the last round (x2, last question x3).

## Question categories
Each is a type with its own phone input + projector reveal:
MUCHO (multiple choice) · Schaetzchen (estimate a number, closest wins, number-line
reveal) · 10 von 10 (all-in: spread 10 points) · CHEESE (image/perception) · Bunte Tuete
(a container of mini-formats: name-5, order, map-pin/CozyGuessr, poll/Family-Feud,
swarm-estimate, hot-potato...).
Large-group rule: **all decision-critical info must be on the projector** (only one person
per faction holds the phone).

## Scoring
- CozyQuiz: 1 correct = 1 point = 1 cell; largest connected territory wins.
- CozyArena: each phone scores **0-100**/question, faction = **average** (size-fair);
  per-category maths (binary / proportional / distance-nearness). Finale x2 / last-q x3.

## Brand & design
CozyWolf = a speaking wolf with a speech bubble IS the logo. Colours pink `#EC4899` /
magenta `#A21247` / navy — no gold. Fonts Nunito (body), Fredoka (display), League Spartan
(wordmark). ~80 hand-made 3D animal avatars as crests. Warm dark, fireflies, soft depth,
colour blocks — **vibrant & playful, not cold-minimal.** Reveals are **sequences, not
images** (a choreographed "you just won" moment).

## Tech
- **Frontend:** React + TypeScript, **Vite**, React Router. Bespoke inline CSS + keyframes,
  no UI lib; cqw/cqh container-queries on the fixed beamer canvas.
- **Backend:** Node + **Socket.IO** (realtime). Authoritative server room-state broadcast
  as `stateUpdate` to all three roles; no REST polling for live data; server-clock timers.
- **Persistence:** MongoDB (Atlas) for drafts, history, feedback. Shared TS types package.
- **Deploy:** frontend PWA on Vercel (auto-update); backend self-hosted on Coolify
  (auto-deploy on push). Media on Cloudinary.

## Non-obvious principles
1. Beamer scales, never scrolls (fixed canvas + scale, container-query units).
2. One state, three views (roles are projections of the server room-state).
3. Design system as code (tokens + reusable primitives -> every screen inherits one hand).
4. Warm > clever (personality: wolf, animals, fireflies — not minimalism).
5. Hosted, not automated (a human drives tension; the app is the host's stage).
