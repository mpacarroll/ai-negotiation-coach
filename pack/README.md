# The Scripts Pack

The paid companion to the free Negotiation Room tool. **$7, 20 pages, 41 scripts.**

Built 2026-09-14. Until this existed, `hq`'s revenue board carried the row with a standing
correction on it: *"the $7 pack does not exist yet, Gumroad doesn't unblock it, it must be
authored first."* It is authored now. What remains is a storefront.

## Layout

```
pack/
  src/*.md      the content, in reading order by filename
  build.py      src -> dist, markdown then Chromium for the PDF
  dist/         build output, committed so the sellable file is in git
  LISTING.md    final Gumroad copy, ready to paste
```

## Building

```bash
python3 pack/build.py
```

Needs `markdown` (`pip install markdown`) and a Chromium. It finds Playwright's at
`PLAYWRIGHT_BROWSERS_PATH` and falls back to anything on `PATH`. No network.

Chromium rather than a Python PDF library because the pack is typography, not data, and a
browser is the only thing that handles page breaks, widows and the serif stack correctly. If no
Chromium is found the HTML still builds and the script says the PDF was skipped rather than
failing silently.

## Editing

Edit `src/`, never `dist/`. Filenames set the order, so keep the numeric prefixes.

Two rules the CSS enforces and the content assumes:

- **A script never splits across a page.** Blockquotes are `page-break-inside: avoid`. If you
  write one longer than about fifteen lines it will push a whole page, so keep them short, which
  they should be anyway.
- **Every `h1` starts a new page.** So an `h1` is a section, not a heading you reach for because
  something looks important.

The script numbers are continuous across files and referenced by number in the text and in
`LISTING.md`. **Renumbering means updating those references**, so prefer appending within a
section to inserting.

## Why the count is in the title

"41 scripts" is on the cover, in the product name, and in the listing. It is also checkable:
14 salary, 7 rent, 6 bills, 9 hard moments, 5 written. If you add one, the number changes in
four places.

## Status

- [x] Content written
- [x] Build reproducible
- [x] PDF renders, 20 pages
- [x] Listing copy final
- [ ] **Gumroad account live** (his, ~20 min, blocks this and three other products)
- [ ] Listed
- [ ] Free tool linked to it, see the last section of `LISTING.md`

Not linked from `tool/index.html` yet, deliberately. A dead link on the only live surface in this
venture is worse than no link.
