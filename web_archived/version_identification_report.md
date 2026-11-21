# Version identification review

Resolved 26 of 28 previously unknown folder labels. Archived HTML/JS bytes were preserved.

25 late-2020 folders explicitly declare two-component versions (0.29–0.36) in HTML. The previous extractor incorrectly required three components.

The March 2018 JavaScript is assigned to the 0.12.3 code family by comparison, not an embedded version literal. All 89,880 tokens match a known 0.12.3 capture after two advertisement strings and 103 identifier-token changes from the consistent m/u and S/k minifier renames. No other token differences were found. Evidence: `_recovery/version_review/javascript_comparison.json`.

| Original folder | Identified version | Evidence |
| --- | --- | --- |
| unknown_2017-10-07_00-32-28_UTC | Unversioned | Unversioned iframe launcher. Actual game HTML was hosted on separate server IPs and is not present in this capture. |
| unknown_2018-03-29_14-07-05_UTC | 0.12.3 | javascript_comparison |
| unknown_2019-01-10_04-27-49_UTC | Unversioned | Default nginx welcome page, not a Shell Shockers client; no game version or game JavaScript is present. |
| unknown_2020-10-03_13-05-02_UTC | 0.29 | html |
| unknown_2020-10-16_18-23-05_UTC | 0.30 | html |
| unknown_2020-10-22_05-26-52_UTC | 0.30 | html |
| unknown_2020-10-31_00-32-07_UTC | 0.31 | html |
| unknown_2020-11-01_00-58-43_UTC | 0.31 | html |
| unknown_2020-11-02_02-21-42_UTC | 0.31 | html |
| unknown_2020-11-02_21-48-16_UTC | 0.29 | html |
| unknown_2020-11-06_21-32-19_UTC | 0.30 | html |
| unknown_2020-11-08_18-15-10_UTC | 0.31 | html |
| unknown_2020-11-14_04-10-23_UTC | 0.31 | html |
| unknown_2020-11-17_09-44-08_UTC | 0.31 | html |
| unknown_2020-11-18_19-53-54_UTC | 0.32 | html |
| unknown_2020-11-20_22-18-45_UTC | 0.32 | html |
| unknown_2020-11-21_02-00-36_UTC | 0.32 | html |
| unknown_2020-11-25_04-49-20_UTC | 0.33 | html |
| unknown_2020-11-25_15-43-00_UTC | 0.33 | html |
| unknown_2020-11-27_02-50-32_UTC | 0.33 | html |
| unknown_2020-12-01_22-14-05_UTC | 0.34 | html |
| unknown_2020-12-02_23-40-33_UTC | 0.34 | html |
| unknown_2020-12-06_07-52-42_UTC | 0.34 | html |
| unknown_2020-12-08_20-53-18_UTC | 0.34 | html |
| unknown_2020-12-08_21-37-47_UTC | 0.34 | html |
| unknown_2020-12-16_02-06-05_UTC | 0.35 | html |
| unknown_2020-12-16_16-30-50_UTC | 0.35 | html |
| unknown_2020-12-31_00-11-22_UTC | 0.36 | html |

## Remaining unversioned captures

- `unknown_2017-10-07_00-32-28_UTC`: Unversioned iframe launcher. Actual game HTML was hosted on separate server IPs and is not present in this capture.
- `unknown_2019-01-10_04-27-49_UTC`: Default nginx welcome page, not a Shell Shockers client; no game version or game JavaScript is present.
