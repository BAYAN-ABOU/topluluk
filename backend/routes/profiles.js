const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

/**
 * GET /api/profiles
 * فلترة وبحث: ?service=doctors&city=إسطنبول&area=الفاتح&q=أطفال
 * كل باراميتر اختياري، ويشتغلوا مع بعض (AND)
 */
router.get('/', async (req, res) => {
  try {
    const { service, city, area, q } = req.query;
    const conditions = ["p.is_active = true"];
    const params = [];

    if (service) {
      params.push(service);
      conditions.push(`st.slug = $${params.length}`);
    }
    if (city) {
      params.push(city);
      conditions.push(`c.name = $${params.length}`);
    }
    if (area) {
      params.push(area);
      conditions.push(`a.name = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(p.full_name ILIKE $${params.length} OR p.headline ILIKE $${params.length})`);
    }

    const sql = `
      SELECT p.id, p.full_name, p.headline, p.languages, p.bio, p.details,
             p.verification_status, p.phone,
             st.name AS service, c.name AS city, a.name AS area
      FROM profiles p
      JOIN service_types st ON st.id = p.service_type_id
      JOIN cities c ON c.id = p.city_id
      JOIN areas a ON a.id = p.area_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT 100;
    `;
    const { rows } = await pool.query(sql, params);
    res.json({ count: rows.length, results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
  }
});

/**
 * POST /api/profiles
 * إنشاء بروفايل جديد - بيدخل بحالة "pending" لحد ما يتوثق يدوياً
 * body: { full_name, headline, service_slug, city_name, area_name, languages, bio, phone, details }
 */
router.post('/', async (req, res) => {
  const { full_name, headline, service_slug, city_name, area_name, languages, bio, phone, details } = req.body;

  if (!full_name || !headline || !service_slug || !city_name || !area_name) {
    return res.status(400).json({ error: 'الرجاء تعبئة الاسم والمسمى والخدمة والمدينة والمنطقة' });
  }

  try {
    const serviceRes = await pool.query('SELECT id FROM service_types WHERE slug = $1', [service_slug]);
    if (!serviceRes.rows[0]) return res.status(400).json({ error: 'نوع خدمة غير معروف' });
    const serviceId = serviceRes.rows[0].id;

    // المدينة: إذا مش موجودة، منضيفها (المستخدم قد يكتب مدينة جديدة)
    let cityRes = await pool.query('SELECT id FROM cities WHERE name = $1', [city_name]);
    if (!cityRes.rows[0]) {
      cityRes = await pool.query('INSERT INTO cities (name) VALUES ($1) RETURNING id', [city_name]);
    }
    const cityId = cityRes.rows[0].id;

    // المنطقة: نفس المنطق، مرتبطة بالمدينة
    let areaRes = await pool.query('SELECT id FROM areas WHERE city_id = $1 AND name = $2', [cityId, area_name]);
    if (!areaRes.rows[0]) {
      areaRes = await pool.query('INSERT INTO areas (city_id, name) VALUES ($1, $2) RETURNING id', [cityId, area_name]);
    }
    const areaId = areaRes.rows[0].id;

    const insertRes = await pool.query(
      `INSERT INTO profiles
        (full_name, headline, service_type_id, city_id, area_id, languages, bio, phone, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, verification_status`,
      [full_name, headline, serviceId, cityId, areaId, languages || null, bio || null, phone || null, details || {}]
    );

    res.status(201).json({
      message: 'تم استلام بروفايلك، وهو الآن قيد المراجعة والتوثيق',
      profile: insertRes.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ البروفايل' });
  }
});

module.exports = router;
