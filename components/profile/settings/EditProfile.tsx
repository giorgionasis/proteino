"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { InnerHeader } from "@/components/layout/Header";

export function EditProfile() {
  const router = useRouter();
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  const [handle, setHandle]           = useState("");
  const [email, setEmail]             = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio]                 = useState("");
  const [avatarUrl, setAvatarUrl]     = useState("");
  const [gender, setGender]           = useState<"male" | "female" | "other" | "">("");
  const [birthday, setBirthday]       = useState("");
  const [region, setRegion]           = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); router.push("/login"); return; }

        setEmail(session.user.email ?? "");
        // Fallback avatar from OAuth metadata
        const meta = session.user.user_metadata ?? {};
        setAvatarUrl(meta.avatar_url ?? meta.picture ?? "");

        const { data } = await supabase
          .from("users")
          .select("handle, display_name, bio, avatar_url, gender, birthday, region")
          .eq("id", session.user.id)
          .single();

        const row = data as Record<string, string | null> | null;
        if (row) {
          setHandle(row.handle ?? "");
          setDisplayName(row.display_name ?? "");
          setBio(row.bio ?? "");
          if (row.avatar_url) setAvatarUrl(row.avatar_url);
          setGender((row.gender as typeof gender) ?? "");
          setBirthday(row.birthday ?? "");
          setRegion(row.region ?? "");
        }
      } catch (err) {
        console.error("[EditProfile] load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setSaving(false); return; }

    const { error: updateErr } = await (supabase
      .from("users") as any)
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        gender: gender || null,
        birthday: birthday || null,
        region: region.trim() || null,
      })
      .eq("id", session.user.id);

    setSaving(false);
    if (updateErr) {
      setError("Αποτυχία αποθήκευσης. Δοκίμασε ξανά.");
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/profile/${handle}`), 1000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-[#FE6F5E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-16">
      <InnerHeader title="Επεξεργασία Προφίλ" onBack={() => router.back()} />

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-10 pb-8">
        <div
          className="relative w-[120px] h-[120px] rounded-full overflow-hidden border-[3px] border-zinc-50"
          style={{ boxShadow: "1px 1px 15px 3px rgba(0,0,0,0.15)" }}
        >
          <Image
            src={avatarUrl || "/images/profile-avatar.png"}
            alt="Avatar"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <p className="text-sm font-medium text-zinc-500 text-center px-8">
          Η φωτογραφία ενημερώνεται μέσω του Google λογαριασμού σου
        </p>
      </div>

      <div className="px-5 space-y-0">

        {/* Display name */}
        <FieldRow label="Εμφανιζόμενο Όνομα">
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder="Το όνομά σου"
            className="w-full text-[16px] font-medium text-zinc-800 bg-transparent outline-none placeholder:text-zinc-400"
          />
        </FieldRow>

        {/* Handle (read-only) */}
        <FieldRow label="Username">
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 font-medium">@</span>
            <span className="text-[16px] font-medium text-zinc-500">{handle}</span>
          </div>
          <span className="text-xs text-zinc-400 mt-1">Δεν μπορεί να αλλάξει</span>
        </FieldRow>

        {/* Email (read-only) */}
        <FieldRow label="Email">
          <span className="text-[16px] font-medium text-zinc-500">{email}</span>
        </FieldRow>

        {/* Bio */}
        <FieldRow label="Bio">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Πες μας λίγα λόγια για εσένα..."
            className="w-full text-[16px] font-medium text-zinc-800 bg-transparent outline-none resize-none placeholder:text-zinc-400"
          />
          <span className="text-xs text-zinc-400">{bio.length}/200</span>
        </FieldRow>

        {/* Gender */}
        <div className="py-5 border-b border-zinc-200">
          <p className="text-[16px] font-bold text-zinc-700 leading-[24px] mb-4">Φύλο</p>
          <div className="flex items-center gap-7">
            {(["male", "female", "other"] as const).map(g => {
              const label  = g === "male" ? "Άνδρας" : g === "female" ? "Γυναίκα" : "Άλλο";
              const active = gender === g;
              return (
                <button key={g} onClick={() => setGender(g)} className="flex items-center gap-2 active:opacity-70 transition-opacity">
                  <span
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: active ? "#FE6F5E" : "#A1A1AA" }}
                  >
                    {active && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FE6F5E" }} />}
                  </span>
                  <span className="text-[16px] text-zinc-800">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Birthday */}
        <FieldRow label="Ημερομηνία Γέννησης">
          <input
            type="date"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            className="text-[16px] font-medium text-zinc-800 bg-transparent outline-none"
          />
        </FieldRow>

        {/* Region */}
        <FieldRow label="Περιοχή">
          <input
            type="text"
            value={region}
            onChange={e => setRegion(e.target.value)}
            maxLength={60}
            placeholder="π.χ. Αθήνα"
            className="w-full text-[16px] font-medium text-zinc-800 bg-transparent outline-none placeholder:text-zinc-400"
          />
        </FieldRow>

        {error && (
          <p className="text-sm font-semibold text-red-500 text-center pt-4">{error}</p>
        )}
        {success && (
          <p className="text-sm font-semibold text-green-600 text-center pt-4">Αποθηκεύτηκε!</p>
        )}

        {/* Save */}
        <div className="pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center rounded-xl py-4 text-base font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "#FE6F5E" }}
          >
            {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-5 border-b border-zinc-200 space-y-1.5">
      <p className="text-[16px] font-bold text-zinc-700 leading-[24px]">{label}</p>
      {children}
    </div>
  );
}
