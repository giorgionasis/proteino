"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";

export interface RegionRow {
  id:            string;
  name:          string;
  parent_id:     string | null;
  display_order: number;
}

interface Props {
  handle:      string;
  email:       string;
  displayName: string;
  bio:         string;
  avatarUrl:   string;
  gender:      string;
  birthday:    string;
  region:      string;
  /** Structured region selection from migration 028. Empty string = unset. */
  regionId:    string;
  /** Full regions tree (loaded server-side). */
  regions:     RegionRow[];
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
  // Region is now structured (region_id FK). Legacy `region` text is
  // kept around so old admin queries still see something — the API
  // resolves it from region_id at save time.
  const [regionId, setRegionId]       = useState(props.regionId);
  // Avatar upload state — separate save flow from the rest of the form
  // since the avatar persists immediately on upload (it's already live
  // in storage; rolling back via Cancel would orphan a file).
  const [avatarUrl, setAvatarUrl]     = useState(props.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleAvatarUpload(file: File) {
    setError(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Αποτυχία ανεβάσματος εικόνας.");
      } else {
        setAvatarUrl(data.url);
      }
    } catch {
      setError("Αποτυχία σύνδεσης. Δοκίμασε ξανά.");
    } finally {
      setAvatarUploading(false);
    }
  }

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
          region_id:    regionId || null,
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

      {/* Avatar — tap to upload (JPG / PNG / WebP, max 4MB). Uploads
       *  immediately on file pick + persists `users.avatar_url`; the
       *  Cancel button below only reverts the OTHER fields. */}
      <div className="flex flex-col items-center gap-3 pt-10 pb-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="relative w-[120px] h-[120px] rounded-full overflow-hidden border-[3px] border-zinc-50 active:scale-95 transition-transform disabled:opacity-60"
          style={{ boxShadow: "1px 1px 15px 3px rgba(0,0,0,0.15)" }}
          aria-label="Άλλαξε φωτογραφία προφίλ"
        >
          <Image
            src={avatarUrl || "/images/profile-avatar.png"}
            alt="Avatar"
            fill
            className="object-cover"
            unoptimized
          />
          {/* Camera icon overlay — bottom-right, indicates tappability */}
          <span
            className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#FE6F5E", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
          >
            {avatarUploading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin-slow" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleAvatarUpload(f);
            // Reset so re-selecting the SAME file still triggers onChange.
            e.target.value = "";
          }}
        />
        <p className="text-sm font-medium text-zinc-500 text-center px-8">
          {avatarUploading
            ? "Ανέβασμα..."
            : "Πάτα στη φωτογραφία για αλλαγή"}
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
          <RegionPicker
            regionId={regionId}
            setRegionId={setRegionId}
            regions={props.regions}
          />
          <p className="text-[12px] text-zinc-500 mt-1.5 leading-snug">
            Χρησιμοποιείται για να ανεβαίνουν στην αρχή προτάσεις κοντά σου (εστιατόρια, bars, εκδηλώσεις). Δεν είναι φίλτρο — βλέπεις τα πάντα.
          </p>
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

/**
 * Cascading region picker. Reads the regions tree (N-level deep) and
 * renders one native <select> per level. Picking at level i sets the
 * region to that value AND prunes deeper levels until the user dives
 * further. Selection is single — region_id is one specific node, which
 * may be top-level (Αθήνα), intermediate (Βόρεια Προάστια), or leaf
 * (Χαλάνδρι). Soft-sort logic on the server expands selected → all
 * descendants so users get a sensible region match regardless of how
 * specific they picked.
 *
 * Native <select> is intentional — it triggers the OS picker on
 * mobile (cleaner UX than a custom dropdown for a deeply nested list).
 */
function RegionPicker({
  regionId, setRegionId, regions,
}: { regionId: string; setRegionId: (v: string) => void; regions: RegionRow[] }) {
  const byId = useMemo(() => {
    const m = new Map<string, RegionRow>();
    for (const r of regions) m.set(r.id, r);
    return m;
  }, [regions]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, RegionRow[]>();
    for (const r of regions) {
      const key = r.parent_id ?? "__root__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    m.forEach((arr) => arr.sort((a, b) => {
      const o = (a.display_order ?? 0) - (b.display_order ?? 0);
      return o !== 0 ? o : a.name.localeCompare(b.name, "el");
    }));
    return m;
  }, [regions]);

  // Walk from selected up to root: full ancestor path including
  // the current selection (so deeper levels appear automatically).
  const path: string[] = useMemo(() => {
    const out: string[] = [];
    let cur = regionId ? byId.get(regionId) : undefined;
    while (cur) {
      out.unshift(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return out;
  }, [regionId, byId]);

  // Build level descriptors: first is root children. Each ancestor
  // contributes a level for its own children. Stop adding levels when
  // the current selection has no children of its own (it's a leaf).
  const levels: { parentKey: string; selected: string }[] = [];
  levels.push({ parentKey: "__root__", selected: path[0] ?? "" });
  for (let i = 0; i < path.length; i++) {
    const ancestorId = path[i];
    const kids = childrenByParent.get(ancestorId);
    if (!kids || kids.length === 0) break;
    levels.push({ parentKey: ancestorId, selected: path[i + 1] ?? "" });
  }

  function onLevelChange(levelIdx: number, value: string) {
    if (value) {
      setRegionId(value);
    } else {
      const parentSelection = levelIdx === 0 ? "" : path[levelIdx - 1] ?? "";
      setRegionId(parentSelection);
    }
  }

  if (regions.length === 0) {
    return (
      <p className="text-[14px] text-zinc-400 italic">
        Φόρτωση περιοχών...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {levels.map((lvl, i) => {
        const opts = childrenByParent.get(lvl.parentKey) ?? [];
        if (opts.length === 0) return null;
        return (
          <select
            key={`${i}-${lvl.parentKey}`}
            value={lvl.selected}
            onChange={(e) => onLevelChange(i, e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-[15px] text-zinc-800 focus:outline-none focus:border-coral-600 transition-colors"
          >
            <option value="">
              {i === 0 ? "— Διάλεξε περιοχή —" : "— επιλογή —"}
            </option>
            {opts.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        );
      })}
      {regionId && (
        <button
          type="button"
          onClick={() => setRegionId("")}
          className="self-start text-[13px] text-zinc-500 underline active:opacity-70"
        >
          Καθαρισμός
        </button>
      )}
    </div>
  );
}
