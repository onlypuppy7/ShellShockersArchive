# Wayback recovery (2017–2026)

## Supplemental collections and provenance

Community collections are credited to **onlypuppy7 via statefarm_bot**,
**statefarm_bot (WorkingStatus) by onlypuppy7**, **antiyolk by 1ust**, and
**loft by 1ust**. Existing Wayback recoveries are credited to **archive.org**.
Production and dev files remain separate; dev files use `_dev/`.

See [ORIGINS.md](ORIGINS.md) for the public provenance policy. Each dated
inventory retains source credits, recorded dates, game paths and content hashes.
Donor repository internals and workstation paths are not published. Exported
provenance covers only the selected recovered snapshot, including inherited files.

## 2021–2026 assembly

### Script pairing correction

Game-script selection uses the actual recorded response time across cachebuster
variants at the same host and path. Query values are not release identifiers.
A verified response must be within 24 hours of the snapshot observation to be
included as a temporal reconstruction. This is a crawl-matching limit, not proof
that the script belongs to the HTML's version. Missing responses stay missing.

The correction is recorded in `script_pairing_correction.json`. The early 0.7.1,
0.8.1, 0.9.1 and 0.9.2 HTML captures no longer include scripts recovered weeks or
months later. Those payloads remain preserved in standalone `script-capture`
folders at verified response dates, without an inferred release version or HTML.
Derived companions follow the selected script. Supporting assets remain explicitly
unverified reconstructions rather than authenticated release dependencies.

Game previews remain available with a small disclaimer for uncertain pairings.
Their separate preview-only supplements retain previously used game scripts and
show the actual response dates in Loading details. These scripts are not restored
to the HTML snapshot inventories or exports.


The offline append workflow is `assemble_years.py`. It preserves the older
2017–2020 folders and appends dated snapshots in the same incremental format.
`audit_assembly_years.py` checks every inventory and retained source, verifies
all recovered 2021–2026 payloads are represented, compares older metadata to
its baseline, and tests independent exports for each year.

See `assembly_report_2021-2026.md` and `assembly_summary_2021-2026.json` for
the completed assembly's counts, validation, and full dated-folder list.
`assembled_versions_2021-2026.json` provides a compact machine-readable list.
The download receipt separately documents the 17 unresolved capture groups.

Release labels are extracted from HTML or game JavaScript where possible.
When an explicitly referenced changelog capture supplies a label, `capture.json`
marks that association as unverified and records its time offset. Encoded game
scripts are decoded only for release and dependency analysis; their original
served bytes remain unchanged. The read-only decoder was checked against the
archived WebAssembly loader. A standalone maintenance page is unversioned.
The loader's inline script URLs are included, with cache-busting queries
retained in provenance. Exact script query matches more than 30 days away yield
to a closer capture at the same pathname. These are reconstructed collections, not proof of
simultaneous releases or a guarantee that the game works offline.

To preserve every recovered payload, files with no detected dependency
relationship are retained in a nearby dated folder and marked
`indexed_capture_preservation` in `assets.json`. This does not assert that
the game used the file in that snapshot. Conflicting URL/query variants use
`_asset_alternatives/<content-prefix>/<original-path>`, preventing overwrite.
External resources and both Twitch avatar paths remain excluded. No archived
`.lightmap` capture was found in the index.

The exporter uses only dated-folder files and `delta.json`; the recovery
cache is retained as research evidence and is not required for an export.
Legacy integration reports below describe the earlier 2017–2020 work.

Request-ID-only variants are consolidated: comparison ignores only Cloudflare's
`rayId` field in HTML while comparing all other primary bytes exactly. Each
retained snapshot lists its equivalent capture dates in `capture.json`.
Distinct HTML and asset contents from those captures remain under their original
paths or `_capture_variants/<content-prefix>/<original-path>` when they conflict.
These merged inventories preserve variants without asserting simultaneous use.
Full pre-consolidation metadata is retained in the recovery evidence directory.

