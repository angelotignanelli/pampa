import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pampa",
    short_name: "Pampa",
    description: "Gestión ganadera: pesajes, alimentación, sanidad y rentabilidad",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#1d9e75",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
