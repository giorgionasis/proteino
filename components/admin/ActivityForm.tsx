"use client";

import { useState } from "react";
import Link from "next/link";

export function ActivityForm() {
  const [isActive, setIsActive] = useState(true);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <Link href="/admin/content/activities" className="text-emerald-600 hover:underline font-medium underline">
          Activities
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">New Activity</span>
      </div>

      <div className="max-w-[700px]">
        {/* Publish */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Publish</label>
          <div className="flex">
            <button
              onClick={() => setIsActive(true)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-l-lg border transition-colors ${
                isActive ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-zinc-500 border-zinc-200"
              }`}
            >
              {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6" fill="currentColor" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /></svg>}
              Active
            </button>
            <button
              onClick={() => setIsActive(false)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-r-lg border-y border-r transition-colors ${
                !isActive ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Name + Category + Type */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Name</label>
            <input
              type="text"
              placeholder="Γεφύρι της Άρτας"
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Category</label>
            <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white">
              <option>Επιλογή Κατηγορίας</option>
              <option>Αθλητικές</option>
              <option>Εκπαιδευτικές</option>
              <option>Ψυχαγωγικές</option>
              <option>Αξιοθέατα</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Type</label>
            <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white">
              <option>Επιλογή Τύπου</option>
            </select>
          </div>
        </div>

        {/* Address + Coordinates */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Address</label>
            <input type="text" placeholder="Enter address" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Latitude</label>
            <input type="text" placeholder="Enter Latitude" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Longitude</label>
            <input type="text" placeholder="Enter Longitude" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
          </div>
          <div className="flex items-end">
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              </svg>
              Drag & Drop on the map
            </button>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="w-full h-[300px] bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400 text-sm mb-6">
          Map placeholder — connect Leaflet/Google Maps
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="px-8 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            Save
          </button>
          <Link
            href="/admin/content/activities"
            className="px-6 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
