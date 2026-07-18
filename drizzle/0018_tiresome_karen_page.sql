DO $$
BEGIN
  IF EXISTS (
    SELECT source_id
    FROM fund_movements
    WHERE type = 'reversal' AND source_id IS NOT NULL
    GROUP BY source_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate reversal movements share a source_id; dedupe fund_movements before applying migration 0018 (the unique index below cannot be created otherwise)';
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "fund_movements_reversal_source_unique" ON "fund_movements" USING btree ("source_id") WHERE "fund_movements"."type" = 'reversal';