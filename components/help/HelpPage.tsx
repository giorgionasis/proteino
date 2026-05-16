"use client";

import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { supportMailto, SUPPORT_EMAIL } from "@/lib/contact";

interface FAQ {
  q: string;
  a: string;
}

interface Section {
  title: string;
  items: FAQ[];
}

const SECTIONS: Section[] = [
  {
    title: "Πρώτα βήματα",
    items: [
      {
        q: "Τι είναι το Proteino;",
        a: "Το Proteino είναι μια πλατφόρμα όπου αληθινοί χρήστες μοιράζονται τις προτάσεις τους για βιβλία, ταινίες, σειρές, συνταγές, εστιατόρια, μπαρ, ξενοδοχεία, θέατρο και εκδηλώσεις. Όλες οι προτάσεις προέρχονται από ανθρώπους που τις έχουν ζήσει — όχι από αλγορίθμους.",
      },
      {
        q: "Πώς δημιουργώ λογαριασμό;",
        a: "Πάτησε «Εγγραφή» από οποιαδήποτε σελίδα. Μπορείς να εγγραφείς με email και κωδικό ή με τον Google λογαριασμό σου. Η δημιουργία λογαριασμού είναι δωρεάν και γίνεται σε λιγότερο από ένα λεπτό.",
      },
      {
        q: "Είναι δωρεάν;",
        a: "Ναι. Όλες οι λειτουργίες — προτάσεις, αναζήτηση, bookmarks, αξιολογήσεις, ακολούθηση χρηστών — είναι δωρεάν.",
      },
    ],
  },
  {
    title: "Προτάσεις",
    items: [
      {
        q: "Πώς κάνω μια πρόταση;",
        a: "Πάτησε το πορτοκαλί κουμπί κάτω δεξιά σε οποιαδήποτε σελίδα. Γράψε ελεύθερα τι σου άρεσε — το Proteíno Intelligence θα αναγνωρίσει αυτόματα το αντικείμενο και την κατηγορία. Πριν τη δημοσίευση θα δεις προεπισκόπηση για επιβεβαίωση.",
      },
      {
        q: "Πώς λειτουργεί το AI κατά την πρόταση;",
        a: "Καθώς γράφεις, το Proteíno Intelligence αναλύει το κείμενό σου σε πραγματικό χρόνο. Αν περιγράφεις ταινία, βιβλίο ή σειρά, αναζητά αυτόματα στις βάσεις TMDB και Google Books και προτείνει αντιστοίχιση. Επίσης σε καθοδηγεί να γράψεις πιο ουσιαστική περιγραφή — πες γιατί σου άρεσε, όχι μόνο τι.",
      },
      {
        q: "Τι γίνεται αν κάτι έχει ήδη προταθεί;",
        a: "Αν το αντικείμενο υπάρχει ήδη, το σύστημα θα σου εμφανίσει σχετική ειδοποίηση και θα σου δώσει επιλογές: να το βαθμολογήσεις, να ακολουθήσεις τον χρήστη που το πρότεινε ή να προτείνεις κάτι άλλο. Καμία προσπάθεια δεν χάνεται.",
      },
      {
        q: "Μπορώ να επεξεργαστώ ή να διαγράψω μια πρότασή μου;",
        a: "Ναι. Από το προφίλ σου → «Οι προτάσεις μου», μπορείς να επεξεργαστείς το κείμενο, την βαθμολογία ή να διαγράψεις τελείως μια πρόταση που έχεις δημοσιεύσει.",
      },
    ],
  },
  {
    title: "Bookmarks & Αξιολογήσεις",
    items: [
      {
        q: "Τι είναι τα Bookmarks (Θέλω να δω / Είδα);",
        a: "Αποθηκεύεις κάτι στη λίστα σου με δύο καταστάσεις: «Θέλω να δω / διαβάσω / πάω» όταν θες να το θυμάσαι για το μέλλον, και «Είδα / Διάβασα / Πήγα» όταν το έχεις ήδη ζήσει. Όταν αξιολογήσεις κάτι, η κατάσταση αλλάζει αυτόματα σε «ολοκληρωμένο».",
      },
      {
        q: "Πώς αξιολογώ μια πρόταση;",
        a: "Στη σελίδα κάθε αντικειμένου υπάρχει η κάρτα αξιολόγησης. Επίλεξε από 1 έως 5 αστέρια. Προαιρετικά μπορείς να γράψεις και σχόλιο για να εξηγήσεις γιατί.",
      },
      {
        q: "Μπορώ να επεξεργαστώ μια αξιολόγηση;",
        a: "Ναι. Επιστρέφοντας στη σελίδα του αντικειμένου, η κάρτα αξιολόγησης θα δείχνει την τρέχουσα βαθμολογία σου με ένα εικονίδιο επεξεργασίας. Πάτα το για να αλλάξεις βαθμολογία ή κείμενο.",
      },
      {
        q: "Πώς λειτουργούν τα βραβεία (badges);",
        a: "Καθώς συνεισφέρεις περισσότερες προτάσεις, ξεκλειδώνεις βραβεία: Verified στις 3 προτάσεις, Έμπειρος στις 10, Expert στις 25, Platinum στις 50. Κάθε ορόσημο σε φέρνει πιο κοντά στην κορυφή της κοινότητας.",
      },
    ],
  },
  {
    title: "Λογαριασμός & Ασφάλεια",
    items: [
      {
        q: "Πώς αλλάζω τον κωδικό μου;",
        a: "Από το προφίλ σου → Ρυθμίσεις → Σύνδεση & Ασφάλεια → Αλλαγή κωδικού. Θα χρειαστείς τον τρέχοντα κωδικό σου για επιβεβαίωση.",
      },
      {
        q: "Πώς αποσυνδέομαι από όλες τις συσκευές;",
        a: "Από το προφίλ σου → Ρυθμίσεις → Σύνδεση & Ασφάλεια → «Αποσύνδεση από όλες τις συσκευές». Όλες οι ενεργές συνεδρίες θα τερματιστούν αμέσως.",
      },
      {
        q: "Πώς ρυθμίζω τις ειδοποιήσεις;",
        a: "Από το προφίλ σου → Ρυθμίσεις → Ειδοποιήσεις. Μπορείς να ενεργοποιείς ή να απενεργοποιείς κάθε τύπο ειδοποίησης ξεχωριστά και να θέτεις «ώρες ησυχίας».",
      },
      {
        q: "Τι κάνετε με τα δεδομένα μου;",
        a: "Τα δεδομένα σου χρησιμοποιούνται μόνο για τη λειτουργία της πλατφόρμας — προτάσεις, ειδοποιήσεις, εξατομικευμένες προτάσεις. Δεν τα πουλάμε ποτέ σε τρίτους. Για περισσότερες λεπτομέρειες δες την Πολιτική Απορρήτου.",
      },
    ],
  },
];

