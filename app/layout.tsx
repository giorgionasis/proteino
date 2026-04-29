import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proteino",
  description: "Community-driven recommendations for books, movies, food, and more.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#D85A30",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body className="bg-[#F2F2F7]">
        <div className="max-w-[390px] mx-auto min-h-screen bg-white overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
