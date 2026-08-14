(function () {
    const localAlbums = Array.isArray(window.portfolioAlbums) ? window.portfolioAlbums : [];
    const stored = (key, fallback = "") => {
        try {
            return window.localStorage?.getItem(key) || fallback;
        } catch {
            return fallback;
        }
    };
    const config = window.SUPABASE_CONFIG || {
        url: stored("portfolio.supabaseUrl"),
        anonKey: stored("portfolio.supabaseAnonKey"),
        photoBucket: stored("portfolio.supabasePhotoBucket", "album-photos"),
    };

    const cleanUrl = (value) => String(value || "").replace(/\/+$/, "");
    const hasSupabaseConfig = Boolean(config.url && config.anonKey);

    const notify = () => {
        window.dispatchEvent(new CustomEvent("portfolio-albums:updated", {
            detail: { albums: window.portfolioAlbums || [] },
        }));
    };

    const publicStorageUrl = (path) => {
        if (!path) {
            return "";
        }

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        return `${cleanUrl(config.url)}/storage/v1/object/public/${config.photoBucket}/${path}`;
    };

    const request = async (path) => {
        const response = await fetch(`${cleanUrl(config.url)}${path}`, {
            headers: {
                apikey: config.anonKey,
                Authorization: `Bearer ${config.anonKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Supabase request failed: ${response.status}`);
        }

        return response.json();
    };

    const normalizeAlbum = (album, photos) => {
        const orderedPhotos = photos
            .filter((photo) => photo.album_id === album.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const imageUrls = orderedPhotos.map((photo) => publicStorageUrl(photo.public_url || photo.storage_path));

        return {
            id: album.slug,
            title: album.title,
            meta: album.location || album.meta || "Photography",
            description: album.description || "Film gallery.",
            cover: publicStorageUrl(album.cover_url || orderedPhotos[0]?.public_url || orderedPhotos[0]?.storage_path),
            camera: album.camera || "Camera details coming soon",
            film: album.film || "Film stock coming soon",
            date: album.album_date || "",
            source: "supabase",
            images: imageUrls,
        };
    };

    const loadSupabaseAlbums = async () => {
        if (!hasSupabaseConfig) {
            return localAlbums;
        }

        try {
            const [albums, photos] = await Promise.all([
                request("/rest/v1/albums?select=*&published=eq.true&order=sort_order.asc.nullslast,created_at.desc"),
                request("/rest/v1/photos?select=*&order=sort_order.asc"),
            ]);
            const remoteAlbums = albums
                .map((album) => normalizeAlbum(album, photos))
                .filter((album) => album.images.length > 0);
            const localIds = new Set(localAlbums.map((album) => album.id));
            window.portfolioAlbums = [
                ...localAlbums,
                ...remoteAlbums.filter((album) => !localIds.has(album.id)),
            ];
        } catch (error) {
            console.warn("Supabase albums unavailable. Showing local albums only.", error);
            window.portfolioAlbums = localAlbums;
        }

        notify();
        return window.portfolioAlbums;
    };

    window.portfolioAlbumsReady = loadSupabaseAlbums();
})();