## Decoded JavaScript companions

Encoded scripts retain their original served bytes. Their decoded companions
use `.decoded.js` beside the original `.js` path, including inside preserved
capture variants. These are derived files, not archived served responses.
They follow the same incremental inheritance rules and are included in exports.
`assets.json` records the encoded source hash, archived loader and WASM hashes,
decoded hash, and the loader context used. Compatible recovered loaders may come
from another capture; this does not establish a historical loader pairing.
The decoded game code was captured without execution and passed `node --check`.
See `decoded_copies_summary.json` for the inventory and derivation evidence.

## Incremental version folders

Dated folders now contain only files added or changed since the preceding
snapshot in **capture-time order**. Unchanged HTML, JavaScript, models, and
other assets remain in the earlier folder that introduced those bytes.
`delta.json` records additions, changes, absent paths, and the complete
snapshot inventory with references to the earlier files. `capture.json` and
`assets.json` retain their original provenance; their file lists describe
the complete reconstructed snapshot, not just files physically in the folder.
An absent path means absent from that reconstruction, not proven deleted
from the historical website. No original served bytes were rewritten.

Double-click `export_version.cmd` on Windows, or run:

```powershell
python web_archived/export_version.py
```

Choose a numbered snapshot and output directory. The default is
`exported_versions/<dated-folder>/` beside `web_archived`. Exports are ordinary,
independent copies in game path structure, safe to edit. Provenance is copied
under `_archive_metadata/`. Existing destinations are never overwritten.
The exporter reads the dated folders, without using the recovery object store
or downloading anything. It reconstructs all **recovered** files; unresolved
references and differences in capture dates remain documented.

For noninteractive use:

```powershell
python web_archived/export_version.py --list
python web_archived/export_version.py --version 0.13.4_2018-06-15_01-23-22_UTC --output C:/temp/shellshock-0.13.4
python web_archived/audit_incremental.py
```

`incremental_report.md` lists changes per snapshot. The migration journal is
in `_recovery/incremental_layout/`; `make_incremental.py` can resume an
interrupted conversion. The existing supporting-asset recovery store remains
available for research, including captures not selected for any snapshot.
It is not required by the exporter. The older placement/assembly commands
below are disabled once the incremental layout exists, to prevent restoring
duplicate files accidentally.

`python web_archived/integrate_audio.py` associates downloaded sounds with
original JavaScript sound references and sound-sprite catalogs, then updates
the existing incremental manifests. It reads archived code without executing
it. Unchanged sounds are inherited from earlier dated folders. The operation
is checkpointed in `_recovery/incremental_audio/` and can resume safely.
`audio_integration_report.md` records per-snapshot audio coverage. WebM files
under `/sound/` are packed audio; missing Ogg/MP3 alternatives remain recorded
as gaps. Capture-date offsets are preserved in `assets.json`; associations
are not proof of simultaneous historical releases.

`python web_archived/integrate_remaining.py` connects the other recovered
resources to snapshots via original HTML/JS, stylesheet dependencies, JSON,
and resource templates/prefixes. It preserves existing selections, records
inferred associations, and skips third-party resources and Twitch avatars.
Only additions/changes are stored. Its resumable plan and previous metadata
are in `_recovery/incremental_remaining/`; coverage is recorded in
`remaining_integration_report.md`. Unmatched capture histories remain in the
supporting recovery catalog rather than being forced into game versions.

`audit_incremental.py` verifies all snapshot inventories and their original
provenance. `audit_exports.py` additionally reconstructs every snapshot into
temporary independent copies and verifies exported paths, hashes, and
metadata; its receipt is `export_validation.json`. Test copies are removed.
`gap_content_crosscheck.json` distinguishes unresolved capture proofs from
replay contents already verified at another capture. Such matches do not
promote failed captures to verified status.

