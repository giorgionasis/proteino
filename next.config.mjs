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
    ],
  },
};

export default nextConfig;
