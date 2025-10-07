import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Service Account Authentication (more reliable than OAuth)
const GDRIVE_SERVICE_ACCOUNT_KEY = process.env.GDRIVE_SERVICE_ACCOUNT_KEY!;
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID!;

// Parse the service account key
let serviceAccountKey;
try {
  serviceAccountKey = JSON.parse(GDRIVE_SERVICE_ACCOUNT_KEY);
} catch (error) {
  console.error('❌ Failed to parse GDRIVE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

// Initialize Google Drive with Service Account
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

const TABLES_TO_BACKUP = [
  'profiles',
  'vehicle_status_history',
  'vehicles',
  'work_order_settings',
  'work_orders',
  'location_options',
];

const MAX_BACKUPS = 7; // Keep last 7 backups

async function deleteOldBackups() {
  try {
    console.log('🗑️  Checking for old backups...');
    
    const response = await drive.files.list({
      q: `name contains 'db_backup_' and '${GDRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];
    
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      
      for (const file of filesToDelete) {
        await drive.files.delete({ fileId: file.id! });
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('⚠️  Error deleting old backups:', error);
  }
}

async function backupAllTables() {
  console.log('🚓 Starting database backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backup_temp');
  const zipPath = path.join(process.cwd(), `db_backup_${timestamp}.zip`);

  // Create temp directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // Backup each table
    for (const table of TABLES_TO_BACKUP) {
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`❌ Error backing up ${table}:`, error);
        continue;
      }

      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Saved ${table} (${data?.length || 0} rows)`);
    }

    // Create ZIP archive
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize();
    });

    console.log(`📦 Backup zipped: ${path.basename(zipPath)}`);

    // Delete old backups before uploading new one
    await deleteOldBackups();

    // Upload to Google Drive
    const fileMetadata = {
      name: path.basename(zipPath),
      parents: [GDRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipPath),
    };

    await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    console.log('☁️  Uploaded to Google Drive');
    console.log('✅ Backup completed successfully!');

    // Cleanup
    fs.rmSync(backupDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    
    // Cleanup on error
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    process.exit(1);
  }
}

backupAllTables();
