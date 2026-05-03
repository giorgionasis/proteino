"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";

/* ── Mock data ───────────────────────────────────────────── */

const MOCK_FOLLOWERS = [
  { id: "1",  name: "George Nasis",  handle: "gnasis",    count: 12, isFollowing: true,  avatarColor: "#7C3AED" },
  { id: "2",  name: "Maria Κ.",      handle: "mariak",    count: 8,  isFollowing: false, avatarColor: "#0891B2" },
  { id: "3",  name: "Νίκος Π.",      handle: "nikosp",    count: 23, isFollowing: true,  avatarColor: "#059669" },
  { id: "4",  name: "Ελένη Β.",      handle: "elenav",    count: 5,  isFollowing: false, avatarColor: "#DC2626" },
  { id: "5",  name: "Δήμητρα Κ.",    handle: "dimk",      count: 17, isFollowing: true,  avatarColor: "#D97706" },
  { id: "6",  name: "Αλέξης Τ.",     handle: "alexist",   count: 3,  isFollowing: false, avatarColor: "#BE185D" },
  { id: "7",  name: "Κατερίνα Μ.",   handle: "katerina",  count: 41, isFollowing: true,  avatarColor: "#1D4ED8" },
];

const MOCK_FOLLOWING = [
  { id: "10", name: "Σταυρούλα",    handle: "stavroula", count: 34, avatarColor: "#BE185D" },
  { id: "11", name: "Κώστας Μ.",    handle: "kostasm",   count: 12, avatarColor: "#7C3AED" },
  { id: "12", name: "Αντώνης Λ.",   handle: "antonisl",  count: 9,  avatarColor: "#0891B2" },
];

/* ── Props ───────────────────────────────────────────────── */

interface Props {
  initialTab?: "followers" | "following";
  onClose: () => void;
}

/* ── Component ───────────────────────────────────────────── */

export function FollowersPopupCentered({ initialTab = "followers", onClose }: Props) {
  const [activeTab, setActiveTab]       = useState<"followers" | "following">(initialTab);
  const [searchQuery, setSearchQuery]   = useState("");
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(
    Object.fromEntries(MOCK_FOLLOWERS.map((f) => [f.id, f.isFollowing]))
  );

  const toggleFollow = (id: string) =>
    setFollowStates((prev) => ({ ...prev, [id]: !prev[id] }));

  const filteredFollowers = MOCK_FOLLOWERS.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFollowing = MOCK_FOLLOWING.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.40)" }}
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full bg-white flex flex-col"
        style={{ borderRadius: "10px 10px 0 0", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Tab bar ── */}
        <div className="relative flex items-end px-6 h-16">
          <div className="flex gap-6 pb-0">
            <button
              onClick={() => setActiveTab("followers")}
              className="relative pb-[14px] text-sm font-semibold leading-none"
              style={{ color: activeTab === "followers" ? "#27272A" : "#71717A" }}
            >
              59 Ακόλουθοι
              {activeTab === "followers" && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ backgroundColor: "#27272A" }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className="relative pb-[14px] text-sm font-semibold leading-none"
              style={{ color: activeTab === "following" ? "#27272A" : "#71717A" }}
            >
              17 Ακολουθείς
              {activeTab === "following" && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ backgroundColor: "#27272A" }}
                />
              )}
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#F4F4F5" }}
          >
            <X size={16} color="#52525B" />
          </button>

          {/* Bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: "#F2F2F7" }} />
        </div>

        {/* ── Search bar ── */}
        <div className="px-6 pt-4 pb-2">
          <div
            className="flex items-center gap-2 px-4 h-10 rounded-full"
            style={{ backgroundColor: "#F2F2F7" }}
          >
            <Search size={16} color="#A1A1AA" strokeWidth={2} className="shrink-0" />
            <input
              type="text"
              placeholder="Αναζήτηση"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-zinc-400 placeholder:text-zinc-400"
              style={{ fontSize: 16, fontWeight: 600 }}
            />
          </div>
        </div>

        {/* ── List ── */}
        <div className="overflow-y-auto flex-1 px-6 pb-10">
          {activeTab === "followers" && (
            <>
              {filteredFollowers.map((user) => (
                <div key={user.id}>
                  <div className="flex items-center justify-between" style={{ paddingTop: 14, paddingBottom: 14 }}>
                    {/* Left: avatar + info */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      />
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: "#18181B", lineHeight: "20px" }}>
                          {user.name}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#52525B", marginTop: 2 }}>
                          {user.count} προτάσεις
                        </p>
                      </div>
                    </div>

                    {/* Right: follow button */}
                    {followStates[user.id] ? (
                      <button
                        onClick={() => toggleFollow(user.id)}
                        className="flex items-center justify-center h-8 rounded-[20px]"
                        style={{
                          backgroundColor: "#E5FFF9",
                          color: "#033C2E",
                          fontSize: 14,
                          fontWeight: 600,
                          minWidth: 129,
                          paddingLeft: 16,
                          paddingRight: 16,
                        }}
                      >
                        Ακολουθείς
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleFollow(user.id)}
                        className="flex items-center justify-center h-8 rounded-[20px] border"
                        style={{
                          borderColor: "#71717A",
                          color: "#52525B",
                          fontSize: 14,
                          fontWeight: 600,
                          minWidth: 129,
                          paddingLeft: 16,
                          paddingRight: 16,
                        }}
                      >
                        Ακολούθησε
                      </button>
                    )}
                  </div>
                  <div className="h-px" style={{ backgroundColor: "#F2F2F7" }} />
                </div>
              ))}

              {filteredFollowers.length === 0 && (
                <p className="text-center text-sm text-zinc-400 py-8">Δεν βρέθηκαν αποτελέσματα</p>
              )}
            </>
          )}

          {activeTab === "following" && (
            <>
              {filteredFollowing.map((user) => (
                <div key={user.id}>
                  <div className="flex items-center justify-between" style={{ paddingTop: 14, paddingBottom: 14 }}>
                    {/* Left: avatar + info */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      />
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: "#18181B", lineHeight: "20px" }}>
                          {user.name}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#52525B", marginTop: 2 }}>
                          {user.count} προτάσεις
                        </p>
                      </div>
                    </div>

                    {/* Right: remove */}
                    <button
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#52525B",
                        textDecoration: "underline",
                        textDecorationColor: "#52525B",
                        width: 68,
                        textAlign: "center",
                      }}
                    >
                      Αφαίρεση
                    </button>
                  </div>
                  <div className="h-px" style={{ backgroundColor: "#F2F2F7" }} />
                </div>
              ))}

              {filteredFollowing.length === 0 && (
                <p className="text-center text-sm text-zinc-400 py-8">Δεν βρέθηκαν αποτελέσματα</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
