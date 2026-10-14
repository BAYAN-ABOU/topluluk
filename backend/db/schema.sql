-- =========================================================
-- دليل الجالية - قاعدة البيانات الأساسية (PostgreSQL)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- لتوليد UUID

-- ---------------------------------------------------------
-- المستخدمين (كل من عنده حساب: صاحب بروفايل أو باحث عادي)
-- ---------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','provider','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- أنواع الخدمات (جدول مرجعي، مش نص حر، حتى الفلترة تكون دقيقة)
-- ---------------------------------------------------------
CREATE TABLE service_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,       -- مثال: 'أطباء'
  slug TEXT UNIQUE NOT NULL        -- مثال: 'doctors'
);

INSERT INTO service_types (name, slug) VALUES
  ('أطباء', 'doctors'),
  ('أساتذة', 'teachers'),
  ('ممرضون', 'nurses'),
  ('مكاتب عقارية', 'real_estate'),
  ('محامون ومترجمون', 'legal'),
  ('مطاعم ومحلات', 'shops');

-- ---------------------------------------------------------
-- المدن والمناطق (هيكلية شجرية بسيطة: مدينة → مناطقها)
-- ---------------------------------------------------------
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (city_id, name)
);

-- ---------------------------------------------------------
-- البروفايلات (الجدول الأساسي بالتطبيق)
-- details: حقل مرن (JSONB) لأي بيانات خاصة بنوع خدمة معين
--   - لدكتور: {"specialty": "أطفال", "years_experience": 12}
--   - لمكتب عقاري: {"property_types": ["بيوت","فلل"], "deal_type": "بيع وإيجار"}
-- ---------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,                 -- المسمى المعروض، مثال: "طبيب أطفال"
  service_type_id INTEGER NOT NULL REFERENCES service_types(id),
  city_id INTEGER NOT NULL REFERENCES cities(id),
  area_id INTEGER NOT NULL REFERENCES areas(id),
  languages TEXT,                          -- مثال: "عربي، تركي"
  bio TEXT,
  phone TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'pending'
       CHECK (verification_status IN ('pending','verified','rejected')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهارس تسرّع البحث والفلترة (أهم شي بتطبيق دليل)
CREATE INDEX idx_profiles_service ON profiles(service_type_id);
CREATE INDEX idx_profiles_city ON profiles(city_id);
CREATE INDEX idx_profiles_area ON profiles(area_id);
CREATE INDEX idx_profiles_search ON profiles
  USING GIN (to_tsvector('simple', full_name || ' ' || headline));

-- ---------------------------------------------------------
-- وثائق التوثيق (نسخة عن الترخيص/الشهادة) - غير عامة أبداً
-- ---------------------------------------------------------
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,       -- رابط ملف مخزن (S3 أو ما شابه)، أبداً نص مكشوف للعامة
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- بيانات أولية للمدن التركية الأكثر أهمية للجالية
-- ---------------------------------------------------------
INSERT INTO cities (name) VALUES
  ('إسطنبول'), ('غازي عنتاب'), ('أنقرة'), ('بورصة'), ('إزمير'), ('مرسين'), ('كلس');
