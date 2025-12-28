-- Manual SQL script to add AiAnalysisStartedAt column to events table
-- Run this script in your SQL Server database if migration tool is not available

IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('events') 
    AND name = 'AiAnalysisStartedAt'
)
BEGIN
    ALTER TABLE [events]
    ADD [AiAnalysisStartedAt] datetimeoffset NULL;
    
    PRINT 'Column AiAnalysisStartedAt added successfully to events table';
END
ELSE
BEGIN
    PRINT 'Column AiAnalysisStartedAt already exists in events table';
END

