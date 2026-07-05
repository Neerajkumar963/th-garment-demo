const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: 'Neeraj@2004', 
    database: 'th_garments'
  });
  
  const [tables] = await c.query('SHOW TABLES');
  const schema = {};
  for(let row of tables) {
    let tableName = Object.values(row)[0];
    const [cols] = await c.query(`DESCRIBE ${tableName}`);
    schema[tableName] = cols.map(c => c.Field);
  }
  await c.end();

  const controllersDir = path.join(__dirname, 'controllers');
  const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
  let hasError = false;

  function getColumns(tableName) {
    return schema[tableName] || [];
  }

  const insertRegex = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/gi;
  const updateRegex = /UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*?)\s+(?:WHERE|RETURNING|$)/gi;

  for (const file of files) {
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
    let match;
    
    // Check INSERTs
    while ((match = insertRegex.exec(content)) !== null) {
      const tableName = match[1];
      const columnsStr = match[2];
      
      if (!schema[tableName]) {
        console.error(`❌ [${file}] Table not found in DB: ${tableName}`);
        hasError = true;
        continue;
      }
      
      const cols = columnsStr.split(',').map(c => c.replace(/['"`\s]/g, '').trim()).filter(Boolean);
      const validCols = getColumns(tableName);
      
      for (const col of cols) {
        if (!validCols.includes(col)) {
           console.error(`❌ [${file}] Column '${col}' not found in table '${tableName}'`);
           hasError = true;
        }
      }
    }
    
    // Check UPDATEs
    while ((match = updateRegex.exec(content)) !== null) {
      const tableName = match[1];
      const setStr = match[2];
      
      if (!schema[tableName]) {
        console.error(`❌ [${file}] Table not found in DB: ${tableName}`);
        hasError = true;
        continue;
      }
      
      const assignments = setStr.split(',');
      const validCols = getColumns(tableName);
      
      for (const assignment of assignments) {
        const colPart = assignment.split('=')[0];
        if (colPart) {
          let col = colPart.replace(/['"`\s]/g, '').trim();
          if (col.includes('.')) col = col.split('.')[1];
          col = col.split(' ')[0]; 

          if (col && col !== '?' && !validCols.includes(col) && !col.toUpperCase().includes('DATE_FORMAT')) {
             console.error(`❌ [${file}] Column '${col}' not found in table '${tableName}' (UPDATE)`);
             hasError = true;
          }
        }
      }
    }
  }

  if (!hasError) {
    console.log("✅ PERFECT! No column or table name errors found in INSERT and UPDATE queries across all controllers.");
  } else {
    console.log("⚠️ Finished with errors.");
  }
}

run().catch(console.error);
