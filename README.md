# CLEANNY — Booking Platform (Website + Backend)

Full-stack cleaning booking platform: customer website, online booking with instant
reference, customer accounts, professional (cleaner) applications, admin dashboard,
and a JSON REST API — all in one Node.js app with a built-in SQLite database
(no database server to set up).

## RUN IT (2 commands)

```
npm install
npm start
```

Open http://localhost:3000

## LOGINS

- ADMIN: admin@cleanny.co.uk / cleanny2026  →  /admin
  (CHANGE THIS PASSWORD after first login — or edit db.js seed before first run)
- Customers create their own accounts at /signup

## WHAT'S INCLUDED

- Home, Services (with category filter), Service detail + booking form with live
  price estimate, Booking confirmation with reference (CLN-XXXX)
- Sign up / Sign in / My bookings (customer account)
- /pro — professional application form (like "Join as a Professional")
- /admin — bookings list with status updates (new → confirmed → completed →
  cancelled), edit service names/prices/live status, add new services,
  manage professional applications
- REST API: GET /api/services, GET /api/services/:slug, POST /api/bookings
  (ready for a future mobile app — same architecture as bookmyservices.co.uk)
- SQLite database file `cleanny.db` created automatically on first run,
  pre-seeded with 8 cleaning services

## DEPLOYMENT — IMPORTANT

This is a Node.js app, NOT a static site — it will NOT run from Hostinger
File Manager / public_html like your other sites.

Options:
1. HOSTINGER VPS — install Node 18+, upload this folder, `npm install`,
   run with pm2: `npm i -g pm2 && pm2 start server.js --name cleanny`,
   point your domain and add Nginx/Cloudflare in front.
2. RAILWAY / RENDER / FLY.IO — connect the folder as a project, they detect
   Node automatically, done in minutes (easiest option).
3. Any server with Node 18+.

Before going live:
- Set SESSION_SECRET env variable to a long random string
- Change the admin password
- Replace placeholder phone 020 0000 0000 and info@cleanny.co.uk in
  views/partials/foot.ejs and views/contact.ejs
- Back up `cleanny.db` regularly (it holds all bookings)

## STRUCTURE

```
server.js        all routes (pages + API + admin)
db.js            database schema + seed data
views/           EJS page templates
public/css       stylesheet (Cleanny brand system)
public/img       logo, favicon, hero + service icons (SVG)
public/js        small frontend JS (filters, price estimate)
cleanny.db       created on first run — your live data
```
