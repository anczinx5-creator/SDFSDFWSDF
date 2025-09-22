const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper function to handle database errors
const handleError = (error, context = '') => {
  console.error(`Database error ${context}:`, error);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  };
};

// Helper function for success responses
const successResponse = (data, statusCode = 200) => ({
  statusCode,
  headers,
  body: JSON.stringify({ success: true, data })
});

exports.handler = async (event, context) => {
  const { httpMethod, path, body, queryStringParameters } = event;
  
  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const pathParts = path.split('/').filter(Boolean);
    const endpoint = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

    // Parse request body
    let requestBody = {};
    if (body) {
      try {
        requestBody = JSON.parse(body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' })
        };
      }
    }

    // Route handling
    switch (true) {
      // Health check
      case httpMethod === 'GET' && endpoint === 'health':
        return successResponse({ 
          status: 'OK', 
          message: '🌿 HerbionYX API Server is running with Neon Database',
          timestamp: new Date().toISOString(),
          database: 'neon-postgresql'
        });

      // Get all batches
      case httpMethod === 'GET' && endpoint === 'batches':
        const batchesResult = await pool.query(`
          SELECT b.*, 
                 COUNT(e.id) as event_count,
                 MAX(e.created_at) as last_event_time
          FROM batches b
          LEFT JOIN events e ON b.batch_id = e.batch_id
          GROUP BY b.id, b.batch_id, b.herb_species, b.creator, b.current_status, b.data, b.created_at, b.updated_at
          ORDER BY b.created_at DESC
        `);
        
        const batches = batchesResult.rows.map(batch => ({
          batchId: batch.batch_id,
          herbSpecies: batch.herb_species,
          creator: batch.creator,
          currentStatus: batch.current_status,
          eventCount: parseInt(batch.event_count),
          creationTime: batch.created_at,
          lastUpdated: batch.updated_at,
          data: batch.data
        }));
        
        return successResponse(batches);

      // Get batch by ID with events
      case httpMethod === 'GET' && pathParts.includes('batch'):
        const batchId = pathParts[pathParts.length - 1];
        
        // Get batch info
        const batchResult = await pool.query(
          'SELECT * FROM batches WHERE batch_id = $1',
          [batchId]
        );
        
        if (batchResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'Batch not found' })
          };
        }
        
        // Get events for this batch
        const eventsResult = await pool.query(
          'SELECT * FROM events WHERE batch_id = $1 ORDER BY created_at ASC',
          [batchId]
        );
        
        const batch = batchResult.rows[0];
        const events = eventsResult.rows.map(event => ({
          eventId: event.event_id,
          eventType: event.event_type,
          batchId: event.batch_id,
          participant: event.participant,
          organization: event.organization,
          timestamp: event.created_at,
          data: event.data,
          ipfsHash: event.ipfs_hash,
          qrCodeHash: event.qr_code_hash,
          transactionId: event.transaction_id,
          blockNumber: event.block_number,
          gasUsed: event.gas_used,
          status: event.status
        }));
        
        return successResponse({
          batch: {
            batchId: batch.batch_id,
            herbSpecies: batch.herb_species,
            creator: batch.creator,
            currentStatus: batch.current_status,
            creationTime: batch.created_at,
            lastUpdated: batch.updated_at,
            events: events
          }
        });

      // Create new batch
      case httpMethod === 'POST' && endpoint === 'batches':
        const { batchId: newBatchId, herbSpecies, creator, data: batchData } = requestBody;
        
        if (!newBatchId || !herbSpecies || !creator) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Missing required fields: batchId, herbSpecies, creator' 
            })
          };
        }
        
        const insertBatchResult = await pool.query(
          'INSERT INTO batches (batch_id, herb_species, creator, data) VALUES ($1, $2, $3, $4) RETURNING *',
          [newBatchId, herbSpecies, creator, batchData || {}]
        );
        
        return successResponse(insertBatchResult.rows[0], 201);

      // Create new event
      case httpMethod === 'POST' && endpoint === 'events':
        const { 
          eventId, 
          eventType, 
          batchId: eventBatchId, 
          participant, 
          organization, 
          data: eventData,
          ipfsHash,
          qrCodeHash,
          transactionId,
          blockNumber,
          gasUsed
        } = requestBody;
        
        if (!eventId || !eventType || !eventBatchId || !participant) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Missing required fields: eventId, eventType, batchId, participant' 
            })
          };
        }
        
        // Insert event
        const insertEventResult = await pool.query(`
          INSERT INTO events (
            event_id, event_type, batch_id, participant, organization, 
            data, ipfs_hash, qr_code_hash, transaction_id, block_number, gas_used
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
          RETURNING *`,
          [
            eventId, eventType, eventBatchId, participant, organization,
            eventData || {}, ipfsHash, qrCodeHash, transactionId, blockNumber, gasUsed
          ]
        );
        
        // Update batch status
        const statusMap = {
          'COLLECTION': 'COLLECTED',
          'QUALITY_TEST': 'QUALITY_TESTED',
          'PROCESSING': 'PROCESSED',
          'MANUFACTURING': 'MANUFACTURED'
        };
        
        const newStatus = statusMap[eventType] || 'IN_PROGRESS';
        await pool.query(
          'UPDATE batches SET current_status = $1, updated_at = NOW() WHERE batch_id = $2',
          [newStatus, eventBatchId]
        );
        
        return successResponse(insertEventResult.rows[0], 201);

      // Platform ratings
      case httpMethod === 'POST' && endpoint === 'ratings':
        const { rating, feedback } = requestBody;
        
        if (!rating || rating < 1 || rating > 5) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Rating must be between 1 and 5' 
            })
          };
        }
        
        const ratingResult = await pool.query(
          'INSERT INTO platform_ratings (rating, feedback) VALUES ($1, $2) RETURNING *',
          [rating, feedback || null]
        );
        
        return successResponse(ratingResult.rows[0], 201);

      // Get rating statistics
      case httpMethod === 'GET' && endpoint === 'ratings':
        const ratingsResult = await pool.query('SELECT rating FROM platform_ratings');
        
        if (ratingsResult.rows.length === 0) {
          return successResponse({
            averageRating: 0,
            totalReviews: 0,
            satisfactionRate: 0
          });
        }
        
        const ratings = ratingsResult.rows.map(r => r.rating);
        const totalReviews = ratings.length;
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / totalReviews;
        const satisfactionRate = (ratings.filter(rating => rating >= 4).length / totalReviews) * 100;
        
        return successResponse({
          averageRating: parseFloat(averageRating.toFixed(1)),
          totalReviews,
          satisfactionRate: parseFloat(satisfactionRate.toFixed(0))
        });

      // Default 404
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Endpoint not found',
            availableEndpoints: [
              'GET /api/health',
              'GET /api/batches',
              'GET /api/batch/:batchId',
              'POST /api/batches',
              'POST /api/events',
              'GET /api/ratings',
              'POST /api/ratings'
            ]
          })
        };
    }
  } catch (error) {
    return handleError(error, `${httpMethod} ${path}`);
  }
};