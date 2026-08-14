import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const reportPath = join(root, "migration", "local-albums-migration-report.json");
const source = readFileSync(join(root, "js/portfolio-data.js"), "utf8");
const configSource = readFileSync(join(root, "js/cms-config.js"), "utf8");
const context = { window: {} };

vm.createContext(context);
vm.runInContext(source, context);

const albums = context.window.portfolioAlbums || [];
const config = {
    url: process.env.SUPABASE_URL || configSource.match(/url:\s*"([^"]+)"/)?.[1],
    anonKey: process.env.SUPABASE_ANON_KEY || configSource.match(/anonKey:\s*"([^"]+)"/)?.[1],
    bucket: process.env.SUPABASE_BUCKET || configSource.match(/photoBucket:\s*"([^"]+)"/)?.[1] || "album-photos",
};

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const email = process.env.SUPABASE_EMAIL;
const password = process.env.SUPABASE_PASSWORD;

const cleanUrl = (value) => String(value || "").replace(/\/+$/, "");
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const extractYear = (title) => {
    const match = String(title || "").match(/\b(20\d{2})\b/);
    return match ? Number(match[1]) : null;
};
const generatedSlug = (title) => String(title || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const storageExtension = (src) => extname(src).replace(".", "").toLowerCase() || "jpg";
const contentType = (src) => {
    const ext = storageExtension(src);
    if (ext === "png") {
        return "image/png";
    }
    if (ext === "webp") {
        return "image/webp";
    }
    return "image/jpeg";
};
const dimensions = (filePath) => {
    try {
        const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
        return {
            width: Number(output.match(/pixelWidth: (\d+)/)?.[1] || 0) || null,
            height: Number(output.match(/pixelHeight: (\d+)/)?.[1] || 0) || null,
        };
    } catch {
        return { width: null, height: null };
    }
};

if (!config.url || !config.anonKey) {
    throw new Error("Missing Supabase URL or publishable key in js/cms-config.js or environment variables.");
}

async function authenticate() {
    if (serviceRoleKey) {
        return { apiKey: serviceRoleKey, bearer: serviceRoleKey, mode: "service_role" };
    }
    if (accessToken) {
        return { apiKey: config.anonKey, bearer: accessToken, mode: "access_token" };
    }
    if (email && password) {
        const response = await fetch(`${cleanUrl(config.url)}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: {
                apikey: config.anonKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(`Supabase password login failed: ${body.error_description || body.msg || response.status}`);
        }
        return { apiKey: config.anonKey, bearer: body.access_token, mode: "password" };
    }

    if (apply) {
        throw new Error("Migration apply requires SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN, or SUPABASE_EMAIL and SUPABASE_PASSWORD.");
    }
    return { apiKey: config.anonKey, bearer: config.anonKey, mode: "dry_run" };
}

async function rest(auth, method, path, body) {
    const response = await fetch(`${cleanUrl(config.url)}${path}`, {
        method,
        headers: {
            apikey: auth.apiKey,
            Authorization: `Bearer ${auth.bearer}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
        },
        body: body == null ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed = null;
    if (text) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
    }
    if (!response.ok) {
        throw new Error(`${method} ${path} failed: ${response.status} ${text}`);
    }
    return parsed;
}

async function storageExists(auth, storagePath) {
    const response = await fetch(`${cleanUrl(config.url)}/storage/v1/object/public/${config.bucket}/${encodePath(storagePath)}`, {
        method: "HEAD",
        headers: {
            apikey: auth.apiKey,
            Authorization: `Bearer ${auth.bearer}`,
        },
    });
    return response.ok;
}

async function uploadFile(auth, filePath, storagePath, type) {
    if (await storageExists(auth, storagePath)) {
        return "skipped-existing-storage";
    }

    const response = await fetch(`${cleanUrl(config.url)}/storage/v1/object/${config.bucket}/${encodePath(storagePath)}`, {
        method: "POST",
        headers: {
            apikey: auth.apiKey,
            Authorization: `Bearer ${auth.bearer}`,
            "Content-Type": type,
            "cache-control": "31536000",
            "x-upsert": "false",
        },
        body: readFileSync(filePath),
    });
    const text = await response.text();
    if (response.ok) {
        return "uploaded";
    }
    if (/already exists|Duplicate|Asset Already Exists/i.test(text)) {
        return "skipped-existing-storage";
    }
    throw new Error(`Upload ${storagePath} failed: ${response.status} ${text}`);
}

async function findAlbum(auth, slug) {
    const rows = await rest(auth, "GET", `/rest/v1/albums?slug=eq.${encodeURIComponent(slug)}&select=*`);
    return rows[0] || null;
}

async function upsertAlbum(auth, payload) {
    const existing = await findAlbum(auth, payload.slug);
    if (existing) {
        const updated = await rest(auth, "PATCH", `/rest/v1/albums?slug=eq.${encodeURIComponent(payload.slug)}`, payload);
        return { album: updated[0], action: "updated" };
    }
    const created = await rest(auth, "POST", "/rest/v1/albums", payload);
    return { album: created[0], action: "created" };
}

async function existingPhotoPaths(auth, albumId) {
    const rows = await rest(auth, "GET", `/rest/v1/photos?album_id=eq.${encodeURIComponent(albumId)}&select=id,storage_path`);
    return new Set(rows.map((row) => row.storage_path));
}

async function insertPhoto(auth, photo) {
    const rows = await rest(auth, "POST", "/rest/v1/photos", photo);
    return rows[0];
}

async function migrate() {
    const auth = await authenticate();
    const report = {
        applied: apply,
        authMode: auth.mode,
        bucket: config.bucket,
        generatedAt: new Date().toISOString(),
        albums: [],
        warnings: [],
    };

    for (const [albumIndex, album] of albums.entries()) {
        const year = extractYear(album.title);
        const slug = album.id;
        const canonicalSlug = generatedSlug(album.title);
        const albumReport = {
            title: album.title,
            slug,
            canonicalSlug,
            year,
            currentUrl: `album.html?album=${album.id}`,
            legacyPage: `${album.id}.html`,
            imageCount: album.images.length,
            totalBytes: 0,
            albumAction: apply ? null : "dry-run",
            coverAction: apply ? null : "dry-run",
            uploadedPhotos: 0,
            skippedExistingPhotos: 0,
            insertedPhotoRows: 0,
            skippedExistingPhotoRows: 0,
            missingFiles: [],
        };

        if (year == null) {
            report.warnings.push(`${album.title} has no 20XX year in title.`);
        }

        const coverFile = join(root, album.cover);
        const coverStoragePath = `${slug}/cover.${storageExtension(album.cover)}`;
        const payload = {
            slug,
            title: album.title,
            description: album.description || null,
            location: album.meta || null,
            album_date: null,
            year,
            camera: album.camera || null,
            film: album.film || null,
            cover_url: coverStoragePath,
            published: true,
            sort_order: albumIndex + 1,
        };

        if (!apply) {
            albumReport.photos = album.images.map((src, imageIndex) => {
                const filePath = join(root, src);
                const exists = existsSync(filePath);
                const stats = exists ? statSync(filePath) : null;
                const size = exists ? dimensions(filePath) : { width: null, height: null };
                if (stats) {
                    albumReport.totalBytes += stats.size;
                } else {
                    albumReport.missingFiles.push(src);
                }
                return {
                    source: src,
                    exists,
                    storagePath: `${slug}/${String(imageIndex + 1).padStart(3, "0")}.${storageExtension(src)}`,
                    sortOrder: imageIndex + 1,
                    fileSizeBytes: stats?.size ?? null,
                    width: size.width,
                    height: size.height,
                };
            });
            report.albums.push(albumReport);
            continue;
        }

        const { album: remoteAlbum, action } = await upsertAlbum(auth, payload);
        albumReport.albumAction = action;

        if (existsSync(coverFile)) {
            albumReport.coverAction = await uploadFile(auth, coverFile, coverStoragePath, contentType(album.cover));
        } else {
            albumReport.coverAction = "missing-cover";
            albumReport.missingFiles.push(album.cover);
        }

        const existingPaths = await existingPhotoPaths(auth, remoteAlbum.id);

        for (const [imageIndex, src] of album.images.entries()) {
            const filePath = join(root, src);
            const storagePath = `${slug}/${String(imageIndex + 1).padStart(3, "0")}.${storageExtension(src)}`;
            if (!existsSync(filePath)) {
                albumReport.missingFiles.push(src);
                continue;
            }

            const stats = statSync(filePath);
            const size = dimensions(filePath);
            albumReport.totalBytes += stats.size;
            const uploadAction = await uploadFile(auth, filePath, storagePath, contentType(src));
            if (uploadAction === "uploaded") {
                albumReport.uploadedPhotos += 1;
            } else {
                albumReport.skippedExistingPhotos += 1;
            }

            if (existingPaths.has(storagePath)) {
                albumReport.skippedExistingPhotoRows += 1;
                continue;
            }

            await insertPhoto(auth, {
                album_id: remoteAlbum.id,
                storage_path: storagePath,
                public_url: null,
                alt_text: `${album.title} frame ${imageIndex + 1}`,
                width: size.width,
                height: size.height,
                file_size_bytes: stats.size,
                sort_order: imageIndex + 1,
            });
            albumReport.insertedPhotoRows += 1;
        }

        report.albums.push(albumReport);
    }

    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`Wrote ${reportPath}`);
}

migrate().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
