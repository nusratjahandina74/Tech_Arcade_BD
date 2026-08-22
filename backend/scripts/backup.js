// Dumps the whole MongoDB database with `mongodump`, uploads the compressed
// archive to S3 (or any S3-compatible bucket), and deletes local + remote
// backups older than the retention window. Run manually with `npm run backup`,
// or on a schedule via cron.js / a host crontab entry.
//
// Requires the MongoDB Database Tools (`mongodump`) to be installed wherever
// this runs. The Docker backup service (see Dockerfile.backup) already
// includes it.

require("dotenv").config();
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const execFileAsync = promisify(execFile);

const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const BUCKET = process.env.S3_BACKUP_BUCKET;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function dumpDatabase() {
  const archivePath = path.join(os.tmpdir(), `techarcade-${timestamp()}.gz`);
  await execFileAsync("mongodump", [
    `--uri=${process.env.MONGO_URI}`,
    `--archive=${archivePath}`,
    "--gzip",
  ]);
  return archivePath;
}

async function uploadToS3(archivePath) {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const key = `backups/${path.basename(archivePath)}`;
  const body = fs.createReadStream(archivePath);

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }));
  return key;
}

async function cleanupOldBackups() {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "backups/" }));
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const stale = (list.Contents || []).filter((obj) => obj.LastModified && obj.LastModified.getTime() < cutoff);
  for (const obj of stale) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
  }
  return stale.length;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set.");
  if (!BUCKET) throw new Error("S3_BACKUP_BUCKET is not set — see backend/.env.example.");

  console.log(`[backup] Starting mongodump at ${new Date().toISOString()}`);
  const archivePath = await dumpDatabase();
  console.log(`[backup] Dump complete: ${archivePath}`);

  const key = await uploadToS3(archivePath);
  console.log(`[backup] Uploaded to s3://${BUCKET}/${key}`);

  fs.unlinkSync(archivePath); // don't let the VPS disk fill up with local copies

  const removed = await cleanupOldBackups();
  console.log(`[backup] Removed ${removed} backup(s) older than ${RETENTION_DAYS} days.`);
  console.log("[backup] Done.");
}

main().catch((err) => {
  console.error("[backup] FAILED:", err.message);
  process.exit(1);
});
