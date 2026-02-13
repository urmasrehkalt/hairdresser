# Juuksurisalongi broneerimissüsteem – Salon 15

Minimaalne, kuid reaalselt kasutatav juuksurisalongi broneerimissüsteem.

**Avalik URL:** https://hairdresser.fsa.ee

---

## Paigaldamine ja käivitamine

### Eeldused

- **Node.js** 18+
- **npm** 9+

### 1. Klooni repositoorium

```bash
git clone git@github.com:urmasrehkalt/hairdresser.git
cd hairdresser
```

### 2. Installi sõltuvused

```bash
npm install
```

### 3. Käivita arenduskeskkonnas

```bash
npm run dev
```

See käivitab korraga:
- **Backend (Express API):** http://localhost:3000
- **Frontend (Vite dev server):** http://localhost:5173

Ava brauser aadressil **http://localhost:5173**.

### 4. Produktsioon (deploy)

```bash
# Ehita frontend
npm run build -w client

# Kustuta vana andmebaas (uus luuakse koos demo-andmetega automaatselt)
rm -f server/data.db
```

Seejärel teeninda `client/dist/` kausta staatiliste failidena (nt Caddy/Nginx).

Andmebaas (`server/data.db`) luuakse automaatselt esimesel käivitusel koos teenuste, juuksurite ja demo-broneeringutega.

### Deploy serverisse

```bash
sudo -u hairdresser bash -c '
cd /home/hairdresser/apps/hairdresser &&
git pull &&
npm install &&
npm run build -w client &&
rm -f server/data.db
'
sudo systemctl restart hairdresser
```

### Keskkonnamuutujad

| Muutuja | Vaikimisi | Kirjeldus |
|---------|-----------|-----------|
| `PORT` | `3000` | Serveri port |
| `ADMIN_TOKEN` | `salon15admin` | Admin-vaate parool |

---

## Funktsionaalsus

### Avalik broneerimisvaade (`/`)

Samm-sammuline wizard:

1. **Teenuse valik** – vali soovitud teenus (juukselõikus, habeme piiramine jne)
2. **Kuupäeva valik** – 8 päeva korraga, iga päeva juures vabade aegade arv ja jaotus juuksurite kaupa. Nupp "Veel aegu" laeb järgmised 8 päeva
3. **Kellaaeg** – vali juuksur ja tema vaba aeg (15-minutise sammuga)
4. **Kontaktandmed** – sisesta nimi ja telefon, kinnita broneering

**Broneerimisreeglid:**
- Topeltbroneerimine on välistatud (sh samaaegsete päringute korral – SQLite transaktsioon)
- 15-minutiline puhver iga broneeringu ees ja järel (nt 10:00–10:30 broneeringu järel saab järgmine alata alles 10:45)
- Sama päeva broneeringutel on 2-tunnine etteteatamise nõue
- Aegade kuvamine arvestab iga juuksuri individuaalset töögraafikut

### Admin-vaade (`/admin`)

- Kaitstud paroolipõhise autentimisega (Bearer token)
- **Broneeringute tab:** kõik tulevased broneeringud (grupeeritud kuupäeva järgi) või filtreerimine kuupäeva järgi; broneeringu tühistamine
- **Juuksurite tab:** juuksurite lisamine/kustutamine, iga juuksuri individuaalse töögraafiku haldamine (tööpäevad ja kellaajad)

---

## Projekti struktuur

```
hairdresser/
├── package.json              – Monorepo (workspaces)
├── .eslintrc.json            – Koodistandard (ESLint)
├── KIRJELDUS.md              – Töö kirjeldus (arhitektuur, turvalisus, koodistandard)
│
├── server/                   – Backend (Express.js API)
│   └── src/
│       ├── index.js          – Express käivitus ja vahevara
│       ├── database.js       – SQLite ühendus, migratsioonid, seed
│       ├── routes/index.js   – Marsruudid (avalik + admin)
│       ├── controllers/      – Päringute käsitlemine (MVC kontroller)
│       │   ├── bookingController.js
│       │   └── staffController.js
│       ├── models/           – Andmebaasipäringud (MVC mudel)
│       │   ├── bookingModel.js
│       │   ├── serviceModel.js
│       │   └── staffModel.js
│       ├── services/         – Äriloogika (ajakava, puhvrid)
│       │   └── scheduling.js
│       └── middleware/       – Autentimise vahevara
│           └── auth.js
│
└── client/                   – Frontend (React + Vite)
    └── src/
        ├── App.jsx           – Routing (BrowserRouter)
        ├── main.jsx          – Entry point
        ├── styles.css        – Kogu kujundus (dark theme)
        ├── components/
        │   └── Layout.jsx    – Ühine päis (nav + login), jalus
        ├── pages/
        │   ├── BookingPage.jsx – Samm-sammuline broneerimiswizard (vaade)
        │   └── AdminPage.jsx  – Admin broneeringute ja juuksurite haldus (vaade)
        └── services/
            └── api.js        – API klienditeek (HTTP päringud)
```

---

## Tehnoloogiad

| Komponent | Tehnoloogia |
|-----------|-------------|
| Frontend | React 18, Vite 5, React Router |
| Backend | Express.js 4, Node.js |
| Andmebaas | SQLite (better-sqlite3) |
| Kujundus | Vanilla CSS (dark theme) |
| Koodistandard | ESLint (.eslintrc.json) |
| Majutus | DigitalOcean VPS, Caddy (HTTPS), systemd |

---

## Töö kirjeldus

Üksikasjalik kirjeldus (klient-server arhitektuur, raamistiku põhjendus, turvalisuse ülevaade, koodistandard) on failis **[KIRJELDUS.md](KIRJELDUS.md)**.
