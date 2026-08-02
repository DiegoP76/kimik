-- ===========================================
-- MIGRACION 003: Categorias + Redes Sociales
-- ===========================================

-- Tabla de categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorias iniciales
INSERT INTO categories (name, slug) VALUES
  ('Convivencia', 'convivencia'),
  ('Celos', 'celos'),
  ('Dinero', 'dinero'),
  ('Familia', 'familia'),
  ('Otros', 'otros');

-- RLS para categorias
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver categorias activas
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Solo admin puede gestionar categorias
CREATE POLICY "Admin can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Agregar columnas de redes sociales a professional_profiles
ALTER TABLE professional_profiles ADD COLUMN instagram VARCHAR(100);
ALTER TABLE professional_profiles ADD COLUMN whatsapp VARCHAR(20);
