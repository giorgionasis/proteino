import { Icon } from "@/components/ui/Icon";
import { OutlinedPill } from "@/components/ui/OutlinedPill";

interface BookingAvailabilityCardProps {
  /** Title used for the search query passed to Booking.com. */
  itemTitle: string;
  /** Override the default search URL if needed. */
  href?: string;
}

/**
 * Lavender CTA card prompting the user to check availability on Booking.com.
 * Hotels-only. Affiliate placement — drives off-platform conversion.
 *
 * Layout: copy → Booking wordmark → outlined pill button (full width).
 */
export function BookingAvailabilityCard({ itemTitle, href }: BookingAvailabilityCardProps) {
  const url = href ?? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(itemTitle)}`;
  return (
    <div className="rounded-[16px] p-7 flex flex-col gap-5" style={{ backgroundColor: "#EFF1FA" }}>
      <p className="text-[15px] font-medium text-zinc-800 leading-[150%]">
        Μπορείς να δεις περισσότερα εύκολα και γρήγορα στο
      </p>
      <Icon name="booking-wordmark" width={146} height={28} alt="Booking.com" />
      <OutlinedPill href={url} width="full" size="lg">
        Έλεγχος Διαθεσιμότητας
      </OutlinedPill>
    </div>
  );
}
