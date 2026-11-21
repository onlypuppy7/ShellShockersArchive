# ShellShockersArchive

Archived Shell Shockers clients, assets, provenance records, and a static browser with offline previews.

Run `python -m http.server 8765` in this directory, then open http://127.0.0.1:8765/. Preview service workers require localhost or HTTPS.

The GitHub Pages workflow is started manually from Actions. It publishes the lightweight site and retrieves archived payloads from this repository, pinned to the deployed commit. The original JavaScript archive remains at https://github.com/onlypuppy7/ShellShockJSArchives.

## Finding missing js's
Use the internet archive:
- Use [this link](https://web.archive.org/web/*/shellshock.io/src*) for js's prior to Dec 17, 2021, and in the filter type `shellshock.min.js`
- Use [this link](https://web.archive.org/web/*/shellshock.io/src*) for js's between Aug 17, 2020 to Sep 5, 2022, and in the filter type `shellshock.js`
- Use [this link](https://web.archive.org/web/*/shellshock.io/js*) for js's after Sep 17, 2022, and in the filter type `shellshock.js`
