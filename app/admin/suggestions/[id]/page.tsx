import { SuggestionEditor } from "@/components/admin/SuggestionEditor";

export default function SuggestionDetailPage({ params }: { params: { id: string } }) {
  return <SuggestionEditor id={params.id} />;
}
