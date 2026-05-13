from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRS = {
    "2025": ROOT / "public" / "images" / "2025_team",
    "2026": ROOT / "public" / "images" / "2026_team",
}
OUTPUT_ROOT = ROOT / "public" / "images" / "team-badges"
OUTPUT_SIZE = 256
WHITE_THRESHOLD = 245
PADDING_RATIO = 0.12


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD


def transparentize_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    background = Image.new("L", (width, height), 0)
    bg = background.load()
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        if bg[x, y] == 0 and is_background(pixels[x, y]):
            bg[x, y] = 255
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and bg[nx, ny] == 0 and is_background(pixels[nx, ny]):
                bg[nx, ny] = 255
                queue.append((nx, ny))

    rgba.putalpha(Image.eval(background, lambda alpha: 0 if alpha == 255 else 255))
    return rgba


def normalize_badge(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))

    cropped = image.crop(bbox)
    inner_size = int(OUTPUT_SIZE * (1 - PADDING_RATIO * 2))
    cropped.thumbnail((inner_size, inner_size), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    x = (OUTPUT_SIZE - cropped.width) // 2
    y = (OUTPUT_SIZE - cropped.height) // 2
    canvas.paste(cropped, (x, y), cropped)
    return canvas


def build_output_name(source_path: Path) -> str:
    slug = source_path.stem.split("_", 1)[-1]
    return f"{slug}.webp"


def process_badges() -> None:
    for season, source_dir in SOURCE_DIRS.items():
        output_dir = OUTPUT_ROOT / season
        output_dir.mkdir(parents=True, exist_ok=True)
        for source_path in sorted(source_dir.iterdir()):
            if source_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue

            with Image.open(source_path) as image:
                processed = normalize_badge(transparentize_background(image))

            output_path = output_dir / build_output_name(source_path)
            processed.save(output_path, "WEBP", quality=88, method=6)
            print(f"{season}: {source_path.name} -> {output_path.relative_to(ROOT)}")


if __name__ == "__main__":
    process_badges()
