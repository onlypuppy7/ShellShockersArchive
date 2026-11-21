# Download receipt, 2021–2026

Verified: **11,181/11,198** payload groups. Unresolved: **17**.
New downloads: 11,018, 8.38 GB decoded. Reused: 163.
Every selected group has a terminal result. The full integrity audit passed for all recovered payloads.

| Year | Verified | Target | Verified % | Gaps |
|---|---:|---:|---:|---:|
| 2021 | 2,258 | 2,258 | 100.00% | 0 |
| 2022 | 2,279 | 2,287 | 99.65% | 8 |
| 2023 | 4,525 | 4,526 | 99.98% | 1 |
| 2024 | 1,598 | 1,605 | 99.56% | 7 |
| 2025 | 1,040 | 1,041 | 99.90% | 1 |
| 2026 | 496 | 496 | 100.00% | 0 |

2026 runs through 12 November. Year totals overlap where identical payloads were captured in several years.

External resources and both Twitch avatar paths are excluded. The original unfiltered inventory is retained.
Decoded files are in `_recovery/bodies/`; encoded-byte proofs, source URLs, cache-busting query strings, requested captures, and actual replay URLs remain in metadata.
**Assembly is complete and audited.** See [the assembly report](assembly_report_2021-2026.md) for dated folders, coverage and export checks. Existing 2017–2020 incremental folders remain unchanged.

## Remaining capture gaps

The remaining groups are HTML captures and Twitch stream JSON snapshots. No unverified replay has been substituted.
Normal replays either select another payload, redirect to another date, or return HTTP 404. The backing files identified through replay headers are marked private in Archive.org metadata; for redirected replays these identify the returned capture, not necessarily the missing record.

| Requested capture (UTC) | Original URL | Reason | Digest |
|---|---|---|---|
| 2022-01-31 18:50:30 UTC | https://shellshock.io/twitch | Replay redirects to a different capture | `G6MWSQFGE35CYVJ3O7UTJWFCWE4LYPQD` |
| 2022-03-28 10:40:40 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `XV47U26GZD5HOWNYLAC4UCZFWVGKFG2B` |
| 2022-07-09 00:28:46 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `SYVFUSLRUKWPPKMFDSTIXVYBE75KEBGH` |
| 2022-10-01 23:09:37 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `UNIU6W263RYYQMCU5XKKK26PR3WOKULX` |
| 2022-11-28 01:11:33 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `KSLLEQ6XMN22XZRXEFCBAG2DI2E3EIOY` |
| 2022-11-28 01:11:33 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `KZ52HUKCEGESVZIKDBW4BMJPSMNOUYXT` |
| 2022-11-28 01:11:33 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `LSPGTCGS6SBU3ZM5GYFUQC5EL6GWT756` |
| 2022-11-28 01:11:33 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `QHOQSH4K7WEVVKXO5NLL4WWFZS6QCLZM` |
| 2023-03-24 17:47:04 UTC | https://shellshock.io/ | Replay returns another indexed digest at the same URL and timestamp | `EHDYZLSXBLOFA5H3MOM7RSA5F7A5UTBS` |
| 2024-11-10 19:05:57 UTC | https://shellshock.io/ | Replay redirects to a different capture | `6Y4ZEON74KPS62GCWUO67CHYH5QRDMDX` |
| 2024-11-16 21:57:56 UTC | https://shellshock.io/data/twitchStreams.json?1731794276475 | Public replay returns HTTP 404 | `ET6LIS5YBIXAWKSHUULB7QA22LRSZX2X` |
| 2024-11-19 02:20:07 UTC | https://shellshock.io/ | Replay redirects to a different capture | `RKP2ZXJJWDRCCQBDEVFGRHMFFAU2IC5M` |
| 2024-11-22 03:31:36 UTC | https://shellshock.io/ | Replay redirects to a different capture | `VL2IN6L7HR3SHT22EJNRXEJHN3OSJWX2` |
| 2024-11-22 03:31:38 UTC | https://shellshock.io/data/twitchStreams.json?1732246298386 | Public replay returns HTTP 404 | `GRDJCX3T4FX56ES4PVPLJVVJGYMBF63X` |
| 2024-12-10 00:07:37 UTC | https://shellshock.io/data/twitchStreams.json?1718931880089 | Public replay returns HTTP 404 | `B6FFKQWPWLQLXCDDL6C7SYQL7ILCYSNM` |
| 2024-12-16 01:01:19 UTC | https://shellshock.io/ | Replay redirects to a different capture | `TLJCF7ALDEDA7AIIQDIOXD5GG7B6PQB5` |
| 2025-06-18 13:23:41 UTC | https://shellshock.io/privacy.html | Replay redirects to a different capture | `UGRAQVTG26W4DY2YU2PCSDSWVAR5OZQI` |

Detailed attempt histories and rejected responses are retained under `_recovery/downloads_2021-2026/`. Public mirror-index failures are recorded as incomplete lookups, not as proof that those mirrors contain no matching capture.
