# Brand assets

Approved direction: J&J monogram selected by the user on October 18, 2026.

Generated with the built-in image generation tool, using the approved logo as the edit reference. The full logo has a transparent background; the mark has a white background for legibility on browser tabs and dark navigation.

## Files

- `jahren-john-logo-v1.png`: full website logo, 1254 × 1254 PNG.
- `jahren-john-mark-v1.png`: compact monogram for navigation, favicons, home-screen icons, and receipts, 1254 × 1254 PNG.

## Prompts

### jahren-john-logo-v1.png

Edit the supplied approved logo; do not create a new design. Remove ONLY the white exterior background and excess blank margins, yielding genuine transparency. Preserve the exact two intertwined navy-blue and orange J shapes, central flame-shaped negative space, colors, subtle shading, proportions and typography. Keep the exact text "JAHREN & JOHN" and "LPG TRADING". Preserve the full stacked arrangement. Fit the existing design snugly on a transparent canvas with about 4% clear padding on all edges, no large unused margins. No new elements, no redesign, no extra words. Asset type: production website brand logo.

### jahren-john-mark-v1.png

Edit the supplied approved logo; do not create a new design. Extract ONLY the existing intertwined navy-blue and orange J monogram with its central white flame-shaped negative space. Remove all text below the mark, preserving the exact symbol shape, navy and orange colors, subtle shading, proportions and silhouette. Center this same monogram on a square pure white canvas. The symbol should occupy roughly 86% of the canvas height, with small even white margins. This is a browser favicon and website navigation icon, so it must be tightly framed and readable when scaled small. No text at all, no new elements, no new symbol design, no decorative border.

The transparent logo was subsequently refined with this prompt:

Edit target: first image, the transparent full logo. Second image: approved original reference. Repair the transparent website logo so it is clean and production-ready. Remove ALL stray orange/red speckles, rough pixel noise, and ragged edge artifacts around and inside the mark and lettering. Preserve the approved original monogram geometry, navy and orange palette, flame negative space, stacked layout, and exact wording "JAHREN & JOHN" / "LPG TRADING". Render edges as smooth, crisp, clean vector-like boundaries. Do not erode the letter edges or add new shapes. Genuinely transparent exterior background; interior negative spaces also clean. No stray pixels, no halos, no shadow, no additional text. Tight layout with modest even padding.

## Integration and verification

The login screen uses the full logo. Sidebar and header use the compact mark on white for contrast. The favicon and Apple touch icon use the same mark at a new asset URL to avoid the old favicon cache. Receipt previews, browser printing, and downloaded PNGs include a grayscale mark. Receipt export falls back to its existing text header if the image cannot load; printing waits for the image before sizing the paper.

Verified with a production build, TypeScript, three receipt branding checks, and a browser connected only to a local in-memory mock API. Login and navigation were checked at desktop and 390px mobile widths, without horizontal overflow; all logo images loaded. Browser receipt preview and the PNG download success notice were checked. The browser automation did not expose the downloaded file for separate visual inspection. No live API, database, backend code, or migration was used or changed.