The original 2017–2018 pass is documented below. For the additional 2019–2020
pass, run `python web_archived/archive_pipeline.py`. It downloads discovered
payloads while CDX indexing continues, then assembles folders after indexing.
Its separate progress manifest
and report are `manifest_2019-2020.json` and `recovery_report_2019-2020.md`.
Both passes write dated folders directly into `web_archived/`.

Folder version labels identify the recovered HTML version when the JavaScript
release version cannot be independently established. Later captures of the
same cache-busting URL can contain newer code. These are reconstructions,
not verified historical releases; inspect each file's source timestamp.

`python web_archived/inventory_domains.py` checks all domains listed in
`proxy_domains.txt`. It saves every domain's earliest capture of any URL to
`proxy_domain_history.csv`, `proxy_domain_history.md`, and
`_recovery/domain_inventory/results.json`. The before-2020 cutoff is strictly
earlier than 2020-01-01 UTC, with earliest captures before 2017 excluded from
the requested relevance shortlist. A robots file, redirect, or previous owner's site
counts as an archived presence, not proof of a Shell Shockers game mirror.

The new parallel client uses SOCKS proxies when `WAYBACK_PROXY_USER` and
`WAYBACK_PROXY_PASS` are supplied in the process environment, with optional
`WAYBACK_EXTRA_PROXY`. Credentials are passed to curl on stdin and are not
saved in the repository. Without these variables, it uses direct requests.

## Unfiltered asset inventory

Run `python web_archived/index_all_assets.py` for the complete 2017–2020
CDX inventory of `shellshock.io` and its subdomains. This pass has no file-type,
HTTP-status, or collapse filters. It preserves query strings, redirects,
errors, and revisit records, and follows continuation tokens. Sixteen date-range
queries run concurrently using the configured network routes; failed large
queries split into smaller ranges on the shared work queue. Completed queries
and checkpoints are reused on reruns, including slices of incomplete months.

Results are saved in `_recovery/all_assets_2017-2020/`: `all_captures.json`
contains every returned capture, `new_captures.json` identifies records absent
from the previous HTML/JS inventories, and `summary.json` records coverage and
counts. `known_captures.json` retains the union of old and new records;
`previous_records_not_returned.json` flags earlier records not returned
identically in this pass. `all_assets_inventory_2017-2020.md` is the readable report. This is an
inventory pass; asset response bodies are not downloaded by this command.

The separate background inventory for 2021–2026 uses:

```powershell
python web_archived/index_all_assets.py --from-year 2021 --to-year 2026 --through-date 2026-11-12 --workers 2
```

It writes `_recovery/all_assets_2021-2026/` and
`all_assets_inventory_2021-2026.md`, leaving the earlier range separate.
The cutoff is inclusive in UTC. Advancing `--through-date` resumes missing days
of a partially indexed month; no future days are included. This is unfiltered
CDX metadata, including deferred-avatar URLs; it does not download their bodies.
`index_coverage.py` measures completed day coverage while indexing runs.
After completion, `validate_inventory.py` verifies all requested dates and
that every saved query row is represented in the final inventory.

## Supporting asset recovery

For the remaining sounds, nested artwork, JSON/data, video, and miscellaneous
first-party files, run `python web_archived/recover_assets.py --all-first-party`.
This uses the existing unfiltered index and saved proofs, downloading each
distinct successful/revisit payload group once. It does not follow external
URLs found inside JSON, and does not change incremental snapshot folders.
Twitch avatars are currently deferred by user instruction; their URL paths
are filtered using `_recovery/assets_2017-2020/policy.json` before scheduling.
All source captures remain available in the supporting recovery catalog,
including files not yet associated with a game snapshot. Newly recovered files
are not automatically asserted to belong to every dated game version.
`remaining_inventory_2017-2020.json` records the initial outstanding count;
`inventory_remaining.py --output <new-report.json>` can measure what remains
after completion. Actual byte sizes are recorded in each recovered manifest
entry; the original CDX index did not contain sizes.

