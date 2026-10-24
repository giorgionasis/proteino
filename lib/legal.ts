import { SUPPORT_EMAIL } from "@/lib/contact";

/**
 * Who runs Proteino — shown on /privacy (data controller) and /terms.
 *
 * TODO(owner): fill `legalName` + `address` (and `vatId` if a business)
 * before launch. GDPR Art. 13 requires the controller's identity and
 * contact details; the pages fall back to "Proteino" + the support email
 * while these are empty.
 */
export const OPERATOR = {
  legalName: "",
  address:   "",
  vatId:     "",
  email:     SUPPORT_EMAIL,
};

export const LEGAL_LAST_UPDATED = "Οκτώβριος 2026";
