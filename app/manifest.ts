import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IFA Medical Consult",
    short_name: "IFA Medical",
    description: "Portal Kolaborasi Klinis Internal Ifa Beauty",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf2f8",
    theme_color: "#be185d",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
