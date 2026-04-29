import Image from "next/image";
import Link from "next/link";
import type { User } from "@/types";

interface LeaderboardEntry {
  rank: number;
  user: Pick<User, "id" | "handle" | "display_name" | "avatar_url" | "suggestion_count" | "level">;
  score: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="space-y-1 px-4">
      {entries.map(({ rank, user, score }) => (
        <Link
          key={user.id}
          href={`/profile/${user.handle}`}
          className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
        >
          <span className="w-7 text-sm font-medium text-gray-400 text-center">{rank}</span>
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt={user.display_name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                {user.display_name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.display_name}</p>
            <p className="text-xs text-gray-400">@{user.handle}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-coral-600">{score}</p>
            <p className="text-[10px] text-gray-400">Lv.{user.level}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
