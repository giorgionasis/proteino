export function AuthDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-1">
      <div className="h-px bg-zinc-200" style={{ width: 160 }} />
      <span className="text-base font-semibold text-zinc-600 shrink-0">ή</span>
      <div className="h-px bg-zinc-200" style={{ width: 160 }} />
    </div>
  );
}
