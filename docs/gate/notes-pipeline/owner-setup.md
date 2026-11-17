# Owner setup: put the reference notes in a private repo (once)

The notes PDFs are other people's notes. The Nexora repo is public, so they
must never go there. A **private** GitHub repo is free and only you (and the
machines you allow) can read it.

## 1. Make the private repo (on github.com)
1. Open https://github.com/new
2. Name: `nexora-gate-notes`. Choose **Private**. Don't add a README.
3. Click **Create repository**.

## 2. Upload the notes (Terminal on your Mac)
Copy and paste these lines one block at a time. The first block finds the
folder; if it prints a different path, use that path below.

```bash
find ~/Desktop -maxdepth 4 -type d -iname "gate_notes" 2>/dev/null
```

```bash
NOTES=~/Desktop/nexora/GATE_NOTES          # change this if the line above printed another path
mkdir -p ~/nexora-gate-notes && cp "$NOTES"/*.pdf ~/nexora-gate-notes/
# digests (summaries made from the notes), if they exist on your Mac
[ -d ~/Desktop/nexora/content/gate-notes/_digest ] && cp -R ~/Desktop/nexora/content/gate-notes/_digest ~/nexora-gate-notes/digests
cd ~/nexora-gate-notes
# GitHub refuses files over 100 MB: split big PDFs into 90 MB parts (the originals on your Desktop are untouched)
for f in *.pdf; do if [ "$(stat -f%z "$f")" -gt 95000000 ]; then split -b 90m "$f" "$f.part-" && rm "$f"; fi; done
printf '#!/bin/sh\nfor p in *.pdf.part-aa; do [ -e "$p" ] || continue; f="${p%%.part-aa}"; [ -f "$f" ] || cat "$f".part-* > "$f"; done\n' > join.sh
chmod +x join.sh
ls -lh
```

```bash
cd ~/nexora-gate-notes
git init -b main
git add .
git commit -m "Reference notes (private)"
git remote add origin https://github.com/Gurudeep306/nexora-gate-notes.git
git push -u origin main
```

If the push asks you to sign in, use your GitHub account. A large upload can
take a while; leave the Terminal open until it finishes.

## 3. Let Mistral Vibe read it
The machine Vibe runs on must be able to read the private repo:
- In Hive: **Projects → Add repo → `nexora-gate-notes`** (this gives the worker
  access), or
- on that machine, make sure its GitHub login has access to private repos.

Then, in the Nexora checkout there:

```bash
git clone https://github.com/Gurudeep306/nexora-gate-notes.git GATE_NOTES
cd GATE_NOTES && ./join.sh && cd ..
mkdir -p content/gate-notes/_digest && cp -R GATE_NOTES/digests/* content/gate-notes/_digest/ 2>/dev/null || true
python3 scripts/gate-notes/inventory.py --notes GATE_NOTES
```

`GATE_NOTES/` and `content/gate-notes/_digest/` are ignored by git in Nexora,
so they can never be committed by accident.
