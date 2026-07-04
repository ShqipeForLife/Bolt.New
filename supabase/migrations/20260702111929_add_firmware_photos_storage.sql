-- Add firmware photo URLs column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS firmware_photo_urls text[];

-- Create storage bucket for firmware photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firmware-photos',
  'firmware-photos',
  true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload (anon + authenticated)
CREATE POLICY "firmware_photos_insert" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'firmware-photos');

-- Allow public read
CREATE POLICY "firmware_photos_select" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'firmware-photos');
