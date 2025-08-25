import { createClient } from "@supabase/supabase-js";
import { parse } from "json2csv";
import fs from "fs";
import archiver from "archiver";
import { google } from "googleapis";

// === Supabase connection ===
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || // preferred for backups
  process.env.VITE_SUPABASE_ANON_KEY; // fallback if service key not set

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "❌ Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_KEY (or VITE_ equivalents)."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// === Google Drive setup ===
const KEYFILE_PATH = "./fleet-backup-service-account.json";
const FOLDER_ID = process.env.GDRIVE_FOLDER_ID!;
if (!FOLDER_ID) throw new Error("❌ Missing GDRIVE_FOLDER_ID");

// --- Backup Logic ---
async function getAllTables(): Promise<string[]> {
  const { data, error } = await supabase
    .from("pg_tables")
    .select("tablename")
    .eq("schemaname", "public");

  if (error) {
    console.error("Error fetching table list:", error.message);
    return [];
  }

  return data?.map((t: any) => t.tablename) || [];
}

// --- Delete old backups ---
async function deleteOldBackups(drive: any) {
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime desc",
  });

  const files = res.data.files || [];

  if (files.length > 1) {
    for (let i = 1; i < files.length; i++) {
      const fileId = files[i].id;
      await drive.files.delete({ fileId });
      console.log(`🗑️ Deleted old backup: ${files[i].name}`);
    }
  }
}

async function backupAllTables() {
  console.log("🚓 Starting database backup...");

  const tables = await getAllTables();
  if (tables.length === 0) {
    console.log("No tables found.");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `db_backup_${timestamp}`;
  fs.mkdirSync(backupDir);

  // Export each table to CSV
  for (const table of tables) {
    console.log(`📑 Backing up: ${table}`);
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

  // Zip the folder
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

  // Upload to Google Drive
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const drive = google.drive({ version: "v3", auth });

  // ✅ Delete old backups before uploading
  await deleteOldBackups(drive);

  console.log("📁 Uploading backup to Drive folder ID:", FOLDER_ID);

  const fileMetadata = {
    name: zipFile,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: "application/zip",
    body: fs.createReadStream(zipFile),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name, parents",
  });

  console.log("Upload response:", response.data); // shows file ID, name, parents
  console.log(`☁️ Backup uploaded to Drive (File ID: ${response.data.id})`);
  console.log("🎉 Backup complete!");
}

backupAllTables();
