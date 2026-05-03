const STEPS = [
  {
    n: "1",
    title: "Εγγραφή",
    body: "Ξεκίνα με τη σύνδεση σου. Σε λίγα δευτερόλεπτα θα είσαι έτοιμος.",
  },
  {
    n: "2",
    title: "Δημιουργία Πρότασης",
    body: "Σε 4 εύκολα βήματα η πρότασή σου είναι έτοιμη.",
  },
  {
    n: "3",
    title: "Έλεγχος Πρότασης",
    body: "Διασφαλίζουμε την ποιότητα των προτάσεων για εσένα.",
  },
  {
    n: "4",
    title: "Δημοσίευση Πρότασης",
    body: "Η πρότασή σου σε λίγες ώρες θα είναι online διαθέσιμη για όλους.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="px-6 space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <h2
          className="font-extrabold leading-[110%]"
          style={{ fontSize: 32, color: "#27272A", width: 358 }}
        >
          Μοιράσου τη δική σου πρόταση
        </h2>
        <p
          className="font-medium leading-[140%]"
          style={{ fontSize: 16, color: "#27272A", width: 328 }}
        >
          Κάνε την πρότασή σου σε λιγότερο από 3 λεπτά...
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-16">
        {STEPS.map((step) => (
          <div key={step.n} className="flex items-start gap-5">
            {/* Number circle */}
            <div
              className="shrink-0 w-[45px] h-[45px] rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#3F3F46" }}
            >
              <span className="text-2xl font-bold text-white leading-none">{step.n}</span>
            </div>
            {/* Text */}
            <div className="space-y-4 pt-1.5">
              <h3 className="text-2xl font-bold leading-[120%]" style={{ color: "#27272A" }}>
                {step.title}
              </h3>
              <p
                className="font-medium leading-[130%]"
                style={{ fontSize: 16, color: "#3F3F46", width: 266 }}
              >
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
