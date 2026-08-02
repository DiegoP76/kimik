-- ===========================================
-- MIGRACION: Foto de perfil para profesionales
-- ===========================================

-- Agregar columna photo_url a professional_profiles
ALTER TABLE professional_profiles ADD COLUMN photo_url TEXT;

-- Crear bucket para fotos de profesionales
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-photos', 'professional-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: profesionales pueden subir su propia foto
CREATE POLICY "Professionals can upload own photo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'professional-photos'
    AND auth.role() = 'authenticated'
  );

-- Policy: cualquiera puede ver fotos
CREATE POLICY "Anyone can view professional photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'professional-photos');

-- Policy: profesionales pueden eliminar su propia foto
CREATE POLICY "Professionals can delete own photo" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'professional-photos'
    AND auth.role() = 'authenticated'
  );
