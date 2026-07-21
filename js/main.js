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

    const albums = window.portfolioAlbums || [];
    const previewSrc = (src) => `img/thumbs/${src.replace(/^img\//, "")}`;
    const albumGrid = document.querySelector("#album-grid");

    if (albumGrid) {
        albumGrid.innerHTML = albums.map((album) => `
            <a class="album-card" href="album.html?album=${album.id}" aria-label="Open ${album.title}">
                <img src="${previewSrc(album.cover)}" alt="${album.title}" loading="lazy">
                <div class="album-info">
                    <span class="album-meta">${album.meta}</span>
                    <h3>${album.title}</h3>
                    <p>${album.description}</p>
                    <span class="album-count">${album.images.length} frames</span>
                </div>
            </a>
        `).join("");
    }

    const shuffleButton = document.querySelector("#shuffle-frame");
    const surpriseImage = document.querySelector("#surprise-image");
    const surpriseCaption = document.querySelector("#surprise-caption");
    const surpriseAlbumLink = document.querySelector("#surprise-album-link");
    const frames = albums.flatMap((album) =>
        album.images.map((src, index) => ({
            album,
            src,
            label: `${album.title} / frame ${index + 1}`,
        }))
    );
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
        image.src = previewSrc(frame.src);
    };

    const showSurpriseFrame = (index, preloadedImage) => {
        if (!frames.length || !surpriseImage || !surpriseCaption || !surpriseAlbumLink) {
            return;
        }

        const safeIndex = frameIndex(index);
        const frame = frames[safeIndex];
        currentFrameIndex = safeIndex;
        surpriseImage.src = preloadedImage?.src || previewSrc(frame.src);
        surpriseImage.alt = frame.label;
        surpriseCaption.textContent = frame.label;
        surpriseAlbumLink.href = `album.html?album=${frame.album.id}`;
    };

    if (shuffleButton && frames.length) {
        showSurpriseFrame(Math.floor(Math.random() * frames.length));
        preloadFrame(randomFrameIndex());
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
