# Pratibimb: the fixed brief (owner, 2026-11-26). Build exactly this.

## Input: the capture we already take (no new recording)

| From | Extracted | Used for |
|---|---|---|
| Guided scan / photos (front, left, right, up, down, smile, "aah", brows) | 3D face shape (478 points); eye, nose, lip, jaw proportions | Sculpting the face |
| Same, plus video | 52 expression values per frame; blink, nod and mouth-opening habits | Their way of moving |
| Waist-up shot | Shoulder width, body proportions, sex | Building the body |
| Colour measurement | Skin tone, iris, lips, brows, hair colour; hair length and outline | Materials and hair |
| Voice (consent clip, speech) | Their voice | Voice clone |

**Never used: the photo pixels themselves.** No real face, background or clothes from the photos is put on
the model.

## Output: one thing, a fully built realistic 3D human (CG), waist up, facing the student

| Part | What it is |
|---|---|
| Face | Sculpted from their 3D points: same proportions |
| Skin | A built skin material in their tone, soft studio light |
| Eyes | Modelled eyeballs, their iris colour, highlights, blinks |
| Hair | Modelled in their style and colour |
| Body | Built to their proportions; arms, five-finger hands |
| Clothes | New, from a wardrobe (Indian and Western), switchable colours |
| Background | None (transparent): the person only |
| Movement | Lip sync from the voice (any language, by sounds); expressions; gestures (namaste, point, explain); listens and reacts |
| Voice | Their cloned voice |
| Brain | Converses (Guru) |
| Likeness | Recognisable by eye; face-recognition score reported (likely below 90%, since no photo pixels are used) |
| Build time | 3–4 minutes on a GPU |

Everything is made by our own code (`scripts/pratibimb/engine/`); research papers are read for ideas only.
Reference for the *kind* of output (not used): Epic MetaHuman, Reallusion Headshot.
