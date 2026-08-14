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
    const extractYear = (title) => {
        const match = String(title || "").match(/\b(20\d{2})\b/);
        return match ? Number(match[1]) : null;
    };
    const normalizeLocalAlbum = (album, index) => ({
        ...album,
        year: album.year ?? extractYear(album.title),
        sortOrder: album.sortOrder ?? index + 1,
        source: album.source || "local",
    });
    const sortAlbums = (albums) => [...albums].sort((a, b) => {
        const yearA = a.year ?? -Infinity;
        const yearB = b.year ?? -Infinity;
        if (yearA !== yearB) {
            return yearB - yearA;
        }
        const sortA = a.sortOrder ?? 100;
        const sortB = b.sortOrder ?? 100;
        if (sortA !== sortB) {
            return sortA - sortB;
        }
        return String(a.title).localeCompare(String(b.title));
    });
    const normalizedLocalAlbums = sortAlbums(localAlbums.map(normalizeLocalAlbum));

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
            year: album.year ?? extractYear(album.title),
            sortOrder: album.sort_order ?? 100,
            source: "supabase",
            images: imageUrls,
        };
    };

    const loadSupabaseAlbums = async () => {
        if (!hasSupabaseConfig) {
            window.portfolioAlbums = normalizedLocalAlbums;
            notify();
            return normalizedLocalAlbums;
        }

        try {
            const [albums, photos] = await Promise.all([
                request("/rest/v1/albums?select=*&published=eq.true&order=year.desc.nullslast,sort_order.asc,created_at.asc"),
                request("/rest/v1/photos?select=*&order=sort_order.asc"),
            ]);
            const remoteAlbums = albums
                .map((album) => normalizeAlbum(album, photos))
                .filter((album) => album.images.length > 0);
            const remoteIds = new Set(remoteAlbums.map((album) => album.id));
            window.portfolioAlbums = sortAlbums([
                ...remoteAlbums,
                ...normalizedLocalAlbums.filter((album) => !remoteIds.has(album.id)),
            ]);
        } catch (error) {
            console.warn("Supabase albums unavailable. Showing local albums only.", error);
            window.portfolioAlbums = normalizedLocalAlbums;
        }

        notify();
        return window.portfolioAlbums;
    };

    window.portfolioAlbumsReady = loadSupabaseAlbums();
})();
