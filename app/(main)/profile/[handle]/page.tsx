import type { Metadata } from "next";

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `@${params.handle} — Proteino` };
}

export default function ProfilePage({ params }: Props) {
  return (
    <main className="pb-24">
      {/* ProfileCard */}
      {/* Stats */}
      {/* User's suggestions */}
    </main>
  );
}
