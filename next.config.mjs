/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // Google OAuth avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Google OAuth avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Facebook OAuth avatars
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "*.facebook.com" },
      // TMDB poster/backdrop images (saved during AI submission match)
      { protocol: "https", hostname: "image.tmdb.org" },
      // Unsplash (used in showcase sample data)
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // MapLibre uses Web Workers + has CJS/ESM mixed exports; transpiling it
  // through Next's compiler avoids known bundling issues in App Router.
  transpilePackages: ["maplibre-gl"],
};

export default nextConfig;
