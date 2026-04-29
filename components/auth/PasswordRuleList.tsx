import { cn } from "@/lib/utils/cn";

export interface PasswordRules {
  length:    boolean;   // >= 8 chars
  uppercase: boolean;   // at least one uppercase
  number:    boolean;   // at least one digit
}

export function checkPasswordRules(password: string): PasswordRules {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  };
}

export function allRulesMet(rules: PasswordRules): boolean {
  return rules.length && rules.uppercase && rules.number;
}

const RULE_LABELS: Record<keyof PasswordRules, string> = {
  length:    "Τουλάχιστον 8 χαρακτήρες",
  uppercase: "Ένα κεφαλαίο γράμμα (A–Z)",
  number:    "Έναν αριθμό (0–9)",
};

// ── Component ──────────────────────────────────────────────────
interface PasswordRuleListProps {
  rules:   PasswordRules;
  visible: boolean;
}

export function PasswordRuleList({ rules, visible }: PasswordRuleListProps) {
  if (!visible) return null;

  return (
    <div
      className="mt-2 space-y-1.5 animate-fade-in"
      aria-live="polite"
      aria-label="Κανόνες κωδικού"
    >
      {(Object.entries(rules) as [keyof PasswordRules, boolean][]).map(([key, met]) => (
        <div key={key} className="flex items-center gap-2">
          {/* Indicator dot/check */}
          <span
            aria-hidden
            className={cn(
              "w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
              met
                ? "bg-success text-white"
                : "bg-gray-100 text-gray-400",
            )}
          >
            {met ? (
              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <span className="w-1 h-1 rounded-full bg-gray-400 block" />
            )}
          </span>

          <span className={cn(
            "text-xs transition-colors duration-200",
            met ? "text-success" : "text-gray-400",
          )}>
            {RULE_LABELS[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
