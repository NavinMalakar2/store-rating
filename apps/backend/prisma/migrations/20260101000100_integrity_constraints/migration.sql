-- Hand-written integrity rules that Prisma's schema language cannot express.

-- 1) A rating must be an integer from 1 through 5.
ALTER TABLE "Rating"
  ADD CONSTRAINT "Rating_rating_range_chk" CHECK ("rating" BETWEEN 1 AND 5);

-- 2) A store can only be owned by a user whose role is STORE_OWNER.
CREATE OR REPLACE FUNCTION enforce_store_owner_role() RETURNS trigger AS $$
BEGIN
  IF NEW."ownerId" IS NOT NULL AND
     (SELECT "role" FROM "User" WHERE "id" = NEW."ownerId") IS DISTINCT FROM 'STORE_OWNER' THEN
    RAISE EXCEPTION 'Store owner must have the STORE_OWNER role' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Store_owner_role_trg"
  BEFORE INSERT OR UPDATE OF "ownerId" ON "Store"
  FOR EACH ROW EXECUTE FUNCTION enforce_store_owner_role();

-- 3) Only users whose role is USER may submit ratings.
CREATE OR REPLACE FUNCTION enforce_rating_user_role() RETURNS trigger AS $$
BEGIN
  IF (SELECT "role" FROM "User" WHERE "id" = NEW."userId") IS DISTINCT FROM 'USER' THEN
    RAISE EXCEPTION 'Only normal users can submit ratings' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Rating_user_role_trg"
  BEFORE INSERT ON "Rating"
  FOR EACH ROW EXECUTE FUNCTION enforce_rating_user_role();

-- 4) A user who owns a store or has ratings cannot change role (protects consistency).
CREATE OR REPLACE FUNCTION protect_user_role_change() RETURNS trigger AS $$
BEGIN
  IF NEW."role" <> OLD."role" AND (
      EXISTS (SELECT 1 FROM "Store" WHERE "ownerId" = OLD."id") OR
      EXISTS (SELECT 1 FROM "Rating" WHERE "userId" = OLD."id")) THEN
    RAISE EXCEPTION 'Cannot change the role of a user that owns a store or has ratings' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_role_change_trg"
  BEFORE UPDATE OF "role" ON "User"
  FOR EACH ROW EXECUTE FUNCTION protect_user_role_change();
