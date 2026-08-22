// Batch is derived from the SESSION name so any newly added session
// automatically maps to the next batch — no manual config needed.
//
// Rule: session starting year 2023 ("23-24") = Batch 13, and every
// following year bumps the batch by one:
//   "23-24" → 13, "24-25" → 14, "25-26" → 15 …
//
// Accepts short ("23-24") and full-year ("2023-24" / "2023-2024") formats.

const BASE_START_YEAR = 2023; // the "23-24" session
const BASE_BATCH = 13;

export const getBatchFromSession = (session) => {
  if (!session) return null;
  const match = String(session).match(/\d{2,4}/);
  if (!match) return null;

  let startYear = Number(match[0]);
  if (startYear < 100) startYear += 2000; // "23" → 2023
  if (startYear < 2000 || startYear > 2100) return null;

  return String(BASE_BATCH + (startYear - BASE_START_YEAR));
};

export default getBatchFromSession;