`python web_archived/recover_assets.py` recovers stamp sheets, Babylon models
and manifests, all indexed CSS, root game textures/UI images, and their
referenced dependencies for 2017–2020. Sources are limited to `shellshock.io`
and its subdomains. Third-party fonts, UI libraries, authentication SDKs,
advertising, and tracking resources are excluded by user instruction.
External references are listed as excluded in dependency metadata.
Downloads and new dependency searches run concurrently. `--retry-failed`
retries failed payloads; `--assemble-only` uses saved data without network
requests. Verified bodies and CDX queries are reused on subsequent runs.

The output is `assets_2017-2020/`. `objects/` stores distinct decoded files by
SHA-256; timestamped `variants/` folders retain original game paths, with
other hosts under `_hosts/`. Variant files use hard links where available:
treat them as immutable archive data. `manifest.json` maps original URLs,
query strings, capture histories, and verification proofs to local files.
Dates are capture times; asset folders do not assert a game release version.
`dependencies.json` records recovered, unavailable, and failed dependencies.
The main-site inventory stays unfiltered. Additional dependency searches
collapse consecutive identical CDX digests to recover distinct versions
without enumerating thousands of identical font captures.

Replay transport compression is removed only when the decoded SHA-1 matches
CDX. When CDX hashes original compressed bytes, those encoded bytes are
preserved separately and checked against the decoded file. Replay redirects
retain their actual replay timestamps in source metadata.
Some records hash HTTP chunk framing as part of their payload. Such captures
are accepted only when the exact chunked bytes match CDX and decode to the
saved file; both bytes and proof are preserved. `recover_chunked_proofs.py`
can recover deterministic framing from rejected replay bodies, subject to
that exact checksum requirement.

Run `node web_archived/extract_asset_metadata.mjs` after recovery for embedded
catalogs and stamp atlas definitions. This parses originals with Acorn and
never executes archived JavaScript. The default Acorn location is the sibling
LegacyShell checkout; override `ARCHIVE_ACORN_PATH` with an absolute module
path if necessary. Derived JSON, exact catalog source fragments, PNG sheet
dimensions, and compatible grids are saved under `assets_2017-2020/derived/`.
These derived files are explicitly distinguished from original served files.

Before incremental conversion, `python web_archived/populate_version_assets.py`
placed recovered assets inside dated game folders using original paths. It is
now disabled; use the exporter above. Each `assets.json` records
chosen captures, date offsets, unresolved references, and alternatives for path
conflicts. Selections are reconstructions, not verified simultaneous releases.
Retained archive files may have hard links to the recovery store; treat them
as immutable and edit exported copies instead. `asset_placement_report.md`
lists full reconstructed asset counts, not incremental file counts. Run
`python web_archived/audit_asset_placement.py` to verify placed hashes,
first-party scope, and unchanged original HTML/JavaScript; results are saved
in `asset_placement_validation.json`.

## 2021–2026 download pass

`download_years.py` consumes the complete saved domain inventory, through
12 November 2026. It recovers successful/revisit first-party payloads of all
file types, excluding Twitch avatar paths and external hosts. Query strings
and capture histories are retained in
`_recovery/downloads_2021-2026/inventory.json`.

Downloads use chronological year batches, oldest first, with bounded parallel
workers within a year. Identical content is recovered once and reused across
years. Each completed payload is immediately checkpointed with CDX SHA-1 and
SHA-256 proof; an interrupted run can resume without repeating verified work.
`--retry-failed` retries unresolved payloads. Supply proxy credentials through
the existing `WAYBACK_PROXY_*` environment variables, never archive files.

`download_status.py` writes `download_progress_2021-2026.md`, including verified
percentages by year and changes since its preceding report.
`audit_download_years.py` independently checks the saved scope and every
successful checkpoint available when that audit starts. These downloads are
in `_recovery/bodies/`; assembling new incremental version folders is a later
phase. Existing 2017–2020 version folders are unchanged by this downloader.

