-- AlterTable
ALTER TABLE "Laboratory" ADD COLUMN     "searchText" TEXT;


-- Trigram index over the folded search key. Chosen over tsvector because there
-- is no Uzbek text-search configuration in Postgres, and trigram matching also
-- tolerates the spelling variation already present in the source data.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Laboratory_searchText_trgm_idx"
  ON "Laboratory" USING GIN ("searchText" gin_trgm_ops);
