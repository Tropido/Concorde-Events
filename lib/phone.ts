/** Digits only, no international prefix, and a bare Tunisian number gets 216: wa.me's format.
 *  Same rule as private.normal_phone. */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  return digits.length === 8 ? `216${digits}` : digits;
}

/** "+216 ** *** 424": enough for staff to recognise it in the history, no more. */
export function maskPhone(phone: string) {
  const d = normalizePhone(phone);
  return `+${d.slice(0, 3)} ** *** ${d.slice(-3)}`;
}

/** "f***@gmail.com". */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}
