import { Spinner } from "@/components/ui/Spinner";

export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" variant="coral" />
    </div>
  );
}
