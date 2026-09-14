# Density and theme — captured states

Headless-Chromium captures of `/overview` (the console's first screen) across
the full preference matrix introduced by the density + system-theme work.
Captured with Playwright at 1440x900 against a live `next dev` on port 4200.

## Matrix

Eight page captures — every combination of the two persisted operator
preferences and both locales:

| File                             | Locale   | Theme | Density     | `html` root font-size |
| -------------------------------- | -------- | ----- | ----------- | --------------------- |
| `after-en-dark-comfortable.png`  | en (LTR) | dark  | comfortable | 16px                  |
| `after-en-dark-compact.png`      | en (LTR) | dark  | compact     | 14px                  |
| `after-en-light-comfortable.png` | en (LTR) | light | comfortable | 16px                  |
| `after-en-light-compact.png`     | en (LTR) | light | compact     | 14px                  |
| `after-ar-dark-comfortable.png`  | ar (RTL) | dark  | comfortable | 16px                  |
| `after-ar-dark-compact.png`      | ar (RTL) | dark  | compact     | 14px                  |
| `after-ar-light-comfortable.png` | ar (RTL) | light | comfortable | 16px                  |
| `after-ar-light-compact.png`     | ar (RTL) | light | compact     | 14px                  |

Plus three captures of the controls themselves:

| File                                       | What it shows                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `after-en-dark-compact-density-menu.png`   | The topbar density menu open, Compact checked                                                     |
| `after-ar-dark-compact-density-menu.png`   | The same menu in Arabic/RTL — `كثافة الواجهة` / `مريحة` / `مضغوطة`, opening from the correct edge |
| `after-en-dark-comfortable-theme-menu.png` | The topbar theme menu open, System / Light / Dark                                                 |

`after-measurements.json` holds the per-state DOM measurements taken at the
same moment as each capture: resolved `data-density`, theme class,
`color-scheme`, `dir`, root font size, and the smallest interactive target
found in each region of the page.

## How to read these

- **`after-en-dark-compact.png` is the closest thing to a "before".** The
  console previously forced dark (`enableSystem={false}`, `defaultTheme="dark"`,
  plus a literal `dark` class on `<html>`) at a fixed `14px` root — which is
  exactly what the dark + compact column reproduces. The visible differences
  from the true previous build are the two extra topbar icon buttons (density
  and the theme menu that replaced the old two-state toggle).
- **A true side-by-side "before" build was NOT captured.** Rendering the
  pre-change commit needs a separate build directory, and `next/font/google`
  in a cold build directory times out fetching `fonts.gstatic.com` from this
  machine, so that server never came up. See the task report.
- **The data regions are skeletons, not empty states.** These were captured
  while Keycloak was unreachable (the host's Docker daemon was stopped for a
  data-root migration), so the session used for the capture carries no valid
  upstream access token and every `/api/bff` query fails. The page _chrome_ —
  sidebar, topbar, cards, type scale, palette, spacing — is real; the numbers
  inside the cards are not.
