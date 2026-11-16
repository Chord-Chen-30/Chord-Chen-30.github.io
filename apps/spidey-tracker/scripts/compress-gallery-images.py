#!/usr/bin/env python3
"""Compress gallery photos for Spidey Tracker / GitHub Pages.

Keeps images sharp enough for the in-app gallery while shrinking files so
Pages deploy does not time out (raw phone JPGs are often 10–13MB each).

Also converts .heic / .heif (and mislabeled HEIC saved as .JPG) → JPEG via
macOS `sips` when Pillow cannot open them. Browsers do not show HEIC reliably.

Depends on Pillow:
  pip install pillow
  # or: conda activate spidey-tracker && pip install pillow
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageOps, UnidentifiedImageError
except ImportError:
    Image = ImageOps = UnidentifiedImageError = None  # type: ignore[assignment]

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".heif"}
MANIFEST_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


def natural_key(value: str) -> list[object]:
    """Sort 2.jpg before 10.jpg, matching the Vite gallery plugin."""
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", value)]


def gallery_manifest(root: Path) -> dict[str, list[str]]:
    manifest: dict[str, list[str]] = {}
    for folder in sorted((p for p in root.iterdir() if p.is_dir() and not p.name.startswith("."))):
        files = sorted(
            (
                p.name
                for p in folder.iterdir()
                if p.is_file()
                and not p.name.startswith(".")
                and p.suffix.lower() in MANIFEST_IMAGE_SUFFIXES
            ),
            key=natural_key,
        )
        if files:
            manifest[folder.name] = [f"galleries/{folder.name}/{name}" for name in files]
    return manifest


def write_gallery_manifest(root: Path, destination: Path) -> None:
    manifest = gallery_manifest(root)
    content = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.read_text(encoding="utf-8") == content:
        print(f"Gallery manifest is current: {destination}")
        return
    destination.write_text(content, encoding="utf-8")
    photo_count = sum(len(files) for files in manifest.values())
    print(f"Updated gallery manifest: {destination} ({len(manifest)} places, {photo_count} photos)")


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
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES and not p.name.startswith("."):
            files.append(p)
    return files


def jpeg_out_path(path: Path) -> Path:
    """DSCF.jpg → same; shot.HEIC → shot.jpg; shot.HEIC.JPG → shot.jpg."""
    stem = re.sub(r"\.(heic|heif)$", "", path.stem, flags=re.IGNORECASE)
    return path.with_name(f"{stem}.jpg")


def looks_like_heic_name(path: Path) -> bool:
    lower = path.name.lower()
    return lower.endswith(".heic") or lower.endswith(".heif") or ".heic." in lower or ".heif." in lower


def open_via_sips(path: Path) -> Image.Image:
    if not shutil.which("sips"):
        raise RuntimeError("macOS sips not available to convert HEIC")
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "converted.jpg"
        proc = subprocess.run(
            ["sips", "-s", "format", "jpeg", str(path), "--out", str(out)],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not out.is_file():
            err = (proc.stderr or proc.stdout or "sips failed").strip()
            raise RuntimeError(err)
        with Image.open(out) as im:
            im = ImageOps.exif_transpose(im)
            im.load()
            return im.copy()


def open_rgb(path: Path) -> Image.Image:
    try:
        with Image.open(path) as im:
            im.load()
            im = ImageOps.exif_transpose(im)
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                bg = Image.new("RGB", im.size, (255, 255, 255))
                rgba = im.convert("RGBA")
                bg.paste(rgba, mask=rgba.split()[-1])
                return bg
            return im.convert("RGB")
    except UnidentifiedImageError:
        # Fake .JPG that is still HEIC, or other formats Pillow cannot decode
        return open_via_sips(path)
    except OSError:
        if looks_like_heic_name(path) or path.suffix.lower() in {".heic", ".heif"}:
            return open_via_sips(path)
        raise


def compress_one(
    path: Path,
    *,
    max_edge: int,
    quality: int,
    min_bytes: int,
    dry_run: bool,
) -> tuple[int, int, str]:
    """Returns (before, after, status) where status is changed|skip|error message."""
    before = path.stat().st_size
    force_convert = looks_like_heic_name(path) or path.suffix.lower() in {".heic", ".heif"}
    if before < min_bytes and not force_convert:
        return before, before, "skip"

    try:
        im = open_rgb(path)
    except Exception as e:
        return before, before, f"error: {e}"

    w, h = im.size
    scale = min(1.0, max_edge / max(w, h))
    resized = scale < 1.0
    if resized:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)

    out_path = jpeg_out_path(path)

    if dry_run:
        from io import BytesIO

        buf = BytesIO()
        im.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
        after = buf.tell()
        worth_writing = force_convert or resized or after < before * 0.98
        return before, after, "changed" if worth_writing else "skip"

    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    im.save(tmp, format="JPEG", quality=quality, optimize=True, progressive=True)
    after = tmp.stat().st_size

    # Re-encoding an already optimized JPEG can shave a few bytes every run.
    # Require meaningful savings unless conversion or resizing is necessary,
    # so `galleries:update` stays idempotent and does not churn photo files.
    worth_writing = force_convert or resized or after < before * 0.98
    if not worth_writing and out_path == path:
        tmp.unlink(missing_ok=True)
        return before, before, "skip"

    tmp.replace(out_path)
    # On macOS, `IMG.JPG` and `IMG.jpg` can refer to the same file. Compare
    # file identities after replacing the temporary output so we do not delete
    # the newly compressed file merely because its extension casing changed.
    if path.exists() and out_path.exists() and not path.samefile(out_path):
        path.unlink()
    return before, after, "changed"


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
        help="Skip files smaller than this (default: 400000); HEIC always converted",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show estimated savings without writing files",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="Write the browser gallery manifest after processing images",
    )
    parser.add_argument(
        "--manifest-only",
        action="store_true",
        help="Only refresh the gallery manifest (does not require Pillow)",
    )
    args = parser.parse_args()

    if not (1 <= args.quality <= 95):
        print("--quality must be 1–95", file=sys.stderr)
        return 2

    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 2

    manifest_path = args.manifest.expanduser().resolve() if args.manifest else None
    if args.manifest_only:
        if not manifest_path:
            print("--manifest-only requires --manifest", file=sys.stderr)
            return 2
        write_gallery_manifest(root, manifest_path)
        return 0

    if Image is None:
        print("Pillow is required. Install with:  python3 -m pip install pillow", file=sys.stderr)
        return 2

    files = collect(root)
    if not files:
        print(f"No images under {root}")
        return 0

    total_before = 0
    total_after = 0
    changed_n = 0
    error_n = 0

    print(f"{'DRY RUN — ' if args.dry_run else ''}Compressing under {root}")
    print(f"max-edge={args.max_edge}  quality={args.quality}  min-bytes={args.min_bytes}")
    print()

    for path in files:
        before, after, status = compress_one(
            path,
            max_edge=args.max_edge,
            quality=args.quality,
            min_bytes=args.min_bytes,
            dry_run=args.dry_run,
        )
        total_before += before
        total_after += after
        rel = path.relative_to(root)
        if status == "changed":
            changed_n += 1
            print(f"  {rel}: {human(before)} → {human(after)}")
        elif status == "skip":
            print(f"  {rel}: skip ({human(before)})")
        else:
            error_n += 1
            print(f"  {rel}: {status}", file=sys.stderr)

    print()
    print(
        f"Done. {changed_n}/{len(files)} changed"
        + (f", {error_n} errors" if error_n else "")
        + f". Total {human(total_before)} → {human(total_after)}"
        + (" (estimated)" if args.dry_run else "")
    )
    if manifest_path and not args.dry_run and not error_n:
        write_gallery_manifest(root, manifest_path)
    return 1 if error_n else 0


if __name__ == "__main__":
    raise SystemExit(main())