The current pass uses `--direct-first`: bounded parallel direct requests,
with SOCKS fallback after transport failures. `retry_download_years.py` can
repair terminal failures alongside the main queue; status reports read those
repairs from the checkpoints. Set `_recovery/downloads_2021-2026/stop.request`
to drain active downloads before a planned restart, then remove that file
before resuming. Proxy credentials remain in process environment variables.

`due_download_update.py` follows the user's saved ten-minute reporting cadence,
including all year percentages and changes since the last communicated
progress update. It returns only the next due time before that interval ends.
Both `/img/twitchAvatars/` and `/data/img/twitchAvatars/` are deferred. Results
fetched before the latter exclusion was corrected are separated in
`deferred_results/` and do not count toward recovered game files.

## Original 2017–2018 pass

Run `python web_archived/recover.py` from the repository root. It uses only
Python's standard library. `--index-only` retrieves the capture index without
downloading payloads.
`--assemble-only` rebuilds version folders from the existing payload cache.
Run `python web_archived/crosscheck.py` to compare the index with the local
LegacyShell wiki, then `python web_archived/audit.py` after recovery to verify
the files and regenerate `recovery_report.md`.

The CDX query covers `*.shellshock.io/*`, both HTTP and HTTPS, and query-string
variants. It follows CDX continuation tokens without collapsing different
payloads. A second HTML/JS query includes `warc/revisit` records with blank
HTTP statuses; these can reference unique payloads as well as duplicates.
The exact root index includes originals that omitted a trailing slash.
`_recovery/` stores the complete index, original response bodies and
download metadata so interrupted work can resume.

Each distinct recovered HTML/JavaScript combination gets a folder named
`VERSION_YYYY-MM-DD_HH-MM-SS_UTC`. The date is a Wayback capture time, not a
release date. `unknown` means no version could be extracted confidently.
Two-component game versions such as `0.29` are retained as written. The
version-label review resolved 26 previously unknown folders; its evidence is
in `version_identification_report.md`. One JavaScript identification (`0.12.3`)
is explicitly marked as inferred from matching code, with a hash-specific
reviewed override in `version_identifications.json`. The two remaining
unversioned captures are an iframe launcher and a default nginx welcome page.
Original paths are preserved (`index.html`, `src/shellshock.min.js`, etc.).
Query strings remain in metadata; payloads are saved under their original
pathname. Original HTML and JavaScript bytes are not rewritten.

`capture.json` records original URLs (including cache busters), capture times,
SHA-256 hashes, missing referenced scripts and each file's actual source.
Downloads are also verified against CDX's SHA-1 content digest.
Some CDX digests describe the original gzip-compressed HTTP payload. In those
cases `_recovery/encoded/` preserves the matching compressed bytes, while the
version folder contains decompressed HTML/JS. Metadata records both hashes and
the encoding; validation checks the compressed digest and that it decodes to
the saved source file. A decompressed-file hash differing from an encoded CDX
digest is not, by itself, an archive discrepancy.
Wayback often captured HTML and scripts at different times. The recovery uses
the nearest available capture of each exact referenced URL in 2017–2018 and
records that choice explicitly. A game-script capture also creates an event
when its HTML was not captured at the same moment. These combinations are
reconstructions, not proof that both files were served simultaneously.

`manifest.json` reports progress and failures. Missing assets are not replaced
with unverified files from the pre-existing `js_archive/` directory. This scope
recovers HTML and same-site JavaScript, not images, models, audio, CSS, server
code, or third-party JavaScript.

The October 2017 launcher references game servers at `73.239.154.99:4242`
and `138.201.129.142:4242`. Supplemental 2017–2018 CDX checks found no captures
for the first and only a five-byte `Nope!` response for the second. That
response is retained in the recovery cache, not presented as game source.
