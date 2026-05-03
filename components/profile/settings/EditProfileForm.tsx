"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";

interface Props {
  handle:      string;
  email:       string;
  displayName: string;
  bio:         string;
  avatarUrl:   string;
  gender:      string;
  birthday:    string;
  region:      string;
}

export function EditProfileForm(props: Props) {
  const router = useRouter();
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);
  const [displayName, setDisplayName] = useState(props.displayName);
  const [bio, setBio]                 = useState(props.bio);
  const [gender, setGender]           = useState(props.gender);
  const [birthday, setBirthday]       = useState(props.birthday);
  const [region, setRegion]           = useState(props.region);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          bio:          bio.trim() || null,
          gender:       gender || null,
          birthday:     birthday || null,
          region:       region.trim() || null,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(`Αποτυχία: ${data.error}`);
      } else {
        setSuccess(true);
        setTimeout(() => { window.location.href = `/profile/${props.handle}`; }, 900);
      }
    } catch {
      setSaving(false);
      setError("Αποτυχία σύνδεσης. Δοκίμασε ξανά.");
    }
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
            src={props.avatarUrl || "/images/profile-avatar.png"}
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

      <div className="px-5">
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

        <FieldRow label="Username">
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">@</span>
            <span className="text-[16px] font-medium text-zinc-500">{props.handle}</span>
          </div>
          <span className="text-xs text-zinc-400 mt-1 block">Δεν μπορεί να αλλάξει</span>
        </FieldRow>

        <FieldRow label="Email">
          <span className="text-[16px] font-medium text-zinc-500">{props.email}</span>
        </FieldRow>

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
          <p className="text-[16px] font-bold text-zinc-700 mb-4">Φύλο</p>
          <div className="flex items-center gap-7">
            {(["male", "female", "other"] as const).map(g => {
              const label  = g === "male" ? "Άνδρας" : g === "female" ? "Γυναίκα" : "Άλλο";
              const active = gender === g;
              return (
                <button key={g} onClick={() => setGender(g)} className="flex items-center gap-2 active:opacity-70 transition-opacity">
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: active ? "#FE6F5E" : "#A1A1AA" }}>
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[#FE6F5E]" />}
                  </span>
                  <span className="text-[16px] text-zinc-800">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <FieldRow label="Ημερομηνία Γέννησης">
          <input
            type="date"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            className="text-[16px] font-medium text-zinc-800 bg-transparent outline-none"
          />
        </FieldRow>

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

        {error   && <p className="text-sm font-semibold text-red-500 text-center py-4">{error}</p>}
        {success && <p className="text-sm font-semibold text-green-600 text-center py-4">Αποθηκεύτηκε!</p>}

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
      <p className="text-[16px] font-bold text-zinc-700">{label}</p>
      {children}
    </div>
  );
}
