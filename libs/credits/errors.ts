/** Raised when `spend_credits` refuses a debit because the ledger balance is
 *  lower than the requested amount. Callers branch on this to show a top-up
 *  prompt instead of a generic failure. */
export class InsufficientCreditsError extends Error {
  constructor(message = "Not enough credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}
