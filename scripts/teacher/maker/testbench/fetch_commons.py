"""Fetch a test bench of openly licensed portrait photos from Wikimedia Commons.

  python3 scripts/teacher/maker/testbench/fetch_commons.py <out_dir> [--per 6]

Only files whose licence is public domain, CC0, CC BY or CC BY-SA are kept; each one's licence, author
and source page go into <out_dir>/manifest.json. The photos are for testing the Teacher Maker on many
kinds of faces (men, women, ages, skin tones, glasses, beards); they are never committed or published.
"""
import argparse
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
CATS = [
    "Portrait photographs of women", "Portrait photographs of men", "Portrait photographs of old women",
    "Portrait photographs of old men", "Selfies", "Men with beards", "People with eyeglasses",
    "Portrait photographs of people of India", "Portrait photographs of African people", "Portrait photographs of Asian people",
]
OK = re.compile(r"^(public domain|pd|cc0|cc by(-sa)?( \d\.\d)?)", re.I)
UA = {"User-Agent": "NexoraGuru-TeacherMaker-testbench/1.0"}


def fetch(url, tries=6):
    """GET with polite backoff: Commons answers 429 when asked too fast."""
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == tries - 1:
                raise
            time.sleep(5 * (k + 1))


def api(**params):
    params.update(format="json", formatversion=2)
    return json.loads(fetch(API + "?" + urllib.parse.urlencode(params)))


ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--per", type=int, default=6)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
manifest = []
for cat in CATS:
    got = 0
    r = api(action="query", generator="categorymembers", gcmtitle="Category:" + cat, gcmtype="file", gcmlimit=60,
            prop="imageinfo", iiprop="url|extmetadata|size|mime", iiurlwidth=900)
    for page in (r.get("query", {}) or {}).get("pages", []):
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        if info.get("mime") not in ("image/jpeg", "image/png") or not OK.match(lic.strip()):
            continue
        if info.get("width", 0) < 500:
            continue
        name = re.sub(r"[^A-Za-z0-9._-]", "_", page["title"].split(":", 1)[1])[:80]
        path = os.path.join(a.out, name)
        try:
            open(path, "wb").write(fetch(info["thumburl"]))
        except Exception as e:
            print("skip", name, e)
            continue
        artist = re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()
        manifest.append({"file": name, "category": cat, "licence": lic, "author": artist, "source": info.get("descriptionurl")})
        got += 1
        time.sleep(2)
        if got >= a.per:
            break
    print("FETCH", cat, got)
json.dump(manifest, open(os.path.join(a.out, "manifest.json"), "w"), indent=1)
print("FETCH total", len(manifest))
