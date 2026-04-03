-- LogistiQ Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (warehouse staff, dispatchers)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'operator', -- admin, dispatcher, operator
  warehouse_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Warehouses / Storage points
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resources (goods, fuel, materials)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- kg, L, pcs, etc.
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock levels per warehouse per resource
CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_threshold DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(warehouse_id, resource_id)
);

-- Delivery points
CREATE TABLE IF NOT EXISTS delivery_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Supply requests from delivery points
CREATE TABLE IF NOT EXISTS supply_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_point_id UUID NOT NULL REFERENCES delivery_points(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  requested_quantity DECIMAL(12,2) NOT NULL,
  fulfilled_quantity DECIMAL(12,2) DEFAULT 0,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- normal, elevated, critical
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, in_progress, fulfilled, cancelled
  notes TEXT,
  created_by UUID REFERENCES users(id),
  assigned_warehouse_id UUID REFERENCES warehouses(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Allocation log (audit trail)
CREATE TABLE IF NOT EXISTS allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES supply_requests(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  quantity DECIMAL(12,2) NOT NULL,
  allocated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_supply_requests_priority ON supply_requests(priority, status);
CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON supply_requests(status);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_resource ON stock(resource_id);
CREATE INDEX IF NOT EXISTS idx_allocations_request ON allocations(request_id);
