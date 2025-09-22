# 🐘 HerbionYX Neon Database Setup Guide

Complete guide for migrating from Supabase to Neon PostgreSQL database through Netlify.

## 📋 Prerequisites

- Netlify account
- Neon account (free tier available)
- Node.js 18+
- Git repository connected to Netlify

## 🚀 Step 1: Create Neon Database

### 1.1 Sign up for Neon
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub/Google or email
3. Create a new project
4. Choose a region close to your users
5. Note down your connection details

### 1.2 Get Connection String
After creating your project, you'll get a connection string like:
```
postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## 🔧 Step 2: Set up Netlify Integration

### 2.1 Install Netlify CLI
```bash
npm install -g netlify-cli
netlify login
```

### 2.2 Link Your Project
```bash
# In your project root
netlify link
# Or create new site
netlify init
```

### 2.3 Set Environment Variables
```bash
# Set environment variables in Netlify
netlify env:set DATABASE_URL "your-neon-connection-string"
netlify env:set NODE_ENV "production"
```

Or set them in Netlify Dashboard:
1. Go to Site Settings → Environment Variables
2. Add these variables:
   - `DATABASE_URL`: Your Neon connection string
   - `NODE_ENV`: `production`

## 🗄️ Step 3: Database Schema Setup

### 3.1 Create Database Schema
Create a new file `database/schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id VARCHAR(255) UNIQUE NOT NULL,
    herb_species VARCHAR(255) NOT NULL,
    creator VARCHAR(255) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'COLLECTED',
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    batch_id VARCHAR(255) NOT NULL REFERENCES batches(batch_id),
    participant VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    data JSONB,
    ipfs_hash VARCHAR(255),
    qr_code_hash VARCHAR(255),
    transaction_id VARCHAR(255),
    block_number INTEGER,
    gas_used INTEGER,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platform_ratings table
CREATE TABLE IF NOT EXISTS platform_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batches_batch_id ON batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(current_status);
CREATE INDEX IF NOT EXISTS idx_events_batch_id ON events(batch_id);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Create updated_at trigger for batches
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_batches_updated_at 
    BEFORE UPDATE ON batches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Run Schema Setup
You can run this schema in several ways:

#### Option A: Using Neon Console
1. Go to your Neon dashboard
2. Open SQL Editor
3. Paste and run the schema

#### Option B: Using psql
```bash
psql "your-neon-connection-string" -f database/schema.sql
```

#### Option C: Using Node.js script
Create `scripts/setup-database.js` and run it once.

## 📦 Step 4: Install Dependencies

```bash
npm install pg @types/pg dotenv
```

## 🔧 Step 5: Update Service Files

The service files have been updated to use Neon PostgreSQL instead of Supabase. Key changes:

1. **Database Connection**: Uses `pg` (node-postgres) client
2. **Connection Pooling**: Implements proper connection management
3. **SQL Queries**: Native PostgreSQL queries instead of Supabase client
4. **Environment Variables**: Uses `DATABASE_URL` from Neon

## 🚀 Step 6: Netlify Functions Setup

### 6.1 Create Netlify Functions Directory
```bash
mkdir netlify/functions
```

### 6.2 Configure netlify.toml
Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  node_bundler = "esbuild"
```

### 6.3 Example Netlify Function
Create `netlify/functions/api.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  const { httpMethod, path, body } = event;
  
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Route handling logic here
    // Example: GET /api/batches
    if (httpMethod === 'GET' && path.includes('/batches')) {
      const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: result.rows })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## 🔄 Step 7: Update Frontend Configuration

Update your environment variables for the frontend:

```bash
# .env.local (for local development)
VITE_API_URL=http://localhost:8888/.netlify/functions
VITE_DATABASE_URL=your-neon-connection-string

# For production (set in Netlify dashboard)
VITE_API_URL=https://your-site.netlify.app/.netlify/functions
```

## 🧪 Step 8: Testing

### 8.1 Local Development
```bash
# Install Netlify Dev
npm install -g netlify-dev

# Run locally with Netlify functions
netlify dev
```

### 8.2 Test Database Connection
Create a test script `scripts/test-connection.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
```

Run with: `node scripts/test-connection.js`

## 📊 Step 9: Data Migration (if needed)

If you have existing data in Supabase, create a migration script:

```javascript
// scripts/migrate-data.js
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  try {
    // Migrate batches
    const { data: batches } = await supabase.from('batches').select('*');
    for (const batch of batches) {
      await pool.query(
        'INSERT INTO batches (batch_id, herb_species, creator, current_status, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (batch_id) DO NOTHING',
        [batch.batch_id, batch.herb_species, batch.creator, batch.current_status, batch.data, batch.created_at, batch.updated_at]
      );
    }

    // Migrate events
    const { data: events } = await supabase.from('events').select('*');
    for (const event of events) {
      await pool.query(
        'INSERT INTO events (event_id, event_type, batch_id, participant, organization, data, ipfs_hash, qr_code_hash, transaction_id, block_number, gas_used, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (event_id) DO NOTHING',
        [event.event_id, event.event_type, event.batch_id, event.participant, event.organization, event.data, event.ipfs_hash, event.qr_code_hash, event.transaction_id, event.block_number, event.gas_used, event.status, event.created_at]
      );
    }

    console.log('✅ Data migration completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateData();
```

## 🚀 Step 10: Deploy

### 10.1 Deploy to Netlify
```bash
# Build and deploy
npm run build
netlify deploy --prod

# Or push to Git (if auto-deploy is enabled)
git add .
git commit -m "Migrate to Neon database"
git push origin main
```

### 10.2 Verify Deployment
1. Check Netlify function logs
2. Test API endpoints
3. Verify database connections
4. Test frontend functionality

## 🔧 Step 11: Environment Variables Checklist

Make sure these are set in Netlify:

- ✅ `DATABASE_URL` - Your Neon connection string
- ✅ `NODE_ENV` - Set to "production"
- ✅ `VITE_API_URL` - Your Netlify functions URL
- ✅ Any other app-specific variables (JWT secrets, API keys, etc.)

## 📈 Step 12: Monitoring & Optimization

### 12.1 Connection Pooling
Neon automatically handles connection pooling, but you can optimize:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 12.2 Query Optimization
- Use indexes for frequently queried columns
- Implement pagination for large datasets
- Use prepared statements for repeated queries

### 12.3 Monitoring
- Monitor Neon dashboard for performance metrics
- Use Netlify function logs for debugging
- Set up error tracking (Sentry, etc.)

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit database URLs to Git
2. **SSL**: Always use SSL connections (enabled by default in Neon)
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Authentication**: Secure your API endpoints

## 🆘 Troubleshooting

### Common Issues:

1. **Connection Timeout**
   - Check if DATABASE_URL is correct
   - Verify Neon database is active
   - Check network connectivity

2. **SSL Certificate Issues**
   - Ensure `sslmode=require` in connection string
   - Use `ssl: { rejectUnauthorized: false }` in development

3. **Function Cold Starts**
   - Neon has connection pooling to minimize this
   - Consider keeping connections warm

4. **CORS Issues**
   - Ensure proper CORS headers in functions
   - Check Netlify redirects configuration

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)

## 🎯 Next Steps

1. Set up automated backups in Neon
2. Implement database migrations system
3. Add monitoring and alerting
4. Optimize queries based on usage patterns
5. Consider read replicas for scaling

This migration gives you:
- ✅ Better PostgreSQL performance
- ✅ Serverless scaling with Netlify
- ✅ Cost-effective solution
- ✅ Better integration with Netlify ecosystem
- ✅ Professional database management