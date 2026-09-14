#!/usr/bin/env python3
"""Build the Scripts Pack from src/*.md into a single HTML file and a PDF.

    python3 pack/build.py

Outputs pack/dist/negotiation-room-scripts-pack.html and .pdf.

The PDF is the Gumroad deliverable. The HTML is the intermediate and is kept
because it is what you open to check a layout change without waiting on a
render.

Rendering uses the Chromium already on the box (Playwright's, at
PLAYWRIGHT_BROWSERS_PATH) rather than a Python PDF library, because the pack
is typography rather than data and a browser is the only thing that gets
widows, page breaks and web fonts right. No network is used.
"""
import glob
import os
import shutil
import subprocess
import sys

import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
DIST = os.path.join(HERE, "dist")
STEM = "negotiation-room-scripts-pack"

# Lifted from tool/index.html so the pack and the free tool look like one
# product. Print drops the dark-mode half: a PDF has no viewer preference.
CSS = """
:root{
  --green:#0f5a34; --green-deep:#0a3d24; --gold:#a9780a; --gold-bright:#c99a2e;
  --paper:#faf8f0; --ink:#182219; --muted:#586459; --line:#e4dfce;
  --serif:"Iowan Old Style",Palatino,Georgia,serif;
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
}
@page{ size:A4; margin:20mm 18mm 18mm; }
*{box-sizing:border-box}
body{margin:0;font-family:var(--sans);color:var(--ink);background:#fff;
     line-height:1.6;font-size:11.2pt;}
.wrap{max-width:170mm;margin:0 auto}

h1{font-family:var(--serif);color:var(--green-deep);font-size:23pt;
   margin:0 0 .1em;line-height:1.15;page-break-before:always;page-break-after:avoid}
h1:first-of-type{page-break-before:avoid}
h2{font-family:var(--serif);color:var(--green);font-size:15pt;
   margin:1.5em 0 .3em;page-break-after:avoid}
h3{font-size:11.6pt;margin:1.5em 0 .35em;color:var(--green-deep);
   page-break-after:avoid}
p{margin:.55em 0;orphans:3;widows:3}

/* A script. The whole point of the document, so it gets the gold rule and
   must never split across a page. */
blockquote{margin:.7em 0;padding:.7em 1em;background:var(--paper);
  border-left:3px solid var(--gold);border-radius:0 7px 7px 0;
  font-size:11.4pt;page-break-inside:avoid}
blockquote p{margin:.3em 0}
blockquote strong{color:var(--green-deep)}

table{border-collapse:collapse;width:100%;margin:1em 0;font-size:10.2pt;
      page-break-inside:avoid}
th,td{border:1px solid var(--line);padding:7px 9px;text-align:left;
      vertical-align:top}
th{background:var(--paper);font-family:var(--serif);color:var(--green-deep)}

ul{padding-left:1.1em}
li{margin:.3em 0}
hr{border:none;border-top:1px solid var(--line);margin:1.6em 0}
strong{color:var(--green-deep)}
em{color:var(--muted)}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}

/* Cover */
/* The cover owns page one by itself. Without the break the intro flows up
   onto it and the first page reads as a heading rather than a cover. */
.cover{text-align:center;padding:52mm 0 0;page-break-after:always}
.cover .band{height:7px;width:62mm;margin:0 auto 14mm;
  background:linear-gradient(90deg,var(--green),var(--gold-bright),var(--green))}
.cover h1{font-size:34pt;margin:0;page-break-before:avoid}
.cover .sub{font-family:var(--serif);font-size:17pt;color:var(--gold);
  margin:.25em 0 1.4em}
.cover .claim{font-size:12.5pt;font-weight:600;margin:0 0 .9em}
.cover .by{color:var(--muted);font-size:10.5pt}
.cover .rule{margin:16mm auto 0;width:38mm;border-top:1px solid var(--line)}
"""

COVER = """
<div class="cover">
  <div class="band"></div>
  <h1>The Negotiation Room</h1>
  <p class="sub">Scripts Pack</p>
  <p class="claim">Forty-one scripts for the moments you freeze.</p>
  <p class="by">Mick Cairn<br>The professionals you cannot afford, made free and plain.</p>
  <div class="rule"></div>
</div>
"""


def build_html():
    parts = sorted(glob.glob(os.path.join(SRC, "*.md")))
    if not parts:
        sys.exit(f"no source files in {SRC}")
    md = markdown.Markdown(extensions=["tables", "sane_lists"])
    # The first file opens with the same title as the cover, so drop its H1
    # and let the cover carry it rather than printing the name twice.
    bodies = []
    for i, path in enumerate(parts):
        text = open(path, encoding="utf-8").read()
        if i == 0:
            lines = text.split("\n")
            text = "\n".join(l for l in lines if not l.startswith("# The Negotiation Room"))
            text = text.replace("## Scripts Pack\n", "", 1)
            text = text.replace("**Forty-one scripts for the moments you freeze.**\n", "", 1)
            text = text.replace(
                "Mick Cairn · The professionals you cannot afford, made free and plain.\n", "", 1
            )
        md.reset()
        bodies.append(md.convert(text))

    html = (
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
        "<title>The Negotiation Room, Scripts Pack</title>"
        f"<style>{CSS}</style></head><body><div class=\"wrap\">"
        + COVER
        + "\n".join(bodies)
        + "</div></body></html>"
    )
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, f"{STEM}.html")
    open(out, "w", encoding="utf-8").write(html)
    return out


def find_chromium():
    for cand in (
        os.path.join(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers"), "chromium"),
        shutil.which("chromium"),
        shutil.which("chromium-browser"),
        shutil.which("google-chrome"),
    ):
        if cand and os.path.exists(cand):
            if os.path.isdir(cand):
                hits = glob.glob(os.path.join(cand, "**", "chrome"), recursive=True)
                hits += glob.glob(os.path.join(cand, "**", "headless_shell"), recursive=True)
                if hits:
                    return hits[0]
                continue
            return cand
    return None


def build_pdf(html_path):
    exe = find_chromium()
    if not exe:
        print("no chromium found; HTML built, PDF skipped", file=sys.stderr)
        return None
    pdf = os.path.join(DIST, f"{STEM}.pdf")
    subprocess.run(
        [exe, "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
         f"--print-to-pdf={pdf}", f"file://{html_path}"],
        check=True, capture_output=True, timeout=180,
    )
    return pdf


if __name__ == "__main__":
    h = build_html()
    print(f"html: {h}  ({os.path.getsize(h):,} bytes)")
    p = build_pdf(h)
    if p:
        print(f"pdf:  {p}  ({os.path.getsize(p):,} bytes)")
