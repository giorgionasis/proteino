import { AuthProvider } from "@/components/layout/AuthProvider";

/**
 * Minimal onboarding chrome. No header, no bottom nav, no FAB — the
 * flow owns the full viewport. Matches the (auth) layout shape so the
 * visual transition into onboarding after register/login feels
 * continuous.
 *
 * AuthProvider wraps the flow so client hooks like useGuestGuard +
 * useFollow see the live session. Without it the Zustand auth store
 * stays empty, and any guest-gated action (FollowButton, etc.) fires
 * the sign-in modal even though the user is authenticated — they got
 * onto /onboarding via the server-side gate in `(main)/layout`.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="bg-[#F2F2F7]">
        <div className="max-w-[390px] mx-auto min-h-screen bg-white overflow-y-auto">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
