require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Seeding database...');

  // Create warehouses
  const warehouses = await db.query(`
    INSERT INTO warehouses (name, address, lat, lng) VALUES
      ('Склад Центр', 'вул. Городоцька 50, Львів', 49.8397, 24.0297),
      ('Склад Захід', 'вул. Стрийська 120, Львів', 49.8180, 23.9900),
      ('Склад Схід', 'вул. Личаківська 80, Львів', 49.8350, 24.0650)
    RETURNING id, name
  `);

  // Create resources
  const resources = await db.query(`
    INSERT INTO resources (name, unit, category) VALUES
      ('Дизельне паливо', 'L', 'Паливо'),
      ('Бензин А-95', 'L', 'Паливо'),
      ('Мастило моторне', 'L', 'Мастила'),
      ('Причіпні стрічки', 'pcs', 'Обладнання'),
      ('Захисна плівка', 'roll', 'Пакування'),
      ('Паллети дерев''яні', 'pcs', 'Тара')
    RETURNING id, name
  `);

  const wh = warehouses.rows;
  const rs = resources.rows;

  // Set stock levels
  for (const w of wh) {
    for (const r of rs) {
      const qty = Math.floor(Math.random() * 800) + 100;
      await db.query(`
        INSERT INTO stock (warehouse_id, resource_id, quantity, min_threshold)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (warehouse_id, resource_id) DO NOTHING
      `, [w.id, r.id, qty, 50]);
    }
  }

  // Create delivery points
  const points = await db.query(`
    INSERT INTO delivery_points (name, address, lat, lng, contact_name, contact_phone) VALUES
      ('ТЦ Магнус', 'вул. Братів Міхновських 16', 49.8520, 24.0120, 'Іван Ткач', '+380 67 111 2233'),
      ('Завод Електрон', 'вул. Кульпарківська 100', 49.8250, 23.9750, 'Оксана Гук', '+380 50 222 3344'),
      ('Склад NOVA', 'Шевченківський р-н', 49.8640, 24.0430, 'Михайло Лис', '+380 63 333 4455'),
      ('АЗС WOG Стрийська', 'вул. Стрийська 30', 49.8200, 23.9880, 'Тарас Мар', '+380 99 444 5566'),
      ('Логіст-Буд', 'вул. Промислова 12', 49.8100, 24.0100, 'Наталя Ков', '+380 73 555 6677')
    RETURNING id, name
  `);

  // Create sample requests
  const priorities = ['normal', 'elevated', 'critical'];
  const statuses = ['pending', 'in_progress', 'pending', 'pending'];
  for (let i = 0; i < 8; i++) {
    const point = points.rows[i % points.rows.length];
    const resource = rs[i % rs.length];
    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];
    await db.query(`
      INSERT INTO supply_requests (delivery_point_id, resource_id, requested_quantity, priority, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [point.id, resource.id, Math.floor(Math.random() * 500) + 50, priority, status,
        priority === 'critical' ? 'Термінова потреба! Запаси закінчуються.' : null]);
  }

  // Create admin user
  const hash = await bcrypt.hash('admin123', 10);
  await db.query(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES ('admin@logistiq.ua', $1, 'Адміністратор', 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);

  const opHash = await bcrypt.hash('operator123', 10);
  await db.query(`
    INSERT INTO users (email, password_hash, name, role, warehouse_id)
    VALUES ('operator@logistiq.ua', $1, 'Оператор Склад 1', 'operator', $2)
    ON CONFLICT (email) DO NOTHING
  `, [opHash, wh[0].id]);

  console.log('✅ Seed complete!');
  console.log('   Admin: admin@logistiq.ua / admin123');
  console.log('   Operator: operator@logistiq.ua / operator123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