export function HelpPage() {
  const router = useRouter();
  return (
    <div className="pb-24">
      <InnerHeader title="Κέντρο Βοήθειας" onBack={() => router.back()} />

      <div className="px-6 pt-8 pb-2">
        <h1 className="text-[32px] leading-[110%] font-extrabold text-zinc-900">
          Πώς μπορούμε να<br />σε βοηθήσουμε;
        </h1>
        <p className="text-[16px] text-zinc-600 leading-[150%] mt-3 max-w-[340px]">
          Συχνές ερωτήσεις και απαντήσεις. Αν δε βρεις αυτό που ψάχνεις, στείλε μας email.
        </p>
      </div>

      <div className="mt-8 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title} className="px-6">
            <h2 className="text-[14px] font-bold uppercase tracking-[0.12em] text-zinc-500 mb-4">
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.items.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-zinc-200 bg-white overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-3 cursor-pointer px-5 py-4 list-none active:bg-zinc-50 transition-colors">
                    <span className="text-[16px] font-semibold text-zinc-900 leading-[140%]">
                      {item.q}
                    </span>
                    <ChevronIcon className="shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 pt-1 text-[15px] text-zinc-700 leading-[160%]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA — couldn't find your answer */}
      <section className="mx-6 mt-12 p-6 rounded-2xl bg-coral-50" style={{ border: "1px solid #FFE0DA" }}>
        <p className="text-[18px] font-extrabold text-zinc-900 leading-[130%]">
          Δεν βρήκες αυτό που έψαχνες;
        </p>
        <p className="text-[15px] text-zinc-700 leading-[150%] mt-2">
          Στείλε μας email στο <span className="font-semibold">{SUPPORT_EMAIL}</span> και θα σου απαντήσουμε σύντομα.
        </p>
        <a
          href={supportMailto("Ερώτηση από το Κέντρο Βοήθειας")}
          className="mt-4 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-zinc-950 text-white text-[15px] font-bold active:bg-zinc-800 transition-colors"
        >
          Επικοινωνία με Email
        </a>
      </section>
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#71717A"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
