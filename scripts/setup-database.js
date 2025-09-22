const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  try {
    console.log('🔄 Setting up HerbionYX database schema...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database schema setup completed successfully!');
    
    // Test the setup
    const result = await pool.query('SELECT COUNT(*) FROM batches');
    console.log(`📊 Batches table ready (current count: ${result.rows[0].count})`);
    
    const eventsResult = await pool.query('SELECT COUNT(*) FROM events');
    console.log(`📊 Events table ready (current count: ${eventsResult.rows[0].count})`);
    
    const ratingsResult = await pool.query('SELECT COUNT(*) FROM platform_ratings');
    console.log(`📊 Platform ratings table ready (current count: ${ratingsResult.rows[0].count})`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();