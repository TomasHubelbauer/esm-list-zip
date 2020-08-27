# ESM List Zip

A JavaScript ESM library for listing entries of a ZIP archive by URL.
This library doesn't download the whole archive, it uses range `fetch` requests to
download only the end of the ZIP archive where the central directory (CD) resides
and to parse out the entry names from there. It progressively loads more and more
of the archive until the whole central directory is available and then it parses.
This ensures minimal bandwidth wasting and quick operation even for large archives.

Note that the requested archive's URL must be on a server which supports range
requests.

## Usage

```js
import listZip from 'https://tomashubelbauer.github.io/esm-list-zip/index.js';

for await (const entry of listZip(url, onFetch, onNoRange)) {
  // { name: string; offset: number; size: number; content?: ArrayBuffer; }
}
```

## Running

### macOS

#### No Range Requests

`python3 -m http.server` for `localhost:8000`

#### Range Requests

## To-Do

### Fix several spots in the code assuming full response where only a portion might be available

While the library is aiming for full ranged support eventually (so that a kilobyte-size
file results in the EOCD request, the CD request and the content range request totalling
a few kilobytes at best, not the entirety of the archive, possibly mega or even giga
bytes), the support is not there yet.

### Add instructions for installing a ranged HTTP server (`npx serve`?)

Right now we use Python's HTTP server bundled with macOS, but we need to add instructions
on how to use a server with range request support so that that can be tested locally and
the bugs around that ironed out.

### Extract and render image entries to allow preview as they scroll into view

As the user scrolls the list of entries, sequentially download and extract contents of the
entries which are images according to their extension. Do this sequentially so we can just
cancel the current operation once the not-yet-previewed image entry scrolls out of view.

Use https://github.com/TomasHubelbauer/esm-uzip-js for this.
