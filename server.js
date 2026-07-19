// Cleanny — booking platform server
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cleanny-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 14 }
}));

// expose user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.page = '';
  next();
});

const requireAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/signin?next=/admin');
};
const bookingRef = () =>
  'CLN-' + Date.now().toString(36).toUpperCase().slice(-4) +
  Math.random().toString(36).toUpperCase().slice(2, 6);

const TIME_SLOTS = ['08:00 – 10:00', '10:00 – 12:00', '12:00 – 14:00', '14:00 – 16:00', '16:00 – 18:00'];

// ---------------- Public pages ----------------
app.get('/', (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE active=1 ORDER BY sort').all();
  res.render('home', { services, page: 'home' });
});

app.get('/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE active=1 ORDER BY sort').all();
  const cats = [...new Set(services.map(s => s.category))];
  res.render('services', { services, cats, page: 'services' });
});

app.get('/services/:slug', (req, res) => {
  const service = db.prepare('SELECT * FROM services WHERE slug=? AND active=1').get(req.params.slug);
  if (!service) return res.status(404).render('404');
  res.render('service', { service, slots: TIME_SLOTS, page: 'services' });
});

app.post('/book/:slug', (req, res) => {
  const service = db.prepare('SELECT * FROM services WHERE slug=? AND active=1').get(req.params.slug);
  if (!service) return res.status(404).render('404');
  const { name, email, phone, address, postcode, date, time_slot, hours, notes } = req.body;
  if (!name || !email || !phone || !address || !postcode || !date || !time_slot) {
    return res.status(400).render('service', { service, slots: TIME_SLOTS, page: 'services', error: 'Please fill in all required fields.' });
  }
  let est = null;
  if (service.pricing_type === 'fixed') est = service.price;
  if (service.pricing_type === 'hourly') {
    const h = Math.max(parseInt(hours || service.min_hours, 10) || service.min_hours, service.min_hours);
    est = service.price * h;
  }
  const ref = bookingRef();
  db.prepare(`INSERT INTO bookings (ref,user_id,service_id,name,email,phone,address,postcode,date,time_slot,hours,notes,est_price)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(ref, req.session.user ? req.session.user.id : null, service.id,
         name, email, phone, address, postcode, date, time_slot,
         hours ? parseInt(hours, 10) : null, notes || '', est);
  res.render('confirmed', { ref, service, date, time_slot, est, page: '' });
});

app.get('/pro', (req, res) => res.render('pro', { page: 'pro' }));
app.post('/pro', (req, res) => {
  const { name, email, phone, area, services, experience } = req.body;
  if (!name || !email || !phone || !area || !services) {
    return res.status(400).render('pro', { page: 'pro', error: 'Please complete all required fields.' });
  }
  db.prepare('INSERT INTO pro_applications (name,email,phone,area,services,experience) VALUES (?,?,?,?,?,?)')
    .run(name, email, phone, area, services, experience || '');
  res.render('pro', { page: 'pro', done: true });
});

app.get('/faqs', (req, res) => res.render('faqs', { page: 'faqs' }));
app.get('/contact', (req, res) => res.render('contact', { page: 'contact' }));

// ---------------- Auth ----------------
app.get('/signup', (req, res) => res.render('signup', { page: '' }));
app.post('/signup', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).render('signup', { page: '', error: 'Fill in every field — password needs at least 6 characters.' });
  }
  try {
    const info = db.prepare('INSERT INTO users (name,email,phone,password_hash) VALUES (?,?,?,?)')
      .run(name.trim(), email.trim().toLowerCase(), phone || '', bcrypt.hashSync(password, 10));
    req.session.user = { id: info.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase(), role: 'customer' };
    res.redirect('/account');
  } catch (e) {
    res.status(400).render('signup', { page: '', error: 'That email already has an account. Try signing in.' });
  }
});

app.get('/signin', (req, res) => res.render('signin', { page: '', next: req.query.next || '/account' }));
app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').trim().toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.password_hash)) {
    return res.status(401).render('signin', { page: '', next: req.body.next || '/account', error: 'Email or password is incorrect.' });
  }
  req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role };
  res.redirect(u.role === 'admin' ? '/admin' : (req.body.next || '/account'));
});

app.post('/signout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/account', (req, res) => {
  if (!req.session.user) return res.redirect('/signin');
  const bookings = db.prepare(`SELECT b.*, s.name AS service_name FROM bookings b
    JOIN services s ON s.id=b.service_id
    WHERE b.user_id=? OR b.email=? ORDER BY b.created_at DESC`)
    .all(req.session.user.id, req.session.user.email);
  res.render('account', { bookings, page: '' });
});

// ---------------- Admin ----------------
app.get('/admin', requireAdmin, (req, res) => {
  const stats = {
    bookings: db.prepare('SELECT COUNT(*) c FROM bookings').get().c,
    newBookings: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status='new'").get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(est_price),0) t FROM bookings WHERE status IN ('confirmed','completed')").get().t,
    pros: db.prepare("SELECT COUNT(*) c FROM pro_applications WHERE status='new'").get().c
  };
  const bookings = db.prepare(`SELECT b.*, s.name AS service_name FROM bookings b
    JOIN services s ON s.id=b.service_id ORDER BY b.created_at DESC LIMIT 100`).all();
  const services = db.prepare('SELECT * FROM services ORDER BY sort').all();
  const pros = db.prepare('SELECT * FROM pro_applications ORDER BY created_at DESC').all();
  res.render('admin', { stats, bookings, services, pros, page: 'admin' });
});

app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
  const ok = ['new', 'confirmed', 'completed', 'cancelled'];
  if (ok.includes(req.body.status)) {
    db.prepare('UPDATE bookings SET status=? WHERE id=?').run(req.body.status, req.params.id);
  }
  res.redirect('/admin#bookings');
});

app.post('/admin/pros/:id/status', requireAdmin, (req, res) => {
  const ok = ['new', 'contacted', 'approved', 'rejected'];
  if (ok.includes(req.body.status)) {
    db.prepare('UPDATE pro_applications SET status=? WHERE id=?').run(req.body.status, req.params.id);
  }
  res.redirect('/admin#pros');
});

app.post('/admin/services', requireAdmin, (req, res) => {
  const { name, category, pricing_type, price, min_hours, short_desc, long_desc } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  db.prepare(`INSERT INTO services (slug,name,category,short_desc,long_desc,pricing_type,price,min_hours,image,sort)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(slug, name, category || 'Cleaning', short_desc || '', long_desc || short_desc || '',
         pricing_type, price ? parseFloat(price) : null, parseInt(min_hours || '0', 10), '/img/svc-generic.svg', 100);
  res.redirect('/admin#services');
});

app.post('/admin/services/:id/update', requireAdmin, (req, res) => {
  const { name, price, pricing_type, active } = req.body;
  db.prepare('UPDATE services SET name=?, price=?, pricing_type=?, active=? WHERE id=?')
    .run(name, price ? parseFloat(price) : null, pricing_type, active === 'on' ? 1 : 0, req.params.id);
  res.redirect('/admin#services');
});

// ---------------- REST API (JSON) ----------------
app.get('/api/services', (req, res) => {
  res.json(db.prepare('SELECT id,slug,name,category,short_desc,pricing_type,price,min_hours FROM services WHERE active=1 ORDER BY sort').all());
});
app.get('/api/services/:slug', (req, res) => {
  const s = db.prepare('SELECT * FROM services WHERE slug=? AND active=1').get(req.params.slug);
  s ? res.json(s) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/bookings', (req, res) => {
  const { service_slug, name, email, phone, address, postcode, date, time_slot } = req.body || {};
  const s = db.prepare('SELECT * FROM services WHERE slug=? AND active=1').get(service_slug || '');
  if (!s) return res.status(404).json({ error: 'Unknown service' });
  if (![name, email, phone, address, postcode, date, time_slot].every(Boolean)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const ref = bookingRef();
  db.prepare(`INSERT INTO bookings (ref,service_id,name,email,phone,address,postcode,date,time_slot,est_price)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(ref, s.id, name, email, phone, address, postcode, date, time_slot,
         s.pricing_type === 'fixed' ? s.price : null);
  res.status(201).json({ ref, status: 'new' });
});

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => console.log(`Cleanny running on http://localhost:${PORT}`));
