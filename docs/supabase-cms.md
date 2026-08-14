# Supabase Album CMS

This CMS layer is intentionally additive. It does not delete, move, rename, or upload existing local gallery images.

## Phase 1: Current Behavior

Existing local albums still load from `js/portfolio-data.js` and local `img/` folders.

Current reusable gallery URLs:

- `album.html?album=japan23`
- `album.html?album=viet23`
- `album.html?album=ej23`
- `album.html?album=greece23`
- `album.html?album=oki24`
- `album.html?album=bali24`

Current legacy gallery pages preserved as files:

- `japan23.html`
- `viet23.html`
- `ej23.html`
- `greece23.html`
- `oki24.html`
- `bali24.html`

No Netlify redirects are required while these files remain available. If these legacy pages are later replaced by CMS routes, add redirects only after confirming the preferred destination URL.

## Existing Album Inventory

| Album | ID | Local folder | Cover | Photos | Camera | Film |
| --- | --- | --- | --- | ---: | --- | --- |
| Japan 2023 | `japan23` | `img/japan23/` | `img/japan23.JPG` | 26 | FND NIJI cam | Kodak Gold 200 / Fujifilm Superia 400 / Kodak Ultramax 400 |
| Vietnam 2023 | `viet23` | `img/vietnam23/` | `img/vietnam23.JPG` | 25 | 35mm film camera | Color negative film |
| East Java 2023 | `ej23` | `img/eastjava23/` | `img/ej23.jpg` | 27 | 35mm film camera | Color negative film |
| Greece 2023 | `greece23` | `img/greece23/` | `img/greece23.jpg` | 25 | 35mm film camera | Color negative film |
| Okinawa 2024 | `oki24` | `img/okinawa24/` | `img/oki24.jpg` | 28 | 35mm film camera | Color negative film |
| Bali 2024 | `bali24` | `img/bali24/` | `img/bali24.jpg` | 25 | 35mm film camera | Color negative film |

Observed sample dimensions are large, around `4096x2732`, `5397x3602`, and `3391x5081`. The existing image set is roughly `342 MB`, so do not bulk-upload or recompress without reviewing the audit first.

## Supabase Setup

1. Create a Supabase project.
2. Create a public storage bucket named `album-photos`.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Enable email/password login in Supabase Auth.
5. Open `/admin-login.html`.
6. Create an admin user in Supabase Auth with an email and password.
7. Add the Supabase URL and publishable key to `js/cms-config.js`.
8. Sign in with the admin email and password.
9. Return to `/admin.html`, fill in album details, choose photos, and upload.

The public portfolio loads CMS albums only when a Supabase URL and publishable key are configured through `window.SUPABASE_CONFIG` or local browser storage. Without that config, it falls back to local albums.

For production, `js/cms-config.js` can contain the Project URL, publishable key, and bucket name. The publishable key is okay for browser use when Row Level Security policies are correct. Do not commit private secret keys, service role keys, or database passwords.

If `js/cms-config.js` is not filled yet, `/admin-login.html` still has a Supabase setup section that saves those values in the current browser.

## Admin Features

The admin area is split into:

- `admin-login.html` for username/password login and Supabase setup.
- `admin.html` for authenticated album management.

The admin can:

- Upload new Supabase albums.
- View Supabase-managed albums.
- Delete individual Supabase photos.
- Delete an entire Supabase album and its Supabase Storage files.
- Sign out.

Delete actions are intentionally limited to Supabase rows and Supabase Storage objects. Existing local albums from `js/portfolio-data.js` and files under `img/` are not listed in the delete UI and are not touched.

## Migration Tools

Run an audit first:

```sh
node tools/audit-existing-albums.mjs > migration/existing-album-audit.json
```

This reports:

- Album names
- Current URLs
- Image order
- Local image paths
- File sizes
- Dimensions from `sips`
- Camera and film metadata from `portfolio-data.js`

Create a draft import payload:

```sh
node tools/export-local-albums-for-supabase.mjs
```

This writes:

```text
migration/local-albums-supabase-draft.json
```

The export keeps the original image paths and ordering. It does not upload files to Supabase.

## Safe Migration Recommendation

For the existing albums, migrate in small batches:

1. Run the audit script.
2. Review image sizes and dimensions.
3. Decide per album whether to keep serving local images or upload to Supabase Storage.
4. Import one album into Supabase as a draft.
5. Compare local `album.html?album=...` and CMS-loaded version visually.
6. Only then consider redirects or removing legacy pages.

Do not remove local image folders until the Supabase version has been verified and backed up.
