"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { AMENITY_ICON_MAP, AMENITY_LABELS } from "@/lib/icons";
import { IconToggleGrid } from "@/components/admin/IconToggleGrid";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ImageGallery, type GalleryImage } from "@/components/admin/ImageGallery";
import { PropertyTypeSelector } from "@/components/detail/PropertyTypeSelector";

export function AdminTab() {
  const sampleAmenities = (Object.keys(AMENITY_ICON_MAP) as Array<keyof typeof AMENITY_ICON_MAP>)
    .slice(0, 6)
    .map((key) => ({
      key,
      icon: AMENITY_ICON_MAP[key],
      label: AMENITY_LABELS[key] ?? String(key),
    }));

  return (
    <>
      <ShowcaseSection
        name="IconToggleGrid"
        filePath="components/admin/IconToggleGrid.tsx"
        description="Visual checkbox grid (icon + label + active=coral border). Used by hotel facilities, recipe nutrition, food amenities admin forms."
        contextLinks={[
          { label: "In an admin form", href: "/admin/suggestions" },
        ]}
      >
        <Variant label="Default — none selected">
          <div className="w-full max-w-[420px]">
            <IconToggleGrid
              options={sampleAmenities}
              value={{}}
              onChange={() => {}}
            />
          </div>
        </Variant>
        <Variant label="Some selected" note="2 toggled on">
          <div className="w-full max-w-[420px]">
            <IconToggleGrid
              options={sampleAmenities}
              value={{ [sampleAmenities[0].key]: true, [sampleAmenities[2].key]: true }}
              onChange={() => {}}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <PropertyTypeSelectorShowcase />
      <ImageUploaderShowcase />
      <ImageGalleryShowcase />
      <LocationPickerShowcase />
    </>
  );
}

function PropertyTypeSelectorShowcase() {
  const [single, setSingle] = useState<string[]>(["apartment"]);
  const [multi, setMulti] = useState<string[]>([]);
  const TYPES = [
    { id: "hotel",     name: "Ξενοδοχείο" },
    { id: "apartment", name: "Διαμέρισμα" },
    { id: "villa",     name: "Βίλα" },
    { id: "camping",   name: "Camping" },
    { id: "house",     name: "Σπίτι" },
  ];
  return (
    <ShowcaseSection
      name="PropertyTypeSelector"
      filePath="components/detail/PropertyTypeSelector.tsx"
      description="Visual checkbox grid for hotel property types (2-col, 165×125 cells). Active = zinc-800 border + checked icon. Used in HotelExtraFields admin form."
      contextLinks={[{ label: "Live (admin · hotel suggestion)", href: "/admin/suggestions" }]}
    >
      <Variant label="Single selected (apartment)">
        <div className="w-[360px]">
          <PropertyTypeSelector types={TYPES.slice(0, 4)} selected={single} onChange={setSingle} />
        </div>
      </Variant>
      <Variant label="Multi-select (none → click to toggle)">
        <div className="w-[360px]">
          <PropertyTypeSelector types={TYPES.slice(0, 4)} selected={multi} onChange={setMulti} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ImageUploaderShowcase() {
  const [empty, setEmpty] = useState("");
  const [filled, setFilled] = useState("https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600");
  return (
    <ShowcaseSection
      name="ImageUploader"
      filePath="components/admin/ImageUploader.tsx"
      description="Drag-drop + click-to-upload + (optional) URL paste. Uploads to Supabase Storage with the given prefix. Returns the public URL via onChange."
      contextLinks={[{ label: "Live (admin · collection editor)", href: "/admin/content/collections" }]}
    >
      <Variant label="Empty (default 'Add image' state)">
        <div className="w-[260px]">
          <ImageUploader prefix="showcase" value={empty} onChange={setEmpty} aspectRatio="4/3" />
        </div>
      </Variant>
      <Variant label="With image (click to replace, ✕ to clear)">
        <div className="w-[260px]">
          <ImageUploader prefix="showcase" value={filled} onChange={setFilled} aspectRatio="4/3" />
        </div>
      </Variant>
      <Variant label="Square aspect + URL paste enabled">
        <div className="w-[200px]">
          <ImageUploader prefix="showcase" value="" onChange={() => {}} aspectRatio="square" allowUrlPaste />
        </div>
      </Variant>
      <Variant label="16:9 aspect">
        <div className="w-[320px]">
          <ImageUploader prefix="showcase" value="" onChange={() => {}} aspectRatio="16/9" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ImageGalleryShowcase() {
  const [tabsImages, setTabsImages] = useState<GalleryImage[]>([
    { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400", tab: "Δωμάτια" },
    { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400", tab: "Δωμάτια" },
    { url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400", tab: "Δωμάτια" },
    { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", tab: "Κοινόχρηστοι" },
    { url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400", tab: "Εξωτερικά" },
  ]);
  const [empty, setEmpty] = useState<GalleryImage[]>([]);
  return (
    <ShowcaseSection
      name="ImageGallery"
      filePath="components/admin/ImageGallery.tsx"
      description="Multi-image editor with tab grouping (e.g. Δωμάτια / Κοινόχρηστοι / Εξωτερικά for hotels). Drag-reorder, alt text, delete. First image in the active tab is the default."
      contextLinks={[{ label: "Live (admin · hotel suggestion · Media)", href: "/admin/suggestions" }]}
    >
      <Variant label="Hotel tabs · 5 images across 3 tabs">
        <div className="w-[640px]">
          <ImageGallery
            prefix="showcase-hotel"
            tabs={["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"]}
            images={tabsImages}
            onChange={setTabsImages}
          />
        </div>
      </Variant>
      <Variant label="Empty state · click 'Add image' to start">
        <div className="w-[640px]">
          <ImageGallery
            prefix="showcase-empty"
            tabs={["Rooms", "Shared", "Outside"]}
            images={empty}
            onChange={setEmpty}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function LocationPickerShowcase() {
  return (
    <ShowcaseSection
      name="LocationPicker (AddressMapSection)"
      filePath="components/admin/SuggestionEditor.tsx (inline, ~line 1977)"
      description="Address input · Lat/Lng inputs · Drag-drop on map · Region/Area selects. Wired in venue extension forms (food/bars/hotels/theater). Currently inline in SuggestionEditor — future work: extract to standalone."
      contextLinks={[
        { label: "Live (admin · food/hotel/bars suggestion)", href: "/admin/suggestions" },
      ]}
    >
      <Variant label="Pending — interactive demo requires SuggestionEditor context">
        <div className="text-xs text-zinc-400 italic text-center max-w-[300px]">
          Live preview στο link πιο πάνω. Extraction σε standalone reusable αν θες, σε επόμενη επανάληψη.
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
