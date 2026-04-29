import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types";

interface ProfileCardProps {
  user: User;
  isOwn?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
}

export function ProfileCard({ user, isOwn, isFollowing, onFollow }: ProfileCardProps) {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-start gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.display_name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
              {user.display_name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-medium text-gray-900 truncate">{user.display_name}</h1>
            {user.is_verified && <span className="text-success text-sm">✓</span>}
          </div>
          <p className="text-sm text-gray-400">@{user.handle}</p>
          {user.bio && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-base font-medium text-gray-900">{user.suggestion_count}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Προτάσεις</p>
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-coral-600">#{user.level}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Level</p>
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-gray-900">{user.points}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Points</p>
        </div>
      </div>

      {!isOwn && onFollow && (
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          onClick={onFollow}
          className="w-full"
        >
          {isFollowing ? "Ακολουθείς" : "Ακολούθησε"}
        </Button>
      )}
    </div>
  );
}
