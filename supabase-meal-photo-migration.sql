-- Optional thumbnail for logged meals (stored in progress-photos bucket)
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_photo_storage_path TEXT;
