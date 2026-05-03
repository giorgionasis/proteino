"use client";

import { useState } from "react";
import Link from "next/link";

interface ReportRow {
  reason: string;
  description: string;
  reportedBy: string;
  date: string;
  resolution: boolean | null;
}

const MOCK_REPORTS: ReportRow[] = [
  { reason: "Προσβλητική", description: "Η αξιολόγηση έχει προσβλητικό χαρακτήρα και χρησιμοποιεί αρχηγία γλώσσα και δόρυσες εκφ...", reportedBy: "Franki junior", date: "5 ώρες πριν", resolution: true },
  { reason: "Απάτη", description: "Το σχόλιο προσπαθεί να αποπροσανατολίζει τον κόσμο και αναφέρει ψεύτικα γεγονότα κ...", reportedBy: "George Nasis", date: "5 ώρες πριν", resolution: false },
];

export function ReviewEditor({ id }: { id: string }) {
  const [isActive, setIsActive] = useState(true);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin/reviews" className="text-emerald-600 hover:underline font-medium underline">
          Reviews
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">Edit Review</span>
      </div>

      <h2 className="text-xl font-bold text-zinc-800 mb-4">Inception</h2>

      {/* Publish */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Publish</label>
        <div className="flex">
          <button
            onClick={() => setIsActive(true)}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-l-lg border transition-colors ${
              isActive ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-zinc-500 border-zinc-200"
            }`}
          >
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

      {/* Reviewer + Created */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Reviewer</label>
          <select className="px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white">
            <option>George Nasis</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Created</label>
          <div className="flex items-center gap-2 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600">
            11:30:45  01/11/2024
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Review content */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-zinc-700">2</span>
          <span className="text-amber-500">★</span>
          <span className="text-sm text-zinc-500">Review Content</span>
          <span className="text-sm text-zinc-400 ml-auto">0 👍 12 👎</span>
        </div>
        <div className="p-4 border border-zinc-200 rounded-lg bg-zinc-50">
          <p className="text-sm text-zinc-700 leading-relaxed">
            Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή! Η πρωταγωνίστρια, Jenny Ortega, παίζει καταπληκτικά και η όλη υπόθεση σε κρατάει πάρα πολύ. Τη συστήνω σε όλους! Τη συστήνω σε όλους! Τη συστήνω σε όλους! Τη συστήνω σε όλους! η συστήνω σε όλους! Τη συστήνω σε όλους Τη συστήνω σε όλους! Τη συστήνω σε όλους!
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-10">
        <button className="px-8 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
          Save
        </button>
        <Link
          href="/admin/reviews"
          className="px-6 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Reports section */}
      <div>
        <h3 className="text-lg font-bold text-zinc-800 mb-4">Reports</h3>
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reported By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Resolution</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_REPORTS.map((r, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-800">{r.reason}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 max-w-[300px]">
                    <p className="line-clamp-2">{r.description}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{r.reportedBy}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{r.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded text-xs font-bold ${r.resolution ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {r.resolution ? "True" : "False"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
