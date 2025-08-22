import { createClient } from "@supabase/supabase-js";
import { parse } from "json2csv";
import fs from "fs";
import archiver from "archiver";
import { google } from "googleapis";

// 🔑 Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "YOUR_SERVICE_ROLE_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔑 Google Drive setup
const KEYFILE_PATH = "./fleet-backup-service-account.json"; // downloaded key
const FOLDER_ID = process.env.GDRIVE_FOLDER_ID || "YOUR_DRIVE_FOLDER_ID"; // FleetBackups folder ID

async function getAllTables(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_all_tables");
  if (error) {
    console.error("Error fetching table list:", error.message);
    return [];
  }
  return data || [];
}

async function backupAllTables() {
  console.log("Starting full database backup...");

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
    console.log(`Backing up table: ${table}`);
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

  // Zip folder
  const zipFile = `${backupDir}.zip`;
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipFile);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

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
  const fileMetadata = {
    name: zipFile,
    parents: [FOLDER_ID], // FleetBackups folder
  };

  const media = {
    mimeType: "application/zip",
    body: fs.createReadStream(zipFile),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });

  console.log(`☁️ Backup uploaded to Google Drive (File ID: ${response.data.id})`);
  console.log("🎉 Backup complete.");
}

backupAllTables();
