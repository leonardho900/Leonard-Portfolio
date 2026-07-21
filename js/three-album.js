import * as THREE from "three";

const container = document.querySelector("#album-three");
const params = new URLSearchParams(window.location.search);
const albumId = params.get("album") || "japan23";
const album = (window.portfolioAlbums || []).find((item) => item.id === albumId);

if (container && album) {
    window.albumThreeState = { frames: 0, rotationY: 0 };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.25, 8.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.9));

    const keyLight = new THREE.DirectionalLight(0xffefd0, 2.2);
    keyLight.position.set(2.5, 4, 4);
    scene.add(keyLight);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new THREE.TextureLoader();
    const frameGeometry = new THREE.PlaneGeometry(2.35, 1.58);
    const backingGeometry = new THREE.PlaneGeometry(2.55, 1.78);
    const backingMaterial = new THREE.MeshStandardMaterial({
        color: 0xf4f0e8,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });

    album.images.slice(0, 7).forEach((src, index, list) => {
        const angle = (index / list.length) * Math.PI * 2;
        const radius = 3.35;
        const holder = new THREE.Group();
        holder.position.set(Math.cos(angle) * radius, Math.sin(index * 0.8) * 0.38, Math.sin(angle) * radius);
        holder.rotation.y = -angle + Math.PI / 2;
        holder.rotation.z = Math.sin(index) * 0.08;

        const backing = new THREE.Mesh(backingGeometry, backingMaterial);
        backing.position.z = -0.035;
        holder.add(backing);

        const texture = loader.load(src);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const imageMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.56,
            metalness: 0,
            side: THREE.DoubleSide,
        });
        const image = new THREE.Mesh(frameGeometry, imageMaterial);
        holder.add(image);
        group.add(holder);
    });

    const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        group.scale.setScalar(width < 700 ? 0.82 : 1);
        group.position.x = width < 700 ? 1.25 : 1.55;
        group.position.y = width < 700 ? -0.15 : 0;
    };

    const renderFrame = (time) => {
        group.rotation.y = time * 0.00042;
        group.rotation.x = Math.sin(time * 0.00055) * 0.045;
        window.albumThreeState.frames += 1;
        window.albumThreeState.rotationY = group.rotation.y;
        renderer.render(scene, camera);
    };

    const animate = (time) => {
        renderFrame(time);
        window.requestAnimationFrame(animate);
    };

    resize();
    renderFrame(0);
    window.requestAnimationFrame(animate);
    window.setInterval(() => renderFrame(Date.now()), 1000 / 30);
    window.addEventListener("resize", resize);
}
