"use client";

import { ShowcaseShell } from "@/components/admin/showcase/ShowcaseShell";

import { PrimitivesTab } from "./tabs/PrimitivesTab";
import { FoundationsTab } from "./tabs/FoundationsTab";
import { CardsTab } from "./tabs/CardsTab";
import { DetailModulesTab } from "./tabs/DetailModulesTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { CategoryTab } from "./tabs/CategoryTab";
import { HomeTab } from "./tabs/HomeTab";
import { SubmissionAITab } from "./tabs/SubmissionAITab";
import { RecommendationTab } from "./tabs/RecommendationTab";
import { AuthTab } from "./tabs/AuthTab";
import { LayoutTab } from "./tabs/LayoutTab";
import { ModalTab } from "./tabs/ModalTab";
import { ToastsTab } from "./tabs/ToastsTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { AdminTab } from "./tabs/AdminTab";
import { PatternsTab } from "./tabs/PatternsTab";

export default function ShowcasePage() {
  return (
    <ShowcaseShell>
      {{
        Primitives: <PrimitivesTab />,
        Foundations: <FoundationsTab />,
        Cards: <CardsTab />,
        "Detail modules": <DetailModulesTab />,
        Profile: <ProfileTab />,
        Category: <CategoryTab />,
        Home: <HomeTab />,
        "Submission/AI": <SubmissionAITab />,
        Recommendation: <RecommendationTab />,
        Auth: <AuthTab />,
        Layout: <LayoutTab />,
        Modal: <ModalTab />,
        Toasts: <ToastsTab />,
        Notifications: <NotificationsTab />,
        Admin: <AdminTab />,
        Patterns: <PatternsTab />,
      }}
    </ShowcaseShell>
  );
}
