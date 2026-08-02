-- ===========================================
-- KIMIK - Schema de Base de Datos
-- ===========================================

-- Profiles (Extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) CHECK (role IN ('user', 'professional', 'admin')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Perfiles Profesionales (Psicologos / Terapeutas)
CREATE TABLE professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  license_number VARCHAR(100) NOT NULL,
  specialty VARCHAR(100),
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Publicacion / Conflicto de Pareja
CREATE TABLE conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  audio_url TEXT,
  option_a VARCHAR(100) NOT NULL,
  option_b VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  is_premium_analysis BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) CHECK (status IN ('active', 'resolved', 'flagged')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votos Publicos (Comunidad)
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID REFERENCES conflicts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option CHAR(1) CHECK (selected_option IN ('A', 'B')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conflict_id, user_id)
);

-- Dictamenes / Devoluciones Profesionales
CREATE TABLE professional_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID REFERENCES conflicts(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
  selected_option CHAR(1) CHECK (selected_option IN ('A', 'B')),
  feedback_text TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conflict_id, professional_id)
);

-- ===========================================
-- RLS (Row Level Security)
-- ===========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_opinions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Professional profiles policies
CREATE POLICY "Professional profiles are viewable by everyone" ON professional_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own professional profile" ON professional_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own professional profile" ON professional_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conflicts policies
CREATE POLICY "Active conflicts are viewable by everyone" ON conflicts FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Authenticated users can create conflicts" ON conflicts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conflicts" ON conflicts FOR UPDATE USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vote" ON votes FOR UPDATE USING (auth.uid() = user_id);

-- Professional opinions policies
CREATE POLICY "Opinions are viewable by everyone" ON professional_opinions FOR SELECT USING (true);
CREATE POLICY "Professionals can create opinions" ON professional_opinions FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM professional_profiles WHERE id = professional_id)
);

-- ===========================================
-- Funciones y Triggers
-- ===========================================

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Funcion para obtener conteo de votos
CREATE OR REPLACE FUNCTION get_vote_counts(conflict_uuid UUID)
RETURNS TABLE(option_a_count BIGINT, option_b_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE selected_option = 'A') as option_a_count,
    COUNT(*) FILTER (WHERE selected_option = 'B') as option_b_count
  FROM votes
  WHERE conflict_id = conflict_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket para audios
INSERT INTO storage.buckets (id, name, public)
VALUES ('conflict-audios', 'conflict-audios', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload audios" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'conflict-audios'
    AND auth.role() = 'authenticated'
  );

-- Storage policy: anyone can view audios
CREATE POLICY "Anyone can view audios" ON storage.objects
  FOR SELECT USING (bucket_id = 'conflict-audios');
