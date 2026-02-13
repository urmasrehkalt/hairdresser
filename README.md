# Juuksurisalongi iseteenindusportaal – Salon 15

Avalik URL: https://hairdresser.fsa.ee

## Kohalik arendus

```
npm install
npm run dev
```

## Käivitus

- Backend (API): port 3000
- Frontend (Vite): port 5173

## Struktuur

```
server/src/
  index.js              – Express käivitus ja vahevara
  database.js           – SQLite ühendus, migratsioonid, seed
  routes/index.js       – Marsruudid (avalik + admin)
  controllers/          – Päringute käsitlemine
  models/               – Andmebaasipäringud
  services/             – Äriloogika (ajakava)
  middleware/            – Autentimine

client/src/
  App.jsx               – Peakomponent
  components/Layout.jsx – Ühtne päis ja jalus
  pages/BookingPage.jsx – Avalik broneerimisvaade
  pages/AdminPage.jsx   – Admin-vaade (kaitstud tokeniga)
  services/api.js       – API klienditeek
```

## Admin

Admin-vaade nõuab tokenit. Vaikimisi token: `salon15admin` (muudetav keskkonnamuutujaga `ADMIN_TOKEN`).

## Andmed

- SQLite fail: `server/data.db`
- Teenused ja juuksurid luuakse käivitusel automaatselt
