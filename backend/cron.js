// Runs scripts/backup.js on a schedule using node-cron, so a dedicated
// long-running "backup" container (see docker-compose.yml) handles this
// without needing a separate host-level crontab entry.
require("dotenv").config();
const cron = require("node-cron");
const { execFile } = require("child_process");

// Default: every day at 3:00 AM server time — low traffic window.
const SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || "0 3 * * *";

console.log(`[cron] Backup scheduled with pattern "${SCHEDULE}" (server timezone).`);

cron.schedule(SCHEDULE, () => {
  console.log(`[cron] Triggering backup at ${new Date().toISOString()}`);
  execFile("node", ["scripts/backup.js"], { cwd: __dirname }, (err, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (err) console.error("[cron] Backup run failed:", err.message);
  });
});

// Keep the process alive — this container's only job is to sit and wait
// for the scheduled trigger.
