-- Create analytics summary tables manually

-- Deal Daily Summary
CREATE TABLE IF NOT EXISTS deal_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  
  -- Counts
  total_deals INT DEFAULT 0,
  won_deals INT DEFAULT 0,
  lost_deals INT DEFAULT 0,
  open_deals INT DEFAULT 0,
  
  -- Amounts
  total_amount DECIMAL(15, 2),
  won_amount DECIMAL(15, 2),
  average_deal_size DECIMAL(15, 2),
  
  -- Derived metrics
  win_rate DECIMAL(5, 2),
  
  -- Metadata
  currency TEXT DEFAULT 'USD',
  pipeline_id TEXT,
  stage_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  summarized_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, date, pipeline_id, stage_id, currency)
);

-- Revenue Daily Summary
CREATE TABLE IF NOT EXISTS revenue_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  
  -- Revenue metrics
  total_revenue DECIMAL(15, 2),
  won_revenue DECIMAL(15, 2),
  forecast_revenue DECIMAL(15, 2),
  
  -- Counts
  total_deals INT DEFAULT 0,
  won_deals INT DEFAULT 0,
  
  -- Derived metrics
  average_deal_size DECIMAL(15, 2),
  
  -- Currency
  currency TEXT DEFAULT 'USD',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  summarized_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, date, currency)
);

-- Pipeline Stage Summary
CREATE TABLE IF NOT EXISTS pipeline_stage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  
  -- Stage metrics
  deal_count INT DEFAULT 0,
  total_amount DECIMAL(15, 2),
  average_amount DECIMAL(15, 2),
  
  -- Duration metrics (days)
  avg_stage_duration INT DEFAULT 0,
  max_stage_duration INT DEFAULT 0,
  
  -- Bottleneck indicator
  is_bottleneck BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  summarized_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, pipeline_id, stage_id, date)
);

-- Activity Daily Summary
CREATE TABLE IF NOT EXISTS activity_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  
  -- Activity counts by type
  login_count INT DEFAULT 0,
  deal_created INT DEFAULT 0,
  deal_updated INT DEFAULT 0,
  deal_won INT DEFAULT 0,
  deal_lost INT DEFAULT 0,
  contact_created INT DEFAULT 0,
  contact_updated INT DEFAULT 0,
  lead_created INT DEFAULT 0,
  lead_converted INT DEFAULT 0,
  
  -- User activity
  active_users INT DEFAULT 0,
  total_actions INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  summarized_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deal_daily_summaries_org_date ON deal_daily_summaries(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_deal_daily_summaries_summarized ON deal_daily_summaries(summarized_at);

CREATE INDEX IF NOT EXISTS idx_revenue_daily_summaries_org_date ON revenue_daily_summaries(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_revenue_daily_summaries_summarized ON revenue_daily_summaries(summarized_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_summaries_org_date ON pipeline_stage_summaries(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_summaries_pipeline_stage ON pipeline_stage_summaries(pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_summaries_bottleneck ON pipeline_stage_summaries(is_bottleneck);

CREATE INDEX IF NOT EXISTS idx_activity_daily_summaries_org_date ON activity_daily_summaries(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_daily_summaries_summarized ON activity_daily_summaries(summarized_at);

-- Add foreign key constraints
ALTER TABLE deal_daily_summaries ADD CONSTRAINT fk_deal_daily_summaries_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE revenue_daily_summaries ADD CONSTRAINT fk_revenue_daily_summaries_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE pipeline_stage_summaries ADD CONSTRAINT fk_pipeline_stage_summaries_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activity_daily_summaries ADD CONSTRAINT fk_activity_daily_summaries_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
