interface BadgeDisplayProps {
  badges: BadgeInfo[];
  className?: string;
}

export interface BadgeInfo {
  type: "verified" | "expert" | "gold" | "platinum";
  earned: boolean;
}

const BADGE_CONFIG: Record<string, { label: string; gradient: string; iconGradient: string }> = {
  verified: {
    label: "Verified",
    gradient: "linear-gradient(32deg, rgba(0,181,139,1) 9%, rgba(92,237,203,0.56) 78%, rgba(92,237,203,0.1) 100%)",
    iconGradient: "linear-gradient(33deg, rgba(0,181,139,1) 0%, rgba(92,237,203,0.1) 100%)",
  },
  expert: {
    label: "Expert",
    gradient: "linear-gradient(32deg, rgba(1,113,199,1) 9%, rgba(152,210,254,0.56) 78%, rgba(152,210,254,0.1) 100%)",
    iconGradient: "linear-gradient(33deg, rgba(1,113,199,1) 0%, rgba(1,113,199,0.1) 100%)",
  },
  gold: {
    label: "Gold",
    gradient: "linear-gradient(32deg, rgba(255,191,120,1) 9%, rgba(255,238,169,0.56) 78%, rgba(254,255,210,0.1) 100%)",
    iconGradient: "linear-gradient(33deg, rgba(255,191,120,1) 0%, rgba(255,191,120,0.1) 100%)",
  },
  platinum: {
    label: "Platinum",
    gradient: "linear-gradient(32deg, rgba(168,134,181,1) 9%, rgba(240,200,255,0.56) 78%, rgba(240,200,255,0.56) 100%)",
    iconGradient: "linear-gradient(33deg, rgba(168,134,181,1) 0%, rgba(240,200,255,0.1) 100%)",
  },
};

export function BadgeDisplay({ badges, className }: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="text-[26px] font-bold text-[#111111] leading-[130%]">Badges</h3>
      <div className="flex items-center gap-[37px] mt-6">
        {badges.map((b) => {
          const cfg = BADGE_CONFIG[b.type];
          return (
            <div key={b.type} className="flex flex-col items-center gap-3">
              <div
                className="w-[45px] h-[50px] rounded-full flex items-center justify-center"
                style={{
                  background: cfg.gradient,
                  opacity: b.earned ? 1 : 0.3,
                }}
              >
                <div
                  className="w-[20px] h-[20px] rounded-full"
                  style={{ background: cfg.iconGradient }}
                />
              </div>
              <span
                className="text-sm text-black leading-[130%]"
                style={{ opacity: b.earned ? 1 : 0.4 }}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
