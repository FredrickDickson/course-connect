import 'dotenv/config';
import { processAutoRenewals } from "../server/services/auto-renewal";

async function main() {
  console.log("Running auto-renewals...");
  try {
    const stats = await processAutoRenewals();
    console.log("Auto-renew stats:", stats);
    process.exit(0);
  } catch (err) {
    console.error("Error running auto-renewals:", err);
    process.exit(1);
  }
}

main();
