const { Pool } = require('pg');

// على Render/Supabase: بنستخدم رابط واحد DATABASE_URL (مع SSL)
// على جهازك المحلي: بنستخدم المتغيرات المنفصلة من ملف .env
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'community_directory',
    });

module.exports = pool;
