# Leonard Ho Portfolio

A modern static portfolio for Leonard Ho: Java developer, film photographer, and travel-gallery maker.

## Preview

Open `index.html` directly in a browser, or run a simple local server from this folder:

```sh
python3 -m http.server 5174 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:5174/`.

## Updating Albums

Album cards and gallery pages are generated from `js/portfolio-data.js`.

To add a new album:

1. Add the cover image to `img/`.
2. Add the album photos to a folder inside `img/`.
3. Add one new object to `window.portfolioAlbums`.

The reusable album page is `album.html?album=album-id`.
