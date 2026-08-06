#!/usr/bin/env python3
"""Compress gallery photos for Spidey Tracker / GitHub Pages.

Keeps images sharp enough for the in-app gallery while shrinking files so
Pages deploy does not time out (raw phone JPGs are often 10–13MB each).

Depends on Pillow:
  pip install pillow
  # or: conda activate spidey-tracker && pip install pillow
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow is required. Install with:  pip install pillow", file=sys.stderr)
    sys.exit(1)

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


def human(n: float) -> str:
    units = ("B", "KB", "MB", "GB")
    size = float(n)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.0f}{unit}" if unit == "B" else f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}GB"


def collect(root: Path) -> list[Path]:
    files: list[Path] = []
    for p in sorted(root.rglob("*")):
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES:
            files.append(p)
    return files


def compress_one(
    path: Path,
    *,
    max_edge: int,
    quality: int,
    min_bytes: int,
    dry_run: bool,
) -> tuple[int, int, bool]:
    """Returns (before, after, changed)."""
    before = path.stat().st_size
    if before < min_bytes:
        return before, before, False

    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        # Flatten alpha onto white for JPEG output when needed
        if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
            bg = Image.new("RGB", im.size, (255, 255, 255))
            rgba = im.convert("RGBA")
            bg.paste(rgba, mask=rgba.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")

        w, h = im.size
        scale = min(1.0, max_edge / max(w, h))
        if scale < 1.0:
            im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)

        out_path = path if path.suffix.lower() in {".jpg", ".jpeg"} else path.with_suffix(".jpg")

        if dry_run:
            # Estimate only: encode to measure size without writing
            from io import BytesIO

            buf = BytesIO()
            im.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
            after = buf.tell()
            return before, after, after < before

        tmp = out_path.with_suffix(out_path.suffix + ".tmp")
        im.save(tmp, format="JPEG", quality=quality, optimize=True, progressive=True)
        after = tmp.stat().st_size

        if after >= before and out_path == path:
            tmp.unlink(missing_ok=True)
            return before, before, False

        tmp.replace(out_path)
        if out_path != path and path.exists():
            path.unlink()
        return before, after, True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compress Spidey Tracker gallery images (size ↓, clarity kept)."
    )
    parser.add_argument(
        "root",
        nargs="?",
        default="public/galleries",
        help="Gallery root folder (default: public/galleries)",
    )
    parser.add_argument(
        "--max-edge",
        type=int,
        default=1600,
        help="Longest side in pixels (default: 1600 — sharp on retina, small files)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=85,
        help="JPEG quality 1–95 (default: 85; use 80–88 for a good balance)",
    )
    parser.add_argument(
        "--min-bytes",
        type=int,
        default=400_000,
        help="Skip files smaller than this (default: 400000)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show estimated savings without writing files",
    )
    args = parser.parse_args()

    if not (1 <= args.quality <= 95):
        print("--quality must be 1–95", file=sys.stderr)
        return 2

    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 2

    files = collect(root)
    if not files:
        print(f"No images under {root}")
        return 0

    total_before = 0
    total_after = 0
    changed_n = 0

    print(f"{'DRY RUN — ' if args.dry_run else ''}Compressing under {root}")
    print(f"max-edge={args.max_edge}  quality={args.quality}  min-bytes={args.min_bytes}")
    print()

    for path in files:
        before, after, changed = compress_one(
            path,
            max_edge=args.max_edge,
            quality=args.quality,
            min_bytes=args.min_bytes,
            dry_run=args.dry_run,
        )
        total_before += before
        total_after += after
        rel = path.relative_to(root)
        if changed:
            changed_n += 1
            print(f"  {rel}: {human(before)} → {human(after)}")
        else:
            print(f"  {rel}: skip ({human(before)})")

    print()
    print(
        f"Done. {changed_n}/{len(files)} changed. "
        f"Total {human(total_before)} → {human(total_after)}"
        + (" (estimated)" if args.dry_run else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
