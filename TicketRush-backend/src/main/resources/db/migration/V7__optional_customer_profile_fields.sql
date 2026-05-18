ALTER TABLE customer_profiles
    ALTER COLUMN phone DROP NOT NULL,
    ALTER COLUMN date_of_birth DROP NOT NULL,
    ALTER COLUMN gender DROP NOT NULL;

UPDATE customer_profiles
SET phone = NULL
WHERE phone = '0000000000';

UPDATE customer_profiles
SET date_of_birth = NULL,
    gender = NULL
WHERE phone IS NULL
  AND date_of_birth = DATE '1970-01-01'
  AND gender = 'OTHER';
