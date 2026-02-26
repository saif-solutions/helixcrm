-- Add File model without breaking existing relations
CREATE TABLE "File" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    metadata JSONB,
    "organizationId" UUID NOT NULL,
    "userId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to Organization
    CONSTRAINT "File_organizationId_fkey" 
        FOREIGN KEY ("organizationId") 
        REFERENCES "Organization"(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT "File_filename_organizationId_key" 
        UNIQUE (filename, "organizationId")
);

-- Create indexes
CREATE INDEX "File_organizationId_deletedAt_idx" ON "File"("organizationId", "deletedAt");
CREATE INDEX "File_userId_deletedAt_idx" ON "File"("userId", "deletedAt");
CREATE INDEX "File_mimeType_idx" ON "File"("mimeType");
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt");

-- Add relation to Organization model (update existing)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]';
