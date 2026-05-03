export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F2F2F7]">
      <div className="max-w-[390px] mx-auto min-h-screen bg-white overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
