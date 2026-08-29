// Runs scripts/backup.js on a schedule using node-cron, so a dedicated
// long-running "backup" container (see docker-compose.yml) handles this
// without needing a separate host-level crontab entry.
require("dotenv").config();
const cron = require("node-cron");
const { execFile } = require("child_process");

// Default: every day at 3:00 AM server time — low traffic window.
const SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || "0 3 * * *";
let backupRunning = false;
console.log(`[cron] Backup scheduled with pattern "${SCHEDULE}" (server timezone).`);

cron.schedule(SCHEDULE, () => {
  if (backupRunning) {
    console.warn("[cron] Previous backup is still running. Skipping this run.");
    return;
  }

  backupRunning = true;

  console.log(
    `[cron] Triggering backup at ${new Date().toISOString()}`
  );

  execFile(
    process.execPath,
    ["scripts/backup.js"],
    {
      cwd: __dirname,
      windowsHide: true,
    },
    (err, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      if (err) {
        console.error(
          "[cron] Backup run failed:",
          err.message
        );
      } else {
        console.log(
          `[cron] Backup completed at ${new Date().toISOString()}`
        );
      }

      backupRunning = false;
    }
  );
});

// Keep the process alive — this container's only job is to sit and wait
// for the scheduled trigger.
function shutdown(signal) {
  console.log(`[cron] Received ${signal}. Shutting down...`);

  if (backupRunning) {
    console.log(
      "[cron] Backup is currently running. Waiting for it to finish."
    );

    const check = setInterval(() => {
      if (!backupRunning) {
        clearInterval(check);
        process.exit(0);
      }
    }, 1000);

    return;
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));