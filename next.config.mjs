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

  // Empty Turbopack config silences the "webpack config without turbopack
  // config" warning in Next 16 (Turbopack is now the default bundler).
  // The old webpack dev-cache disable hack was for a webpack-only
  // PackFileCache ENOENT bug — Turbopack uses a different storage model,
  // so the workaround is no longer needed.
  turbopack: {},

  // React Compiler (stable as of 1.0.0). Auto-memoizes components +
  // hooks at build time; removes most of the codebase's hand-rolled
  // useMemo / useCallback / React.memo boilerplate. The compiler is
  // conservative — it bails out on components it can't safely analyze
  // instead of crashing. Enabled as part of session 31's cleanup pass.
  // Promoted from `experimental.reactCompiler` to top-level in Next 16.
  reactCompiler: true,
};

export default nextConfig;
