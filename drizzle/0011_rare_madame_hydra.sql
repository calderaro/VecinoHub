DO $$
DECLARE
  default_neighborhood_id uuid;
  default_creator_id uuid;
BEGIN
  SELECT id
    INTO default_neighborhood_id
  FROM neighborhoods
  WHERE lower(slug) = 'vecinohub-neighborhood'
  LIMIT 1;

  IF default_neighborhood_id IS NULL THEN
    SELECT id
      INTO default_creator_id
    FROM users
    ORDER BY created_at
    LIMIT 1;

    IF default_creator_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create default neighborhood without users';
    END IF;

    INSERT INTO neighborhoods (name, slug, status, created_by)
    VALUES ('VecinoHub Neighborhood', 'vecinohub-neighborhood', 'active', default_creator_id)
    RETURNING id INTO default_neighborhood_id;
  END IF;

  UPDATE groups
    SET neighborhood_id = default_neighborhood_id
  WHERE neighborhood_id IS NULL;

  UPDATE polls
    SET neighborhood_id = default_neighborhood_id
  WHERE neighborhood_id IS NULL;

  UPDATE fundraising_campaigns
    SET neighborhood_id = default_neighborhood_id
  WHERE neighborhood_id IS NULL;

  UPDATE events
    SET neighborhood_id = default_neighborhood_id
  WHERE neighborhood_id IS NULL;

  UPDATE posts
    SET neighborhood_id = default_neighborhood_id
  WHERE neighborhood_id IS NULL;

  INSERT INTO neighborhood_memberships (neighborhood_id, user_id, role, status)
  SELECT default_neighborhood_id, gm.user_id, 'neighbor', 'active'
  FROM (
    SELECT DISTINCT user_id
    FROM group_memberships
  ) gm
  ON CONFLICT (neighborhood_id, user_id) DO NOTHING;

  INSERT INTO neighborhood_memberships (neighborhood_id, user_id, role, status)
  SELECT default_neighborhood_id, u.id, 'neighborhood_admin', 'active'
  FROM users u
  WHERE u.role::text IN ('admin', 'platform_admin')
  ON CONFLICT (neighborhood_id, user_id) DO UPDATE
    SET role = 'neighborhood_admin',
        status = 'active';

  INSERT INTO neighborhood_memberships (neighborhood_id, user_id, role, status)
  SELECT default_neighborhood_id, g.admin_user_id, 'neighborhood_admin', 'active'
  FROM (
    SELECT DISTINCT admin_user_id
    FROM groups
    WHERE admin_user_id IS NOT NULL
  ) g
  ON CONFLICT (neighborhood_id, user_id) DO UPDATE
    SET role = 'neighborhood_admin',
        status = 'active';

  UPDATE neighborhood_memberships
    SET neighborhood_id = default_neighborhood_id
  WHERE neighborhood_id IS NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "neighborhood_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "fundraising_campaigns" ALTER COLUMN "neighborhood_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "neighborhood_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "neighborhood_memberships" ALTER COLUMN "neighborhood_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "polls" ALTER COLUMN "neighborhood_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "neighborhood_id" SET NOT NULL;
