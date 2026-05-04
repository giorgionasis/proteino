import { redirect } from "next/navigation";

// Replaced by /admin/content/activities/taxonomy (full CRUD).
export default function NewCategoryTypePage() {
  redirect("/admin/content/activities/taxonomy");
}
