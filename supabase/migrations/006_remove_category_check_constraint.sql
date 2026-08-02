-- Remove the category CHECK constraint from conflicts table
-- so any category from the categories table can be used
ALTER TABLE conflicts DROP CONSTRAINT IF EXISTS conflicts_category_check;
