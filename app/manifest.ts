import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes Proteino installable from mobile browsers
 * via "Add to Home Screen". App icon + apple touch icon are generated
 * dynamically by app/icon.tsx and app/apple-icon.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Proteino",
    short_name: "Proteino",
    description:
      "Κοινοτικές προτάσεις για βιβλία, ταινίες, σειρές, συνταγές, φαγητό, μπαρ, ξενοδοχεία, θέατρο και εκδηλώσεις.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FE6F5E",
    lang: "el",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["social", "lifestyle", "food", "entertainment"],
  };
}
