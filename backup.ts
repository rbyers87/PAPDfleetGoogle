import { createClient } from "@supabase/supabase-js";
import { parse } from "json2csv";
import * as fs from "fs"; // Changed from default import to namespace import
import archiver from "archiver";
import { google } from "googleapis";

// --- Supabase connection ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Missing Supabase environment variables.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Google Drive OAuth2 ---
const CLIENT_ID = process.env.GDRIVE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GDRIVE_REFRESH_TOKEN!;
const FOLDER_ID = process.env.GDRIVE_FOLDER_ID!;
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !FOLDER_ID) {
  throw new Error("❌ Missing Google Drive OAuth2 environment variables.");
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth: oauth2Client });

// --- Backup tables ---
const TABLES = [
  "profiles",
  "vehicle_status_history",
  "vehicles",
  "work_order_settings",
  "work_orders",
];

// --- Delete old backups ---
async function deleteOldBackups() {
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime desc",
  });
  const files = res.data.files || [];
  if (files.length > 1) {
    for (let i = 1; i < files.length; i++) {
      await drive.files.delete({ fileId: files[i].id! });
      console.log(`🗑️ Deleted old backup: ${files[i].name}`);
    }
  }
}

// --- Backup function ---
async function backupAllTables() {
  console.log("🚓 Starting database backup...");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `db_backup_${timestamp}`;
  fs.mkdirSync(backupDir);

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`❌ Error fetching ${table}:`, error.message);
      continue;
    }
    if (!data || data.length === 0) {
      console.log(`(empty) ${table}`);
      continue;
    }
    const csv = parse(data);
    fs.writeFileSync(`${backupDir}/${table}.csv`, csv);
    console.log(`✅ Saved ${table} (${data.length} rows)`);
  }

  const zipFile = `${backupDir}.zip`;
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipFile);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", (err: Error) => reject(err));
    archive.pipe(output);
    archive.directory(backupDir, false);
    archive.finalize();
  });

  console.log(`📦 Backup zipped: ${zipFile}`);

  await deleteOldBackups();

  const fileMetadata = { name: zipFile, parents: [FOLDER_ID] };
  const media = { mimeType: "application/zip", body: fs.createReadStream(zipFile) };
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, parents",
  });

  console.log("☁️ Backup uploaded to Drive (File ID:", response.data.id, ")");
  console.log("🎉 Backup complete!");
}

backupAllTables();
