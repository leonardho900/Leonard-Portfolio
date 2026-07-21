const japanImages = [
    ...Array.from({ length: 14 }, (_, index) => `img/japan23/${index + 1}.jpg`),
    ...Array.from({ length: 7 }, (_, index) => `img/japan23/${index + 15}.JPG`),
    ...Array.from({ length: 5 }, (_, index) => `img/japan23/${index + 22}.jpg`),
];

const numberedImages = (folder, count, extension = "jpg") =>
    Array.from({ length: count }, (_, index) => `img/${folder}/${index + 1}.${extension}`);

window.portfolioAlbums = [
    {
        id: "japan23",
        title: "Japan 2023",
        meta: "Sendai / Yamagata / Nikko / Tokyo",
        description: "Shot on FND NIJI cam.",
        cover: "img/japan23.JPG",
        camera: "FND NIJI cam",
        film: "Kodak Gold 200 / Fujifilm Superia 400 / Kodak Ultramax 400",
        images: japanImages,
    },
    {
        id: "viet23",
        title: "Vietnam 2023",
        meta: "Markets / streets / coastal light",
        description: "Film gallery.",
        cover: "img/vietnam23.JPG",
        camera: "35mm film camera",
        film: "Color negative film",
        images: numberedImages("vietnam23", 25, "JPG"),
    },
    {
        id: "ej23",
        title: "East Java 2023",
        meta: "Volcanic landscapes / road days",
        description: "Film gallery.",
        cover: "img/ej23.jpg",
        camera: "35mm film camera",
        film: "Color negative film",
        images: numberedImages("eastjava23", 27),
    },
    {
        id: "greece23",
        title: "Greece 2023",
        meta: "Sea / stone / summer contrast",
        description: "Film gallery.",
        cover: "img/greece23.jpg",
        camera: "35mm film camera",
        film: "Color negative film",
        images: numberedImages("greece23", 25),
    },
    {
        id: "oki24",
        title: "Okinawa 2024",
        meta: "Island roads / sea air",
        description: "Film gallery.",
        cover: "img/oki24.jpg",
        camera: "35mm film camera",
        film: "Color negative film",
        images: numberedImages("okinawa24", 28),
    },
    {
        id: "bali24",
        title: "Bali 2024",
        meta: "Warm weather / daily rituals",
        description: "Film gallery.",
        cover: "img/bali24.jpg",
        camera: "35mm film camera",
        film: "Color negative film",
        images: numberedImages("bali24", 25),
    },
];
