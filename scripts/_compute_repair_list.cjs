const fs = require("fs");
const remote = new Set(JSON.parse(fs.readFileSync(".tmp_remote_versions.json", "utf-8")));
const excludeFiles = new Set([
  "20260430122400_membership_subscription.sql",
  "20260430122500_review_prompts.sql",
  "20260810220000_enhance_email_logs_for_brevo.sql",
]);
const files = fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
const toRepair = [];
for (const f of files) {
  const v = f.split("_")[0];
  if (remote.has(v)) continue;
  if (excludeFiles.has(f)) continue;
  toRepair.push(v);
}
console.log("Count to repair-mark as applied:", toRepair.length);
fs.writeFileSync(".tmp_repair_versions.json", JSON.stringify(toRepair));
console.log(toRepair.join(" "));
