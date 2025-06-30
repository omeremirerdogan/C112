/*
  # Sosyal Medya Platformları ve Hizmetler Tabloları

  1. Yeni Tablolar
    - `platforms`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `icon` (text)
      - `description` (text)
      - `color` (text)
      - `is_active` (boolean)
      - `order_index` (integer)
      - `image` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `services`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `platform_id` (uuid, foreign key)
      - `prices` (jsonb)
      - `features` (text array)
      - `delivery_time` (text)
      - `quality` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Güvenlik
    - RLS etkin
    - Herkese okuma izni
    - Sadece admin'lere yazma izni
*/

-- Platforms tablosu
CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT '🌐',
  description text NOT NULL,
  color text NOT NULL DEFAULT 'from-blue-500 to-purple-600',
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Services tablosu
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  platform_id uuid REFERENCES platforms(id) ON DELETE CASCADE,
  prices jsonb NOT NULL DEFAULT '[]',
  features text[] NOT NULL DEFAULT '{}',
  delivery_time text NOT NULL DEFAULT '1-6 saat',
  quality text NOT NULL DEFAULT 'Yüksek',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS etkinleştir
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Herkese okuma izni
CREATE POLICY "Platforms are viewable by everyone"
  ON platforms
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Services are viewable by everyone"
  ON services
  FOR SELECT
  TO public
  USING (true);

-- Sadece authenticated kullanıcılara yazma izni (admin kontrolü uygulama seviyesinde)
CREATE POLICY "Platforms are editable by authenticated users"
  ON platforms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Services are editable by authenticated users"
  ON services
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Varsayılan platform verilerini ekle
INSERT INTO platforms (name, icon, description, color, is_active, order_index) VALUES
  ('Instagram', '📷', 'Instagram hesabınızı büyütmek için gereken tüm hizmetler', 'from-pink-500 to-purple-600', true, 1),
  ('YouTube', '🎥', 'YouTube kanalınızı büyütmek için etkili çözümler', 'from-red-500 to-red-600', true, 2),
  ('TikTok', '🎵', 'TikTok hesabınızı viral yapmak için profesyonel hizmetler', 'from-gray-800 to-gray-900', true, 3),
  ('Facebook', '👥', 'Facebook sayfanızı büyütmek için etkili stratejiler', 'from-blue-600 to-blue-800', true, 4),
  ('WhatsApp', '💬', 'WhatsApp gruplarınızı büyütmek için profesyonel hizmetler', 'from-green-500 to-green-600', true, 5),
  ('Snapchat', '👻', 'Snapchat hesabınızı güçlendirmek için etkili çözümler', 'from-yellow-400 to-yellow-500', true, 6),
  ('Telegram', '✈️', 'Telegram kanallarınızı büyütmek için profesyonel hizmetler', 'from-blue-400 to-blue-500', true, 7),
  ('Twitter/X', '🐦', 'Twitter hesabınızı güçlendirmek için profesyonel hizmetler', 'from-blue-500 to-cyan-500', true, 8)
ON CONFLICT (name) DO NOTHING;

-- Varsayılan hizmet verilerini ekle
DO $$
DECLARE
  instagram_id uuid;
  youtube_id uuid;
  tiktok_id uuid;
BEGIN
  -- Platform ID'lerini al
  SELECT id INTO instagram_id FROM platforms WHERE name = 'Instagram';
  SELECT id INTO youtube_id FROM platforms WHERE name = 'YouTube';
  SELECT id INTO tiktok_id FROM platforms WHERE name = 'TikTok';

  -- Instagram hizmetleri
  INSERT INTO services (name, description, category, platform_id, prices, features, delivery_time, quality, is_active) VALUES
    ('Premium Türk Takipçi', 'Gerçek Türk kullanıcılardan takipçi', 'Takipçi', instagram_id, 
     '[{"amount": 100, "price": 15.00}, {"amount": 250, "price": 35.00}, {"amount": 500, "price": 65.00}, {"amount": 1000, "price": 120.00}]',
     '{"Gerçek Türk hesaplar", "Drop koruması", "Hızlı teslimat"}', '0-2 saat', 'Premium', true),
    
    ('Instagram Beğeni', 'Gönderilerinize kaliteli beğeni', 'Beğeni', instagram_id,
     '[{"amount": 100, "price": 5.00}, {"amount": 500, "price": 20.00}, {"amount": 1000, "price": 35.00}, {"amount": 2500, "price": 80.00}]',
     '{"Hızlı teslimat", "Güvenli", "Drop koruması"}', '0-1 saat', 'Yüksek', true);

  -- YouTube hizmetleri
  INSERT INTO services (name, description, category, platform_id, prices, features, delivery_time, quality, is_active) VALUES
    ('YouTube Abone', 'Kanalınıza gerçek aboneler', 'Abone', youtube_id,
     '[{"amount": 100, "price": 25.00}, {"amount": 250, "price": 55.00}, {"amount": 500, "price": 100.00}, {"amount": 1000, "price": 180.00}]',
     '{"Gerçek hesaplar", "Drop koruması", "Kaliteli"}', '1-6 saat', 'Premium', true),
    
    ('YouTube İzlenme', 'Videolarınıza kaliteli izlenme', 'İzlenme', youtube_id,
     '[{"amount": 1000, "price": 15.00}, {"amount": 5000, "price": 65.00}, {"amount": 10000, "price": 120.00}, {"amount": 25000, "price": 280.00}]',
     '{"Hızlı teslimat", "Güvenli", "Organik görünüm"}', '0-4 saat', 'Yüksek', true);

  -- TikTok hizmetleri
  INSERT INTO services (name, description, category, platform_id, prices, features, delivery_time, quality, is_active) VALUES
    ('TikTok Takipçi', 'TikTok hesabınıza kaliteli takipçi', 'Takipçi', tiktok_id,
     '[{"amount": 100, "price": 12.00}, {"amount": 500, "price": 55.00}, {"amount": 1000, "price": 100.00}, {"amount": 2500, "price": 230.00}]',
     '{"Gerçek hesaplar", "Hızlı teslimat", "Drop koruması"}', '0-3 saat', 'Premium', true),
    
    ('TikTok Beğeni', 'Videolarınıza hızlı beğeni', 'Beğeni', tiktok_id,
     '[{"amount": 100, "price": 8.00}, {"amount": 500, "price": 35.00}, {"amount": 1000, "price": 65.00}, {"amount": 2500, "price": 150.00}]',
     '{"Hızlı teslimat", "Güvenli", "Kaliteli"}', '0-2 saat', 'Yüksek', true);
END $$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated at triggers
CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();