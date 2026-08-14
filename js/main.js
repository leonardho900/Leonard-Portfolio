(function () {
    const navToggle = document.querySelector(".nav-toggle");
    const siteNav = document.querySelector("#site-nav");

    if (navToggle && siteNav) {
        navToggle.addEventListener("click", () => {
            const isOpen = siteNav.classList.toggle("is-open");
            document.body.classList.toggle("nav-open", isOpen);
            navToggle.setAttribute("aria-expanded", String(isOpen));
        });

        siteNav.addEventListener("click", (event) => {
            if (event.target.tagName === "A") {
                siteNav.classList.remove("is-open");
                document.body.classList.remove("nav-open");
                navToggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    const previewSrc = (src) => `img/thumbs/${src.replace(/^img\//, "")}`;
    const albumImageSrc = (album, src) => album.source === "supabase" ? src : previewSrc(src);
    const albumGrid = document.querySelector("#album-grid");
    const albumPagination = document.querySelector("#album-pagination");
    const albumsPerPage = 5;
    let currentAlbumPage = 1;

    const renderAlbumGrid = () => {
        const albums = window.portfolioAlbums || [];
        if (!albumGrid) {
            return;
        }

        const totalPages = Math.max(1, Math.ceil(albums.length / albumsPerPage));
        currentAlbumPage = Math.min(currentAlbumPage, totalPages);
        const start = (currentAlbumPage - 1) * albumsPerPage;
        const visibleAlbums = albums.slice(start, start + albumsPerPage);

        albumGrid.innerHTML = visibleAlbums.map((album) => `
            <a class="album-card" href="album.html?album=${album.id}" aria-label="Open ${album.title}">
                <img src="${albumImageSrc(album, album.cover)}" alt="${album.title}" loading="lazy" decoding="async">
                <div class="album-info">
                    <span class="album-meta">${album.meta}</span>
                    <h3>${album.title}</h3>
                    <p>${album.description}</p>
                    <span class="album-count">${album.images.length} frames</span>
                </div>
            </a>
        `).join("");

        if (!albumPagination) {
            return;
        }

        albumPagination.innerHTML = totalPages > 1
            ? Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;
                return `
                    <button class="album-page-button" type="button" data-page="${page}" aria-label="Show album page ${page}" ${page === currentAlbumPage ? 'aria-current="page"' : ""}>
                        ${page}
                    </button>
                `;
            }).join("")
            : "";
    };

    renderAlbumGrid();
    window.addEventListener("portfolio-albums:updated", renderAlbumGrid);

    albumPagination?.addEventListener("click", (event) => {
        const button = event.target.closest(".album-page-button");
        if (!button) {
            return;
        }
        currentAlbumPage = Number(button.dataset.page) || 1;
        renderAlbumGrid();
    });

    const shuffleButton = document.querySelector("#shuffle-frame");
    const surpriseImage = document.querySelector("#surprise-image");
    const surpriseCaption = document.querySelector("#surprise-caption");
    const surpriseAlbumLink = document.querySelector("#surprise-album-link");
    let frames = [];
    let currentFrameIndex = 0;
    let nextFrameIndex = 0;
    let nextFrame = null;

    const frameIndex = (index) => (index + frames.length) % frames.length;

    const randomFrameIndex = () => {
        if (frames.length < 2) {
            return 0;
        }
        return (currentFrameIndex + 1 + Math.floor(Math.random() * (frames.length - 1))) % frames.length;
    };

    const preloadFrame = (index) => {
        const safeIndex = frameIndex(index);
        const frame = frames[safeIndex];
        const image = new Image();
        image.decoding = "async";

        nextFrameIndex = safeIndex;
        nextFrame = { frame, image };

        shuffleButton.disabled = true;
        image.onload = () => {
            shuffleButton.disabled = false;
        };
        image.onerror = () => {
            shuffleButton.disabled = false;
        };
        image.src = albumImageSrc(frame.album, frame.src);
    };

    const showSurpriseFrame = (index, preloadedImage) => {
        if (!frames.length || !surpriseImage || !surpriseCaption || !surpriseAlbumLink) {
            return;
        }

        const safeIndex = frameIndex(index);
        const frame = frames[safeIndex];
        currentFrameIndex = safeIndex;
        surpriseImage.src = preloadedImage?.src || albumImageSrc(frame.album, frame.src);
        surpriseImage.alt = frame.label;
        surpriseCaption.textContent = frame.label;
        surpriseAlbumLink.href = `album.html?album=${frame.album.id}`;
    };

    const rebuildFrames = () => {
        frames = (window.portfolioAlbums || []).flatMap((album) =>
            album.images.map((src, index) => ({
                album,
                src,
                label: `${album.title} / frame ${index + 1}`,
            }))
        );
        nextFrame = null;
        if (shuffleButton && frames.length) {
            showSurpriseFrame(Math.floor(Math.random() * frames.length));
            preloadFrame(randomFrameIndex());
        }
    };

    if (shuffleButton) {
        rebuildFrames();
        window.addEventListener("portfolio-albums:updated", rebuildFrames);
        shuffleButton.addEventListener("click", () => {
            if (shuffleButton.disabled || !nextFrame) {
                return;
            }

            showSurpriseFrame(nextFrameIndex, nextFrame.image);
            surpriseImage.animate(
                [
                    { opacity: 0.25, transform: "scale(0.985) rotate(-1deg)" },
                    { opacity: 1, transform: "scale(1) rotate(0deg)" },
                ],
                { duration: 420, easing: "ease-out" }
            );
            preloadFrame(randomFrameIndex());
        });
    }

    const demoModal = document.querySelector("#reefradar-demo");
    const demoTrigger = document.querySelector(".project-demo-trigger");
    const demoCloseButtons = document.querySelectorAll(".demo-close, .demo-backdrop");
    const demoVideo = document.querySelector(".demo-video");
    let activeDemoTrigger = null;

    const openDemo = () => {
        if (!demoModal || !demoTrigger) {
            return;
        }

        activeDemoTrigger = document.activeElement;
        demoModal.hidden = false;
        demoModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        demoTrigger.setAttribute("aria-expanded", "true");
        demoModal.querySelector(".demo-close")?.focus();
        demoVideo?.play().catch(() => {});
    };

    const closeDemo = () => {
        if (!demoModal || !demoTrigger || demoModal.hidden) {
            return;
        }

        demoModal.classList.remove("is-open");
        demoModal.hidden = true;
        document.body.classList.remove("modal-open");
        demoTrigger.setAttribute("aria-expanded", "false");
        if (demoVideo) {
            demoVideo.pause();
            demoVideo.currentTime = 0;
        }
        activeDemoTrigger?.focus();
        activeDemoTrigger = null;
    };

    if (demoModal && demoTrigger) {
        demoTrigger.setAttribute("aria-expanded", "false");
        demoTrigger.addEventListener("click", openDemo);
        demoCloseButtons.forEach((button) => button.addEventListener("click", closeDemo));
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeDemo();
            }
        });
    }
})();
