import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { SubmissionAnalysis } from "@/types";

interface PreviewProps {
  analysis: SubmissionAnalysis | null;
  onPublish: () => void;
  onEdit: () => void;
}

export function Preview({ analysis, onPublish, onEdit }: PreviewProps) {
  return (
    <div className="min-h-screen flex flex-col px-4 pt-6 pb-8 gap-5">
      <div className="flex items-center gap-2">
        <Badge variant="success">ENRICHED MATCH</Badge>
      </div>

      {analysis?.title && (
        <div className="space-y-1">
          <p className="text-xl font-medium text-gray-900">{analysis.title}</p>
          {analysis.category && (
            <Badge variant="coral">{analysis.category}</Badge>
          )}
        </div>
      )}

      {/* Star rating — embedded in suggestion */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} className="text-2xl text-gray-300 hover:text-coral-600 transition-colors">
            ★
          </button>
        ))}
      </div>

      <textarea
        placeholder="Η σκέψη σου (προαιρετικά)..."
        rows={3}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-card text-sm placeholder:text-gray-400 outline-none focus:border-coral-600 resize-none"
      />

      <div className="flex gap-3 mt-auto">
        <Button variant="ghost" onClick={onEdit} className="flex-1">
          Επεξεργασία
        </Button>
        <Button onClick={onPublish} className="flex-1" size="lg">
          Δημοσίευση →
        </Button>
      </div>
    </div>
  );
}
