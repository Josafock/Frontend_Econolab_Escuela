import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Econolab · Sistema de laboratorios",
    short_name: "Econolab",
    description: "Gestión de servicios, estudios y resultados del laboratorio Econolab.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#dc2626",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Servicios", url: "/servicios", description: "Consultar servicios y escanear recibos" },
      { name: "Estudios", url: "/estudios", description: "Consultar estudios y escanear sus códigos QR" },
      { name: "Contacto", url: "/contacto", description: "Consultar ubicaciones y teléfonos del laboratorio" },
    ],
  };
}
