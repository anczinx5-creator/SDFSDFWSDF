const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    console.log('🔄 Testing Neon database connection...');
    
    const client = await pool.connect();
    
    // Test basic connection
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    console.log(`⏰ Current database time: ${timeResult.rows[0].current_time}`);
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    console.log(`🐘 PostgreSQL version: ${versionResult.rows[0].version.split(' ')[1]}`);
    
    // Test tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('batches', 'events', 'platform_ratings')
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Test sample query
    const batchCount = await client.query('SELECT COUNT(*) FROM batches');
    const eventCount = await client.query('SELECT COUNT(*) FROM events');
    const ratingCount = await client.query('SELECT COUNT(*) FROM platform_ratings');
    
    console.log('📊 Current data:');
    console.log(`   📦 Batches: ${batchCount.rows[0].count}`);
    console.log(`   📝 Events: ${eventCount.rows[0].count}`);
    console.log(`   ⭐ Ratings: ${ratingCount.rows[0].count}`);
    
    client.release();
    console.log('🎉 All tests passed! Database is ready for HerbionYX.');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    console.error('💡 Make sure:');
    console.error('   1. DATABASE_URL environment variable is set');
    console.error('   2. Neon database is active and accessible');
    console.error('   3. Database schema has been set up');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();