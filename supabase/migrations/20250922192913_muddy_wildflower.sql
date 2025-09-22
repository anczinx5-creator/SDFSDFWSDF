-- HerbionYX Database Schema for Neon PostgreSQL
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
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
CREATE INDEX IF NOT EXISTS idx_events_batch_id ON events(batch_id);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_ratings_created_at ON platform_ratings(created_at);

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

-- Insert sample data for testing (optional)
-- INSERT INTO batches (batch_id, herb_species, creator, current_status, data) VALUES
-- ('HERB-1234567890-1234', 'Ashwagandha', 'Demo Collector', 'COLLECTED', '{"weight": 500, "location": {"zone": "Rajasthan Desert Region"}}');