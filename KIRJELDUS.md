# Juuksurisalongi broneerimissüsteem – Salon 15

## Avalik URL

https://hairdresser.fsa.ee

Majutatakse DigitalOcean VPS-is (Ubuntu 24.04), Caddy veebiserver teenindab HTTPS-i automaatselt (Let's Encrypt). Node.js API jookseb systemd teenusena.

---

## Arhitektuur: klient-server

Rakendus koosneb kahest osast:

- **Frontend (klient)** – React SPA (Vite + React Router), mis jookseb brauseris. Kasutaja navigeerib samm-sammulise broneerimisviisardi kaudu: valib teenuse, kuupäeva, juuksuri ja kellaaja ning sisestab kontaktandmed. Kõik tegevused saadetakse HTTP päringutena backendi API-le (`/api/...`). Vastus tuleb JSON-ina ja React renderdab tulemuse.
- **Backend (server)** – Express.js API, mis võtab vastu päringuid, valideerib sisendeid, teostab äriloogikat (vabade aegade arvutamine, konflikti kontroll, puhvriajad) ja salvestab/loeb andmeid SQLite andmebaasist.

**Andmevoog näide:** Kasutaja valib teenuse → valib kuupäeva → brauser saadab `GET /api/availability?date=...&serviceId=...` → Express kontroller kutsub mudelit → mudel pärib SQLite-st olemasolevad broneeringud → scheduling-teenus arvutab vabad slotid (arvestades iga juuksuri individuaalset töögraafikut, 15-min puhvreid ja 2h etteteatamise nõuet) → kontroller tagastab JSON vastuse → React kuvab vabad ajad → kasutaja valib aja ja sisestab andmed → `POST /api/bookings` → kontroller valideerib sisendi → mudel loob transaktsioonilise broneeringu → kinnitus kuvatakse kasutajale.

---

## Raamistik

- **Express.js** (backend) – Node.js veebiraamistik, mis pakub marsruutimist, vahevara (middleware) süsteemi ja struktureeritud päringute käsitlemist. See on raamistik, kuna ta määrab rakenduse ülesehituse mustri (middleware pipeline, router, request/response tsükkel).
- **React** (frontend) – komponentpõhine UI raamistik, mis haldab olekut ja renderdamist deklaratiivselt.
- **React Router** – kliendipoolne marsruutimine (SPA navigatsioon `/` ja `/admin` vahel).

### MVC struktuur (backend)

| Roll | Kaust | Kirjeldus |
|------|-------|-----------|
| **Mudel** | `server/src/models/` | Andmebaasipäringud (serviceModel, staffModel, bookingModel) |
| **Kontroller** | `server/src/controllers/` | Päringute käsitlemine ja äriloogika delegeerimine |
| **Vaade** | `client/src/pages/` | React lehed (BookingPage, AdminPage) |
| **Marsruudid** | `server/src/routes/` | URL-de seostamine kontrolleritega |
| **Vahevara** | `server/src/middleware/` | Autentimine (auth.js) |
| **Teenused** | `server/src/services/` | Äriloogika (scheduling.js – slotid, puhvrid, töögraafik) |

### Korduvkasutatavad moodulid

Rakendus ei ole monoliitne fail – iga moodul vastutab ühe rolli eest:

- **`scheduling.js`** – vabade aegade arvutamine, konflikti kontroll, puhvrid (kasutatav nii üksiku päeva kui nädalaülevaate kontrollerites)
- **`auth.js`** – vahevara mis autendib admin-päringuid (kasutatav kõikides admin-marsruutides)
- **`api.js`** (klient) – HTTP klienditeek kõikide API päringute jaoks (kasutatav kõikides React lehtedes)
- **`Layout.jsx`** – ühine päis ja jalus, mida jagavad kõik lehed

---

## Turvalisus: ründevektorid ja kaitsemeetmed

| Ründevektor | Risk | Kaitsemeede |
|-------------|------|-------------|
| **SQL Injection** | Pahatahtlik SQL sisendväljade kaudu | Kasutame parameetrilisi SQL päringuid (`better-sqlite3` prepared statements). Kasutaja sisend ei jõua kunagi otse SQL-i. |
| **XSS (Cross-Site Scripting)** | Pahatahtlik JavaScript sisendväljade kaudu | React escapeb kõik väljastatavad väärtused automaatselt. Serveri poolel on sisendite pikkuse piirang ja sanitiseerimine (trim, slice). |
| **CSRF** | Võõras leht teeb päringuid kasutaja nimel | API on JSON-põhine, admin-päringud nõuavad `Authorization: Bearer` tokenit päises. Brauser ei saada seda automaatselt. |
| **Volitamata admin-ligipääs** | Keegi näeb/kustutab broneeringuid | Admin API marsruudid (`/api/admin/*`) on kaitstud tokeni-põhise autentimisega. Ilma kehtiva tokenita tagastatakse 401/403. |
| **Topeltbroneering (race condition)** | Kaks samaaegset päringut samale ajale | Broneeringu loomine toimub SQLite transaktsioonis – konflikti kontroll ja sisestamine on aatomne operatsioon. SQLite lukustab kirjutamisel kogu andmebaasi, välistades samaaegsed topeltkirjutused. |
| **Sisendite manipuleerimine** | Vigased või pahatahtlikud andmed | Serveri poolel valideeritakse: teenuse/juuksuri olemasolu, aja 15-min täpsus, tööaja piirid, nime minimaalne pikkus, telefoninumbri formaat. |

---

## Koodistandard

Projekt järgib ühtset koodistandardit, mis on fikseeritud `.eslintrc.json` failis:

- **Semikoolonid:** alati nõutud (`semi: always`)
- **Jutumärgid:** topeltjutumärgid (`quotes: double`)
- **Taandus:** 2 tühikut (`indent: 2`)
- **Koma:** multiline struktuuride lõpus alati (`comma-dangle: always-multiline`)
- **Muutujad:** `const`/`let` (mitte `var`), kasutamata muutujad hoiatavad
- **Võrdlus:** range võrdlus (`===`) nõutud

Kood on organiseeritud selge kaustapuuga: mudelid, kontrollerid, marsruudid, vahevara, teenused ja lehed on eraldi failides. Iga fail vastutab ühe konkreetse rolli eest.
