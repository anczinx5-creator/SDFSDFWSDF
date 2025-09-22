const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

// Supabase configuration (for migration source)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Neon configuration (migration target)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateFromSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase credentials not found. Skipping migration.');
    console.log('   Set SUPABASE_URL and SUPABASE_ANON_KEY if you want to migrate data.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('🔄 Starting data migration from Supabase to Neon...');
    
    // Migrate batches
    console.log('📦 Migrating batches...');
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('*');
    
    if (batchesError) {
      console.error('❌ Error fetching batches from Supabase:', batchesError);
    } else if (batches && batches.length > 0) {
      for (const batch of batches) {
        try {
          await pool.query(`
            INSERT INTO batches (batch_id, herb_species, creator, current_status, data, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            ON CONFLICT (batch_id) DO UPDATE SET
              herb_species = EXCLUDED.herb_species,
              creator = EXCLUDED.creator,
              current_status = EXCLUDED.current_status,
              data = EXCLUDED.data,
              updated_at = EXCLUDED.updated_at
          `, [
            batch.batch_id,
            batch.herb_species,
            batch.creator,
            batch.current_status,
            batch.data,
            batch.created_at,
            batch.updated_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating batch ${batch.batch_id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${batches.length} batches`);
    } else {
      console.log('📦 No batches found in Supabase');
    }

    // Migrate events
    console.log('📝 Migrating events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');
    
    if (eventsError) {
      console.error('❌ Error fetching events from Supabase:', eventsError);
    } else if (events && events.length > 0) {
      for (const event of events) {
        try {
          await pool.query(`
            INSERT INTO events (
              event_id, event_type, batch_id, participant, organization, 
              data, ipfs_hash, qr_code_hash, transaction_id, block_number, 
              gas_used, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
            ON CONFLICT (event_id) DO UPDATE SET
              event_type = EXCLUDED.event_type,
              participant = EXCLUDED.participant,
              organization = EXCLUDED.organization,
              data = EXCLUDED.data,
              ipfs_hash = EXCLUDED.ipfs_hash,
              qr_code_hash = EXCLUDED.qr_code_hash,
              transaction_id = EXCLUDED.transaction_id,
              block_number = EXCLUDED.block_number,
              gas_used = EXCLUDED.gas_used,
              status = EXCLUDED.status
          `, [
            event.event_id,
            event.event_type,
            event.batch_id,
            event.participant,
            event.organization,
            event.data,
            event.ipfs_hash,
            event.qr_code_hash,
            event.transaction_id,
            event.block_number,
            event.gas_used,
            event.status,
            event.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating event ${event.event_id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${events.length} events`);
    } else {
      console.log('📝 No events found in Supabase');
    }

    // Migrate platform ratings
    console.log('⭐ Migrating platform ratings...');
    const { data: ratings, error: ratingsError } = await supabase
      .from('platform_ratings')
      .select('*');
    
    if (ratingsError) {
      console.error('❌ Error fetching ratings from Supabase:', ratingsError);
    } else if (ratings && ratings.length > 0) {
      for (const rating of ratings) {
        try {
          await pool.query(`
            INSERT INTO platform_ratings (rating, feedback, created_at) 
            VALUES ($1, $2, $3)
          `, [
            rating.rating,
            rating.feedback,
            rating.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating rating:`, error.message);
        }
      }
      console.log(`✅ Migrated ${ratings.length} platform ratings`);
    } else {
      console.log('⭐ No platform ratings found in Supabase');
    }

    // Verify migration
    console.log('🔍 Verifying migration...');
    const batchCount = await pool.query('SELECT COUNT(*) FROM batches');
    const eventCount = await pool.query('SELECT COUNT(*) FROM events');
    const ratingCount = await pool.query('SELECT COUNT(*) FROM platform_ratings');
    
    console.log('📊 Migration summary:');
    console.log(`   📦 Batches in Neon: ${batchCount.rows[0].count}`);
    console.log(`   📝 Events in Neon: ${eventCount.rows[0].count}`);
    console.log(`   ⭐ Ratings in Neon: ${ratingCount.rows[0].count}`);
    
    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateFromSupabase();