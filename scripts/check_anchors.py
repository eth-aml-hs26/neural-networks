#!/usr/bin/env python3
"""Check that every anchor of src/data/anchors.ts opens its deck where it should.

An anchor names a deck, a page of its projected PDF, a page of its handout, for a part that
Carlos wrote on in class a page of the annotated PDF, and a text that the part it opens shows.
The check passes when, in each of those PDFs of public/slides/, the anchored page shows that
text and the page before it does not, so the link lands on the first page of the part. Run it
after every refresh of the decks (npm run anchors). It needs pypdf.
"""
import logging
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("check_anchors: needs pypdf (python3 -m pip install pypdf)")

ROOT = Path(__file__).resolve().parent.parent
ANCHOR = re.compile(
    r"""^\s*'(?P<deck>[\w-]+)\#(?P<part>[^']+)':\s*\{\s*slides:\s*(?P<slides>\d+),\s*"""
    r"""handout:\s*(?P<handout>\d+),\s*(?:annotated:\s*(?P<annotated>\d+),\s*)?"""
    r"""expect:\s*'(?P<expect>[^']+)'\s*\},?\s*$"""
)
KINDS = ("slides", "handout", "annotated")


def squeeze(text):
    """Text with all whitespace removed: pypdf joins and splits words unpredictably."""
    return re.sub(r"\s+", "", text or "")


def main():
    # The exports from Carlos's iPad carry small slips in their cross-references, which pypdf
    # mends and reports on every read.
    logging.getLogger("pypdf").setLevel(logging.ERROR)
    readers = {}
    failures = checked = 0
    lines = (ROOT / "src/data/anchors.ts").read_text(encoding="utf-8").splitlines()
    anchors = [m for m in map(ANCHOR.match, lines) if m]
    if not anchors:
        sys.exit("check_anchors: no anchor found in src/data/anchors.ts; is it one per line?")
    for m in anchors:
        want = squeeze(m["expect"])
        for kind in KINDS:
            if m[kind] is None:
                continue
            checked += 1
            pdf = ROOT / "public/slides" / f"{m['deck']}-{kind}.pdf"
            n = int(m[kind])
            if not pdf.exists():
                failures += 1
                print(f"BAD {m['deck']}#{m['part']} {kind} p. {n}: public/slides has no {pdf.name}")
                continue
            if pdf not in readers:
                readers[pdf] = PdfReader(pdf)
            pages = readers[pdf].pages
            here = n <= len(pages) and want in squeeze(pages[n - 1].extract_text())
            before = n >= 2 and n - 1 <= len(pages) and want in squeeze(pages[n - 2].extract_text())
            ok = here and not before
            failures += not ok
            why = "" if ok else ("  <- the text starts earlier" if here else "  <- the text is not on this page")
            print(f"{'ok ' if ok else 'BAD'} {m['deck']}#{m['part']} {kind} p. {n}: {m['expect']}{why}")
    if failures:
        sys.exit(f"check_anchors: {failures} page(s) moved; fix them in src/data/anchors.ts")
    print(f"check_anchors: all {checked} pages of {len(anchors)} anchors are right")


if __name__ == "__main__":
    main()
