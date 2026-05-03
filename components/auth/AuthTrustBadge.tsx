function ShieldCheckIcon() {
  return (
    <svg width="28" height="32" viewBox="0 0 28 32" fill="none" aria-hidden>
      <path
        d="M14 1L2 6v8c0 7.5 5.1 14.5 12 16.3C20.9 28.5 26 21.5 26 14V6L14 1z"
        fill="#019371"
        fillOpacity="0.15"
      />
      <path
        d="M14 1L2 6v8c0 7.5 5.1 14.5 12 16.3C20.9 28.5 26 21.5 26 14V6L14 1z"
        stroke="#019371"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 16l3.5 3.5L19 12"
        stroke="#019371"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthTrustBadge() {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
        padding: 12,
        width: "100%",
      }}
    >
      <ShieldCheckIcon />
      <p style={{ fontSize: 14, fontWeight: 600, color: "#3F3F46", lineHeight: "130%" }}>
        Εγγυόμαστε για τις καλύτερες προτάσεις
      </p>
    </div>
  );
}
