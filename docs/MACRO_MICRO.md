# Macro / Micro

A real photo, zoomed in until it makes no sense. Zoom out until you know what it is. The less you need to see, the more you score.

Route: `/macro-micro/`. Photo picker (admins): `/macro-micro/curate`. Credits: `/macro-micro/credits`.

## Adding the photos (needed once, about a minute each)

The game ships with 67 objects: names, accepted answers, hints, facts, difficulty and a ready-made search. Each one needs a photo before it can be played. The photos come from Wikimedia Commons and are picked by a person, because only a person can check that a photo really shows the object and choose a good spot to start the zoom.

1. **Be an admin** (first time only): in Render → oddball → Environment, add `ADMIN_SETUP_TOKEN` set to any long random text. Wait for the redeploy, sign up at `/login`, open `/admin` and enter the token.
2. **Open `/macro-micro/curate`** and click an object on the left. Commons is searched for you. Photos that aren't freely licensed or are under 1,500 px are greyed out.
3. **Pick a photo** where the object is obvious when you see the whole thing. You can also paste an exact Commons file name.
4. **Click an interesting spot** and set the starting zoom. Check the preview: it should be hard to recognise, but not just a blur.
5. **Click "Use this photo".** The server downloads it once, checks the licence again, makes the zoom layers and stores them in the database. The object is playable immediately.

"Test it" plays that one object as practice. The game works with any number of photos: rounds = the photos available, up to 10.

## How the zoom works

- When a photo is approved, the server builds three layers with sharp:
  - the **whole photo**, up to 2048 px
  - a **full-resolution crop** around your chosen spot, covering everything visible from 2.5× upwards (up to 2400 px)
  - a **thumbnail**
- The game puts the crop exactly over its part of the whole photo. Deep zoom therefore uses real detail instead of stretching a small image.
- The photo is laid out at its real pixel size rather than with a CSS scale transform. That keeps it sharp: browsers can blur a layer that's scaled with a transform.
- The server measures how far each photo can zoom while staying sharp (`zoom_limit`), and caps the starting zoom there.
- From 2.5× upwards the view stays centred on your chosen spot. Below that it slides smoothly towards the centre, until 1× shows the whole photo.
- The slider, mouse wheel, pinch, the −/+ buttons and the −/= keys all move one zoom value. The wheel and pinch never scroll the page.

## Scoring

The slider has 1,000 steps on a log scale: step `s` means zoom `startZoom^(s/1000)`. The score depends only on the **lowest step reached** (`lowest`):

```
score = floor + (1000 − floor) × (lowest / 1000)^curve − 50 × wrong guesses   (never below 0)
```

| Difficulty | floor | curve |
|---|---|---|
| Easy | 150 | 0.75 (gentle) |
| Medium | 100 | 1.0 |
| Hard | 50 | 1.3 (harsh) |

**What follows from this:**
- Zooming back in never gives points back.
- Scroll speed, hardware and timing make no difference.
- Repeating the same wrong guess is free, and so are "warmer" guesses.
- Giving up scores 0.

**Final title** (by average points per photo): 900+ Microscopic Genius, 750+ Sharp Observer, 550+ Good Eye, 350+ Getting Warmer, otherwise Needs a Microscope.

## Modes

| Mode | Rounds | Difficulty |
|---|---|---|
| Classic | 10 | easy → hard (3 / 4 / 3) |
| Easy | 10 | easy |
| Hard | 10 | hard |
| Endless | until 3 strikes | rises every few rounds |

In Endless, a strike is a give-up or a round worth under 300 points.

## Answers

Answers stay on the server (`games/macro-micro/shared/objects.js` is never sent to the browser). Players only see opaque ids generated from a random secret, so neither the network traffic nor the image links give anything away. Checking (`shared/answers.js`):
- **Ignores:** case, accents, apostrophes, plurals and filler words.
- **Typos:** allows one in words of 5+ letters and two in 9+ letters.
- **Longer phrases:** accepts them ("a big orange peel"), but not if they mention another object ("fly’s eye" doesn’t count as a human eye).
- **"Warmer":** listed near-misses such as "insect" for a butterfly wing get a hint, with no penalty.

## Saving

- **In localStorage:** bests per mode, games played and the sound setting (`oddball.macro.v1`).
- **Games in progress:** saved after every action (`oddball.macro.run.v1`), including the furthest zoom reached and wrong guesses. A refresh resumes exactly where you were, so refreshing never wins points back.
- **Signed-in players:** finished games go into their stats.

## Licensing

Only CC0, public domain, CC BY and CC BY-SA photos are accepted, and the server checks this through the Commons API. The author and licence are stored with each photo, shown on every reveal, and listed on `/macro-micro/credits`. Under CC BY-SA, cropped versions (our zoom layers) are covered by the same licence, which the credit links to.

## Files

- `games/macro-micro/shared/`: `objects.js` (the database), `answers.js`, `scoring.js`
- `games/macro-micro/client/`: `App.jsx` (game), `Stage.jsx` (zoom), `Curate.jsx` (picker and credits), `styles.css`, `main.jsx`
- `macro-micro/index.html`
- `platform/server/macro.js` (routes, Commons download, licence checks, image layers)
- Migration 2 in `platform/server/migrations.js`, adding the `macro_curation` and `macro_images` tables
- `tests/macro-micro.test.mjs`

## Storage

About 1 MB per photo in Postgres, so all 67 is roughly 70 MB, well within Neon's free 0.5 GB.
