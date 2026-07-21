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

    const showSurpriseFrame = (index) => {
        if (!frames.length || !surpriseImage || !surpriseCaption || !surpriseAlbumLink) {
            return;
        }

        const frame = frames[index % frames.length];
        currentFrameIndex = index % frames.length;
        surpriseImage.src = previewSrc(frame.src);
        surpriseImage.alt = frame.label;
        surpriseCaption.textContent = frame.label;
        surpriseAlbumLink.href = `album.html?album=${frame.album.id}`;
    };

    if (shuffleButton && frames.length) {
        showSurpriseFrame(Math.floor(Math.random() * frames.length));
        shuffleButton.addEventListener("click", () => {
            const nextIndex = (currentFrameIndex + 1 + Math.floor(Math.random() * (frames.length - 1))) % frames.length;
            showSurpriseFrame(nextIndex);
            surpriseImage.animate(
                [
                    { opacity: 0.25, transform: "scale(0.985) rotate(-1deg)" },
                    { opacity: 1, transform: "scale(1) rotate(0deg)" },
                ],
                { duration: 420, easing: "ease-out" }
            );
        });
    }
})();
