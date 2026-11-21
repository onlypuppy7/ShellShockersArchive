# 2019-2020 recovery

- Verified captured payloads: 298 / 304.
- Distinct decoded HTML/JS payloads: 227.
- Distinct game scripts: 71.
- Reconstructed folders: 136.
- Saved-file integrity failures: 0.

Folder version numbers come from HTML. JavaScript release versions and historical pairings are unverified; each file retains its own capture timestamp.

| HTML version | Folders |
| --- | ---: |
| 0.15.6 | 1 |
| 0.15.7 | 1 |
| 0.16.0 | 1 |
| 0.17.0 | 1 |
| 0.18.2 | 10 |
| 0.18.3 | 2 |
| 0.20.2 | 3 |
| 0.20.2a | 3 |
| 0.21.1 | 3 |
| 0.21.3 | 2 |
| 0.23.2 | 1 |
| 0.23.3a | 4 |
| 0.24.1 | 2 |
| 0.25.1 | 1 |
| 0.25.2 | 1 |
| 0.25.3 | 2 |
| 0.25.4 | 2 |
| 0.25.5 | 1 |
| 0.25.6 | 1 |
| 0.25.7 | 1 |
| 0.26.0 | 4 |
| 0.26.1 | 2 |
| 0.26.2 | 7 |
| 0.26.3 | 6 |
| 0.26.4 | 7 |
| 0.27.0 | 3 |
| 0.27.1 | 1 |
| 0.27.2 | 4 |
| 0.27.3 | 3 |
| 0.27.4 | 2 |
| 0.27.5 | 4 |
| 0.27.7 | 7 |
| 0.27.8 | 5 |
| 0.28.1 | 1 |
| 0.28.2 | 2 |
| 0.28.3 | 2 |
| 0.28.4 | 3 |
| 0.28.5 | 1 |
| 0.28.6 | 3 |
| 0.29 | 2 |
| 0.30 | 3 |
| 0.31 | 6 |
| 0.32 | 3 |
| 0.33 | 3 |
| 0.34 | 5 |
| 0.35 | 2 |
| 0.36 | 1 |
| unknown | 1 |

## Failed capture attempts

- 20191029031045 `https://shellshock.io/`: No verified cached payload
- 20191029235119 `https://shellshock.io/js/vue/vue.min.2.6.10.js`: No verified cached payload
- 20191029235119 `https://shellshock.io/src/shellshock.min.js?1571781519`: No verified cached payload
- 20191029235122 `https://shellshock.io/js/asc-ad-video/adblockDetector.js`: No verified cached payload
- 20191029235132 `https://shellshock.io/js/prebid/prebidcon.js`: No verified cached payload
- 20191029235139 `https://shellshock.io/js/asc-ad-video/asc.video.outsteam.min.js`: No verified cached payload

## Unrecovered referenced scripts

- `https://shellshock.io/js/prebid/prebidcon.js?1585677831`
- `https://shellshock.io/src/shellshock.js?1606247985`
- `https://shellshock.io/src/shellshock.min.js?1584476639`
- `https://shellshock.io/src/shellshock.min.js?1585782538`
- `https://shellshock.io/src/shellshock.min.js?1588792917`
- `https://shellshock.io/src/shellshock.min.js?1593812702`
- `https://shellshock.io/src/shellshock.min.js?1595540629`
- `https://shellshock.io/src/shellshock.min.js?1596240395`
- `https://shellshock.io/src/ss.088aec1c0dd5e8ae9f8bef5f64167065.js?1582584493`

## Version identification review

Two-component HTML declarations (0.29–0.36) are now recognized. See [version identification report](version_identification_report.md) for evidence and remaining non-game captures.
