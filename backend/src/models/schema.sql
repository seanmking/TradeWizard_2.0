-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  industry TEXT,
  position TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Export Readiness Assessment table
CREATE TABLE export_readiness_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_score INTEGER,
  financial_readiness_score INTEGER,
  operational_capability_score INTEGER,
  market_understanding_score INTEGER,
  regulatory_compliance_score INTEGER,
  strategic_preparedness_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance Requirements table
CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL,
  industry TEXT NOT NULL,
  hs_code TEXT,
  requirement_name TEXT NOT NULL,
  requirement_description TEXT,
  required BOOLEAN DEFAULT true,
  documentation_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(country_code, industry, hs_code, requirement_name)
);

-- User Compliance Progress table
CREATE TABLE user_compliance_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES compliance_requirements(id),
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation History table
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_readiness_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_compliance_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
CREATE POLICY "Users can view and edit their own data" 
  ON users FOR ALL 
  USING (auth.uid() = id);

CREATE POLICY "Users can view and manage their own assessments" 
  ON export_readiness_assessments FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view and manage their compliance progress" 
  ON user_compliance_progress FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view and manage their conversation history" 
  ON conversation_history FOR ALL 
  USING (auth.uid() = user_id);
