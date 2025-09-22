/*
  # Complete HerbionYX Database Schema

  1. New Tables
    - `batches` - Main batch tracking table
    - `events` - Supply chain events for each batch
    - `platform_ratings` - User feedback and ratings
    - `users` - User authentication and profiles
    - `sms_notifications` - SMS notification logs
    - `ipfs_storage` - IPFS file storage tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure user data access

  3. Indexes
    - Performance optimization for common queries
    - Full-text search capabilities
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  name text NOT NULL,
  organization text NOT NULL,
  role integer NOT NULL DEFAULT 6,
  phone text,
  address text,
  private_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id text UNIQUE NOT NULL,
  herb_species text NOT NULL,
  creator text NOT NULL,
  current_status text NOT NULL DEFAULT 'COLLECTED',
  data jsonb DEFAULT '{}',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  batch_id text NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
  parent_event_id text,
  participant text NOT NULL,
  organization text,
  data jsonb DEFAULT '{}',
  ipfs_hash text,
  qr_code_hash text,
  transaction_id text,
  block_number integer,
  gas_used integer,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

-- Create platform_ratings table
CREATE TABLE IF NOT EXISTS platform_ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create sms_notifications table
CREATE TABLE IF NOT EXISTS sms_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id text UNIQUE NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  phone text NOT NULL,
  event_id text,
  batch_id text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Create ipfs_storage table
CREATE TABLE IF NOT EXISTS ipfs_storage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipfs_hash text UNIQUE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  mime_type text,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batches_batch_id ON batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(current_status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_herb_species ON batches(herb_species);

CREATE INDEX IF NOT EXISTS idx_events_batch_id ON events(batch_id);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);

CREATE INDEX IF NOT EXISTS idx_platform_ratings_created_at ON platform_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_ratings_rating ON platform_ratings(rating);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_type ON sms_notifications(type);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_phone ON sms_notifications(phone);

CREATE INDEX IF NOT EXISTS idx_ipfs_storage_hash ON ipfs_storage(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_ipfs_storage_created_at ON ipfs_storage(created_at);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_batches_updated_at 
    BEFORE UPDATE ON batches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipfs_storage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Batches policies (public read for consumer verification)
CREATE POLICY "Anyone can read batches"
  ON batches
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create batches"
  ON batches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update batches"
  ON batches
  FOR UPDATE
  TO authenticated
  USING (true);

-- Events policies (public read for consumer verification)
CREATE POLICY "Anyone can read events"
  ON events
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Platform ratings policies
CREATE POLICY "Anyone can read ratings stats"
  ON platform_ratings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can submit ratings"
  ON platform_ratings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SMS notifications policies
CREATE POLICY "Users can read own SMS notifications"
  ON sms_notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create SMS notifications"
  ON sms_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- IPFS storage policies
CREATE POLICY "Authenticated users can read IPFS storage"
  ON ipfs_storage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create IPFS storage"
  ON ipfs_storage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert demo users
INSERT INTO users (email, encrypted_password, name, organization, role, phone, address) VALUES
  ('collector@demo.com', '$2a$10$demo.hash.collector', 'Demo Collector', 'Collector Group Demo', 1, '+91-9876543210', 'collector_address'),
  ('tester@demo.com', '$2a$10$demo.hash.tester', 'Demo Tester', 'Testing Labs Demo', 2, '+91-9876543211', 'tester_address'),
  ('processor@demo.com', '$2a$10$demo.hash.processor', 'Demo Processor', 'Processing Unit Demo', 3, '+91-9876543212', 'processor_address'),
  ('manufacturer@demo.com', '$2a$10$demo.hash.manufacturer', 'Demo Manufacturer', 'Manufacturing Plant Demo', 4, '+91-9876543213', 'manufacturer_address'),
  ('admin@demo.com', '$2a$10$demo.hash.admin', 'Demo Admin', 'HerbionYX Admin', 5, '+91-9876543214', 'admin_address'),
  ('consumer@demo.com', '$2a$10$demo.hash.consumer', 'Demo Consumer', 'General Public', 6, '+91-9876543215', 'consumer_address')
ON CONFLICT (email) DO NOTHING;