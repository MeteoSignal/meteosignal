"""Generate the MeteoSignal platform icon pack from the validated official artwork.

The color masters are never redrawn or recolored. Every color export is a
high-quality resize of the official 512 px standard or maskable source.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
LOGO_ROOT = ROOT / "assets" / "logo"
BRAND_ROOT = ROOT / "assets" / "brand"
PLATFORM_ROOT = ROOT / "assets" / "platform"
SIZES = (16, 24, 32, 48, 64, 128, 192, 256, 512)
WINDOWS_ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)


def resize(source: Image.Image, size: int) -> Image.Image:
    return source.resize((size, size), Image.Resampling.LANCZOS)


def save_png(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG", optimize=True, compress_level=9)


def make_monochrome(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    red, green, blue, source_alpha = rgba.split()
    luminance = Image.merge("RGB", (red, green, blue)).convert("L")
    alpha = luminance.point(lambda value: max(0, min(255, round((value - 22) * 1.55))))
    alpha = Image.composite(alpha, Image.new("L", rgba.size, 0), source_alpha)
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    result = Image.new("RGBA", rgba.size, (255, 255, 255, 0))
    result.putalpha(alpha)
    return result


def make_tile(source: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), "#03101f")
    inset = max(2, round(size * 0.08))
    icon = resize(source.convert("RGB"), size - inset * 2)
    canvas.paste(icon, (inset, inset))
    return canvas


def main() -> None:
    standard_path = LOGO_ROOT / "icon-512.png"
    maskable_path = LOGO_ROOT / "icon-maskable-512.png"
    complete_logo_path = LOGO_ROOT / "logo-meteosignal-complet.png"

    with Image.open(standard_path) as standard_source, Image.open(maskable_path) as maskable_source:
        standard = standard_source.convert("RGB")
        maskable = maskable_source.convert("RGBA")

        for variant, source in (("standard", standard), ("maskable", maskable)):
            for size in SIZES:
                save_png(
                    resize(source, size),
                    BRAND_ROOT / "exports" / "png" / variant / f"meteosignal-{variant}-{size}.png",
                )

        save_png(resize(standard, 16), LOGO_ROOT / "favicon-16.png")
        save_png(resize(standard, 32), LOGO_ROOT / "favicon-32.png")
        save_png(resize(standard, 48), LOGO_ROOT / "favicon-48.png")
        save_png(resize(standard, 180), LOGO_ROOT / "apple-touch-icon-180.png")
        save_png(resize(standard, 192), LOGO_ROOT / "icon-192.png")
        save_png(resize(standard, 512), LOGO_ROOT / "icon-512.png")
        save_png(resize(maskable, 192), LOGO_ROOT / "icon-maskable-192.png")
        save_png(resize(maskable, 512), LOGO_ROOT / "icon-maskable-512.png")

        favicon_path = LOGO_ROOT / "favicon.ico"
        standard.save(
            favicon_path,
            "ICO",
            sizes=[(size, size) for size in WINDOWS_ICO_SIZES],
            bitmap_format="png",
        )

        windows_root = PLATFORM_ROOT / "windows"
        windows_root.mkdir(parents=True, exist_ok=True)
        standard.save(
            windows_root / "meteosignal.ico",
            "ICO",
            sizes=[(size, size) for size in WINDOWS_ICO_SIZES],
            bitmap_format="png",
        )
        save_png(resize(standard, 512), windows_root / "meteosignal-512.png")
        for size in (70, 150, 310):
            save_png(make_tile(standard, size), windows_root / f"tile-{size}.png")

        for size in SIZES:
            save_png(
                resize(standard, size),
                PLATFORM_ROOT / "linux" / "hicolor" / f"{size}x{size}" / "apps" / "meteosignal.png",
            )

        save_png(
            make_monochrome(maskable),
            BRAND_ROOT / "exports" / "monochrome" / "meteosignal-symbol-white-512.png",
        )

    with Image.open(complete_logo_path) as complete_source:
        complete = complete_source.convert("RGB")
        web_width = 561
        web_height = round(complete.height * web_width / complete.width)
        optimized = complete.resize((web_width, web_height), Image.Resampling.LANCZOS)
        optimized.save(
            LOGO_ROOT / "logo-meteosignal-complet.webp",
            "WEBP",
            quality=88,
            method=6,
        )


if __name__ == "__main__":
    main()
