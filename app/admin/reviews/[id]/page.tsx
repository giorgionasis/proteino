import { ReviewEditor } from "@/components/admin/ReviewEditor";

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  return <ReviewEditor id={params.id} />;
}
