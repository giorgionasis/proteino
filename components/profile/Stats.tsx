import { ACHIEVEMENT_MILESTONES } from "@/constants/config";
import { ProgressBar } from "@/components/ai/ProgressBar";
import type { User } from "@/types";

interface StatsProps {
  user: User;
}

export function Stats({ user }: StatsProps) {
  const next = ACHIEVEMENT_MILESTONES.find((m) => m.count > user.suggestion_count);
  const prev = [...ACHIEVEMENT_MILESTONES].reverse().find((m) => m.count <= user.suggestion_count);
  const progress = next && prev
    ? ((user.suggestion_count - prev.count) / (next.count - prev.count)) * 100
    : 100;

  return (
    <div className="px-4 py-4 space-y-4">
      {next && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Επόμενο badge: {next.badge}</p>
            <p className="text-xs text-coral-600">
              {user.suggestion_count}/{next.count}
            </p>
          </div>
          <ProgressBar progress={progress} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-card p-3 text-center">
          <p className="text-lg font-medium text-gray-900">{user.avg_quality_score?.toFixed(1) ?? "—"}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Quality</p>
        </div>
        <div className="bg-gray-50 rounded-card p-3 text-center">
          <p className="text-lg font-medium text-gray-900">{user.rating_count}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ratings</p>
        </div>
        <div className="bg-gray-50 rounded-card p-3 text-center">
          <p className="text-lg font-medium text-coral-600">Lv.{user.level}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Level</p>
        </div>
      </div>
    </div>
  );
}
