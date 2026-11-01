#!/usr/bin/env python3
"""Draws the PWA icons (Midnight background, blue ring, orange dot) with only the standard library.
Run from manar-web: python3 scripts/make-pwa-icons.py. Colours are the Midnight palette
(docs/design/DESIGN-SYSTEM.md section 2); icons are bitmaps, so they cannot use CSS tokens."""
import math, struct, zlib

MIDNIGHT = (0x02, 0x07, 0x0A)
BLUE = (0x02, 0x97, 0xDE)
ORANGE = (0xFC, 0x73, 0x4D)


def cover(d, edge):
    """Anti-aliased coverage from a signed distance (positive inside)."""
    return max(0.0, min(1.0, d + 0.5)) if edge else 0.0


def mix(base, color, a):
    return tuple(round(b * (1 - a) + c * a) for b, c in zip(base, color))


def render(size, scale):
    """scale < 1 shrinks the glyph (maskable icons keep it inside the central safe zone)."""
    c = size / 2
    ring_r = size * 0.30 * scale
    ring_w = size * 0.075 * scale
    dot_r = size * 0.07 * scale
    ang = -math.pi / 4
    dx, dy = c + ring_r * math.cos(ang), c + ring_r * math.sin(ang)
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            d = math.hypot(px - c, py - c)
            ring = cover(ring_w / 2 - abs(d - ring_r), True)
            dot = cover(dot_r - math.hypot(px - dx, py - dy), True)
            col = mix(MIDNIGHT, BLUE, ring)
            col = mix(col, ORANGE, dot)
            row += bytes(col)
        rows.append(bytes(row))
    return rows


def png(path, size, scale):
    raw = b"".join(render(size, scale))

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(data)


png("public/icons/icon-192.png", 192, 1.0)
png("public/icons/icon-512.png", 512, 1.0)
png("public/icons/icon-maskable-512.png", 512, 0.78)
png("public/icons/apple-touch-icon.png", 180, 0.9)
