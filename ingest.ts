import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = './business_data.db';
const DATA_DIR = './data';

function ingestData() {
  console.log('Starting build-time data ingestion...');
  
  if (!fs.existsSync(DATA_DIR)) {
    console.warn(`Data directory ${DATA_DIR} not found. Skipping ingestion.`);
    return;
  }

  const db = new Database(DB_PATH);
  const folders = fs.readdirSync(DATA_DIR);
  
  for (const folder of folders) {
    const folderPath = path.join(DATA_DIR, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jsonl'));
    if (files.length === 0) continue;

    const tableName = folder.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Read first line to infer schema
    const firstFile = path.join(folderPath, files[0]);
    const firstLine = fs.readFileSync(firstFile, 'utf8').split('\n')[0];
    if (!firstLine) continue;
    
    const sampleData = JSON.parse(firstLine);
    const columns = Object.keys(sampleData);
    
    // Create table
    const columnDefs = columns.map(col => {
      const val = sampleData[col];
      let type = 'TEXT';
      if (typeof val === 'number') type = 'REAL';
      if (typeof val === 'boolean') type = 'INTEGER';
      return `"${col}" ${type}`;
    }).join(', ');
    
    db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    db.exec(`CREATE TABLE ${tableName} (${columnDefs})`);
    
    // Insert data
    const insertStmt = db.prepare(`INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`);
    
    let count = 0;
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      
      db.transaction(() => {
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const values = columns.map(col => {
              const val = data[col];
              if (val === null || val === undefined) return null;
              if (typeof val === 'boolean') return val ? 1 : 0;
              if (typeof val === 'object') return JSON.stringify(val);
              return val;
            });
            insertStmt.run(...values);
            count++;
          } catch (e) {
            console.error(`Error parsing line in ${file}:`, e);
          }
        }
      })();
    }
    console.log(`Ingested ${count} records into ${tableName}`);
  }
  db.close();
  console.log('Build-time ingestion complete.');
}

ingestData();
