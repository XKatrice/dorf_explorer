# File and asset audit

Checked references from the app's HTML, CSS and JavaScript. Documentation and tests are intentionally retained even when they are not loaded by the website. No files were deleted.

## Unreferenced assets

These assets have no runtime references and can be removed without changing the current app. Retain any that you want as source artwork or for future features.

| Asset | Reason | Size |
| --- | --- | ---: |
| `assets/balloon.svg` | Superseded by `balloon-launch-site.png` | 520 bytes |
| `assets/hill.svg` | Superseded by `hill.png` | 373 bytes |
| `assets/3145ae24-0cd4-414e-bd4e-72b13f8b5940.png` | No references found | 368,681 bytes |
| `assets/lookout-special.png` | No references found | 52,390 bytes |
| `assets/mountain-tasks.png` | No references found | 64,756 bytes |
| `assets/new.png` | No references found; the former New action was removed | 673,035 bytes |
| `assets/water-tasks.png` | No references found | 47,701 bytes |
| `assets/windmill-special.png` | No references found | 70,930 bytes |

Total potential saving: approximately **1.22 MiB**.

## Other files

- Every JavaScript module is reachable from the HTML entry points; no orphaned JavaScript files were found.
- All four HTML pages are linked through navigation.
- `game_ranking.csv` is loaded by `js/rankings.js` and must be retained.
- `tests/` contains the automated checks; `features/` contains project documentation. These are not orphaned runtime files.
- `DorfExplorer.code-workspace` is an ignored IDE configuration; keep it if useful locally.

## Required additions for the commit

New files are not included by a tracked-files-only commit. Include the following alongside the modified files:

- `campaign-tracker.html`
- `assets/hill.png`, `assets/balloon-launch-site.png`
- `js/campaign-files.js`, `js/campaign-model.js`, `js/campaign-tracker.js`
- `js/card-navigation.js`, `js/data-store.js`, `js/flags.js`, `js/rankings.js`, `js/validation.js`
- The test files under `tests/` and documentation under `features/`

The two superseded, untracked SVG files do not need to be added. All locally referenced runtime files were checked for existence. This audit does not stage or commit files.
