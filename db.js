// Cleanny — database layer (SQLite, zero-config)
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'cleanny.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- customer | admin
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Cleaning',
  short_desc TEXT NOT NULL,
  long_desc TEXT NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'fixed', -- fixed | hourly | quote
  price REAL,                                 -- fixed price or hourly rate
  min_hours INTEGER DEFAULT 0,
  image TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  service_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  postcode TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  hours INTEGER,
  notes TEXT,
  est_price REAL,
  status TEXT NOT NULL DEFAULT 'new', -- new | confirmed | completed | cancelled
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pro_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL,
  services TEXT NOT NULL,
  experience TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | approved | rejected
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- Seed ----------
const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (userCount === 0) {
  db.prepare(
    `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)`
  ).run(
    'Cleanny Admin',
    'admin@cleanny.co.uk',
    '',
    bcrypt.hashSync('cleanny2026', 10),
    'admin'
  );
}

const svcCount = db.prepare('SELECT COUNT(*) c FROM services').get().c;
if (svcCount === 0) {
  const ins = db.prepare(`INSERT INTO services
    (slug, name, category, short_desc, long_desc, pricing_type, price, min_hours, image, sort)
    VALUES (@slug,@name,@category,@short_desc,@long_desc,@pricing_type,@price,@min_hours,@image,@sort)`);
  const seed = [
    {
      slug: 'domestic-cleaning', name: 'Domestic Cleaning', category: 'Cleaning',
      short_desc: 'Regular home cleaning — kitchens, bathrooms, dusting, vacuuming and general upkeep.',
      long_desc: 'Professional domestic cleaning for busy homes. Your Cleanny professional covers kitchens, bathrooms, dusting, vacuuming, mopping and general upkeep so your home stays fresh and tidy week after week. Book one-off or set up a recurring visit.',
      pricing_type: 'hourly', price: 23, min_hours: 3, image: '/img/svc-domestic.svg', sort: 10
    },
    {
      slug: 'end-of-tenancy-cleaning', name: 'End of Tenancy Cleaning', category: 'Cleaning',
      short_desc: 'Deposit-back deep clean for tenants, landlords and letting agents.',
      long_desc: 'A full top-to-bottom clean to agency checklist standard: deep kitchen and appliance cleaning, bathrooms descaled and sanitised, inside windows, skirtings, cupboards inside and out. Designed to help tenants get deposits back and get properties move-in ready.',
      pricing_type: 'fixed', price: 120, min_hours: 0, image: '/img/svc-eot.svg', sort: 20
    },
    {
      slug: 'deep-cleaning', name: 'Deep Home Cleaning', category: 'Cleaning',
      short_desc: 'Intensive clean for built-up dirt, grease and hidden grime.',
      long_desc: 'For homes that need more than an everyday clean. We remove built-up dirt, dust, limescale, grease and hidden grime room by room — behind and under furniture, inside appliances, tiles and grout — leaving the whole home genuinely fresh.',
      pricing_type: 'fixed', price: 140, min_hours: 0, image: '/img/svc-deep.svg', sort: 30
    },
    {
      slug: 'carpet-cleaning', name: 'Carpet Cleaning', category: 'Cleaning',
      short_desc: 'Hot-water extraction that lifts stains, dust and odours from carpets.',
      long_desc: 'Professional hot-water extraction cleaning that lifts hidden dust, stains and everyday dirt out of carpets and rugs, leaving rooms softer, cleaner and fresher. Priced per room with discounts for whole-home bookings.',
      pricing_type: 'fixed', price: 30, min_hours: 0, image: '/img/svc-carpet.svg', sort: 40
    },
    {
      slug: 'oven-cleaning', name: 'Oven Cleaning', category: 'Cleaning',
      short_desc: 'Ovens, hobs and extractors degreased and polished like new.',
      long_desc: 'Single and double ovens, hobs, extractor hoods and microwaves stripped of burnt-on grease using non-caustic products — racks and trays soaked and polished, glass doors cleaned inside and out.',
      pricing_type: 'fixed', price: 55, min_hours: 0, image: '/img/svc-oven.svg', sort: 50
    },
    {
      slug: 'office-cleaning', name: 'Office Cleaning', category: 'Commercial',
      short_desc: 'Reliable daily, weekly or one-off cleaning for offices and workspaces.',
      long_desc: 'Keep your workspace spotless with scheduled office cleaning: desks, floors, kitchens, washrooms and communal areas — out of hours or during the day, with vetted, insured professionals and a consistent team.',
      pricing_type: 'quote', price: null, min_hours: 0, image: '/img/svc-office.svg', sort: 60
    },
    {
      slug: 'after-builders-cleaning', name: 'After Builders Cleaning', category: 'Cleaning',
      short_desc: 'Post-renovation dust and debris removed down to the last speck.',
      long_desc: 'Renovation done? We handle the aftermath: fine dust on every surface, paint splashes, plaster residue, sticker marks on new glass — cleaned methodically so you can enjoy the finished space straight away.',
      pricing_type: 'quote', price: null, min_hours: 0, image: '/img/svc-builders.svg', sort: 70
    },
    {
      slug: 'upholstery-cleaning', name: 'Upholstery Cleaning', category: 'Cleaning',
      short_desc: 'Sofas, mattresses and chairs refreshed and sanitised.',
      long_desc: 'Deep extraction cleaning for sofas, armchairs, mattresses and fabric headboards — removing dust mites, stains and odours, and extending the life of your furniture.',
      pricing_type: 'fixed', price: 45, min_hours: 0, image: '/img/svc-upholstery.svg', sort: 80
    }
  ];
  const tx = db.transaction(rows => rows.forEach(r => ins.run(r)));
  tx(seed);
}

module.exports = db;
