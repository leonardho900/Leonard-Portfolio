import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const outFile = join(root, "migration", "local-albums-supabase-draft.json");
const source = readFileSync(join(root, "js/portfolio-data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const albums = context.window.portfolioAlbums || [];
const exported = albums.map((album, albumIndex) => ({
    album: {
        slug: album.id,
        title: album.title,
        description: album.description,
        location: album.meta,
        album_date: null,
        camera: album.camera,
        film: album.film,
        cover_url: album.cover,
        published: true,
        sort_order: albumIndex + 1,
    },
    photos: album.images.map((src, imageIndex) => {
        const filePath = join(root, src);
        const stats = statSync(filePath);
        return {
            storage_path: src,
            public_url: src,
            alt_text: `${album.title} frame ${imageIndex + 1}`,
            file_size_bytes: stats.size,
            sort_order: imageIndex + 1,
        };
    }),
}));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(exported, null, 2));
console.log(`Wrote ${outFile}`);
console.log("Dry-run only: no files moved, renamed, compressed, or uploaded.");
