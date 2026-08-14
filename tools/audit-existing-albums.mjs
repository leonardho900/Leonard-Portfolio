import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const source = readFileSync(join(root, "js/portfolio-data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const albums = context.window.portfolioAlbums || [];

function dimensions(filePath) {
    try {
        const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
        return {
            width: Number(output.match(/pixelWidth: (\d+)/)?.[1] || 0),
            height: Number(output.match(/pixelHeight: (\d+)/)?.[1] || 0),
        };
    } catch {
        return { width: null, height: null };
    }
}

const report = albums.map((album) => {
    const images = album.images.map((src, index) => {
        const filePath = join(root, src);
        const exists = existsSync(filePath);
        const stats = exists ? statSync(filePath) : null;
        return {
            order: index + 1,
            src,
            exists,
            extension: extname(src),
            sizeBytes: stats?.size ?? null,
            sizeMb: stats ? Number((stats.size / 1024 / 1024).toFixed(2)) : null,
            dimensions: exists ? dimensions(filePath) : null,
        };
    });
    const totalBytes = images.reduce((sum, image) => sum + (image.sizeBytes || 0), 0);
    const largest = images.reduce((max, image) => (image.sizeBytes || 0) > (max.sizeBytes || 0) ? image : max, {});

    return {
        id: album.id,
        title: album.title,
        currentUrl: `album.html?album=${album.id}`,
        legacyPages: [`${album.id}.html`],
        meta: album.meta,
        description: album.description,
        camera: album.camera,
        film: album.film,
        cover: album.cover,
        imageCount: images.length,
        totalMb: Number((totalBytes / 1024 / 1024).toFixed(2)),
        largestImage: largest,
        images,
    };
});

console.log(JSON.stringify(report, null, 2));
