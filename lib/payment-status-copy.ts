/** Bank transfer waiting for admin review */
export const ADMIN_PENDING_LABEL = "Pending admin approval";
export const ADMIN_PENDING_DETAIL =
  "We received your bank transfer proof and will unlock this booklet once verified.";

/** OasisPay / Paystack paid but unlock not reflected yet */
export const CONFIRMING_PAYMENT_LABEL = "Confirming payment";
export const CONFIRMING_PAYMENT_DETAIL =
  "Your payment was received. Pull down to refresh — access usually unlocks within a minute.";

export function isLikelyPaymentProcessingError(message: string) {
  return /pending|not found|verification failed|processing|network|timeout/i.test(message);
}
