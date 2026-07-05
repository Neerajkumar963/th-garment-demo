const mysql = require('mysql2/promise');

async function checkSchema() {
  try {
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
    
    console.log(JSON.stringify(schema, null, 2));
    await c.end();
  } catch(e) {
    console.error(e);
  }
}

checkSchema();
