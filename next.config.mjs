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
      // Google Books covers (book submission enrichment)
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      // Google Places photos (venue submission enrichment — URLs carry
      // the API key as a query param; image pipeline should replace
      // these with Supabase-hosted variants over time)
      { protocol: "https", hostname: "places.googleapis.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      // Unsplash (used in showcase sample data)
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // MapLibre uses Web Workers + has CJS/ESM mixed exports; transpiling it
  // through Next's compiler avoids known bundling issues in App Router.
  transpilePackages: ["maplibre-gl"],

  // Disable webpack's filesystem cache in dev mode. The default
  // PackFileCacheStrategy throws ENOENT unhandledRejection when its
  // `.pack.gz` files go missing mid-process (e.g. after rm -rf .next
  // while the server is running). The unhandled rejection silently
  // kills the client-side chunk emit — server SSR still works so pages
  // return 200, but every static asset 404s. Memory cache is fine for
  // dev (slightly slower first compile, same speed after that).
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
