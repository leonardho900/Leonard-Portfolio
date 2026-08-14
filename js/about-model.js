import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.querySelector("#about-model");

if (container) {
    const modelSrc = container.dataset.modelSrc;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canTrackPointer = window.matchMedia("(pointer: fine)").matches && !reduceMotion;
    const horizontalLimit = THREE.MathUtils.degToRad(10);
    const verticalLimit = THREE.MathUtils.degToRad(4);
    const damping = 0.08;
    const baseRotation = { x: 0, y: 0, z: 0 };
    const targetRotation = { x: baseRotation.x, y: baseRotation.y };

    container.style.position = "relative";
    container.style.width = "100%";
    const isMobile = () => window.matchMedia("(max-width: 720px)").matches;
    container.style.maxWidth = isMobile() ? "440px" : "680px";
    container.style.height = isMobile() ? "312px" : "440px";
    container.style.overflow = "hidden";

    let modelGroup = null;
    let renderer = null;
    let camera = null;
    let frameId = null;
    let isVisible = false;
    let isLoaded = false;

    const scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.22, 5.1);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";

    scene.add(new THREE.HemisphereLight(0xf7efe2, 0x151713, 2.35));

    const keyLight = new THREE.DirectionalLight(0xfff0d8, 2.1);
    keyLight.position.set(2.4, 3.2, 3.4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8ce8d0, 0.78);
    fillLight.position.set(-2.6, 1.5, 2.2);
    scene.add(fillLight);

    const resize = () => {
        container.style.maxWidth = isMobile() ? "440px" : "680px";
        container.style.height = isMobile() ? "312px" : "440px";
        const { width, height } = container.getBoundingClientRect();
        const renderWidth = Math.min(Math.max(width, 1), 900);
        const renderHeight = Math.min(Math.max(height, 1), 700);
        renderer.setSize(renderWidth, renderHeight, false);
        camera.aspect = renderWidth / renderHeight;
        camera.updateProjectionMatrix();
        renderOnce();
    };

    const renderOnce = () => {
        if (renderer && camera) {
            renderer.render(scene, camera);
        }
    };

    const animate = () => {
        frameId = null;
        if (!isVisible || !isLoaded || !modelGroup) {
            return;
        }

        if (!reduceMotion) {
            modelGroup.rotation.y += (targetRotation.y - modelGroup.rotation.y) * damping;
            modelGroup.rotation.x += (targetRotation.x - modelGroup.rotation.x) * damping;
            modelGroup.position.y = -0.08 + Math.sin(performance.now() * 0.0011) * 0.018;
        }

        renderOnce();
        frameId = window.requestAnimationFrame(animate);
    };

    const startLoop = () => {
        if (!frameId && isVisible && isLoaded) {
            frameId = window.requestAnimationFrame(animate);
        }
    };

    const stopLoop = () => {
        if (frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
        }
    };

    if (canTrackPointer) {
        container.addEventListener("pointermove", (event) => {
            const rect = container.getBoundingClientRect();
            const normalizedX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
            const normalizedY = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
            targetRotation.y = baseRotation.y + normalizedX * horizontalLimit;
            targetRotation.x = baseRotation.x + normalizedY * verticalLimit;
            startLoop();
        });

        container.addEventListener("pointerleave", () => {
            targetRotation.y = baseRotation.y;
            targetRotation.x = baseRotation.x;
            startLoop();
        });
    }

    new ResizeObserver(resize).observe(container);

    new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
            startLoop();
        } else {
            stopLoop();
        }
    }, { rootMargin: "160px" }).observe(container);

    new GLTFLoader().load(
        modelSrc,
        (gltf) => {
            modelGroup = new THREE.Group();
            modelGroup.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z);

            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            gltf.scene.position.sub(center);
            modelGroup.add(gltf.scene);
            modelGroup.position.y += 0.08;
            modelGroup.scale.setScalar(1.65 / Math.max(size.y, 1));

            scene.add(modelGroup);
            isLoaded = true;
            resize();
            startLoop();
        },
        undefined,
        () => {
            container.classList.add("is-fallback");
        }
    );
}
