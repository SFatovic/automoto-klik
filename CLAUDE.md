# AutoZnalac — kontekst za Claude

## Projekt

Statična web aplikacija za hrvatsku auto publiku. Korisnik ispuni formu, app sastavi optimizirani AI prompt koji korisnik kopira u ChatGPT/Claude. Nema backenda, nema API poziva, nema npm-a.

## Stack

- HTML5 + CSS3 + vanilla JS (bez frameworka, bez build toolova)
- Bootstrap 5.3 (CDN)
- Microsoft Clarity (analytics)
- GitHub Pages hosting

---

## Struktura projekta

```
├── index.html              # Početna — hero, linkovi na alate i kvizove
├── ai-upiti.html           # Popis AI alata po kategorijama
├── kvizovi.html            # Popis svih kvizova
├── tool.html               # Generički shell za prikaz jednog AI alata
├── moje-vozilo.html        # Osobni tracker vozila
├── o-projektu.html         # Info o projektu
├── legal.html              # Uvjeti korištenja i privatnost
│
├── components.js           # GLOBALNO: header, footer, nav, Clarity init
├── app.js                  # AI alati: učitava manifest, renderira kartice, generira prompt
├── quiz-engine.js          # Kviz engine: pitanja, slike, bodovanje, rezultat
├── quizzes.js              # Pomoćni kod za kviz stranice
├── moje-vozilo.js          # Logika osobnog trackera vozila
├── style.css               # Custom CSS iznad Bootstrap 5.3
│
├── data/
│   ├── tools-manifest.json         # Popis svih AI alata s kategorijama
│   ├── quizzes-manifest.json       # Popis svih kvizova (24 kviza, 3 kategorije)
│   ├── tools/*.json                # Jedan JSON po alatu (pitanja + prompt logika)
│   └── quizzes/*.json              # Jedan JSON po kvizu (pitanja + slike)
│
└── assets/
    └── amk-kvizovi/                # Slike za kvizove
        └── [brand]-pictures/       # Npr. bmw-pictures/P1.jpg
```

---

## Arhitektura — kako aplikacija radi

**AI alati:** `app.js` učitava `tools-manifest.json` → renderira kartice → korisnik ispuni formu → app sastavlja gotov tekst AI upita → korisnik kopira u ChatGPT/Claude.

**Kvizovi:** `quiz-engine.js` učitava `quizzes-manifest.json` → prikazuje 10 pitanja s fotografijama → broji bodove → prikazuje rezultat.

**Globalne komponente:** `components.js` generira header, footer i navigaciju na svim stranicama. Mijenjaj samo ovdje.

---

## Kategorije sadržaja

**AI alati** — 4 kategorije:
- Odabir vozila (vrsta, motor, novo/polovno)
- Analiza vozila (usporedba, brand pregled, provjera rizika)
- Troškovi i kupnja (osiguranje, gume, razgovor s prodavateljem)
- Vlasništvo i lifestyle

**Kvizovi** — 24 kviza, 3 kategorije:
- Brand (17): Alfa Romeo, Aston Martin, Audi, BMW, Ferrari, Fiat, Ford, Honda, Lamborghini, Mazda, McLaren, Mercedes-Benz, Opel, Porsche, Renault, Volkswagen + povijest automobila
- F1 (6): Osnovni F1, Ferrari F1, Red Bull, McLaren F1, Mercedes F1, Williams F1
- Opći (1): Povijest automobila

---

## Konvencije — uvijek se pridržavaj

- Ne dodavati framework, build tool ni npm ovisnosti — nikad
- Novi AI alat → novi JSON u `data/tools/` + zapis u `tools-manifest.json`
- Novi kviz → novi JSON u `data/quizzes/` + zapis u `quizzes-manifest.json`
- CSS promjene → samo u `style.css`, nikad inline osim ako je nužno
- Globalne promjene (nav, footer, header) → samo u `components.js`
- Komentare u kodu pisati samo ako je logika neočigledna
- Sav tekst sučelja na hrvatskom jeziku

---

## Kako dodati novi AI alat

1. Dodaj zapis u `data/tools-manifest.json` (ID, naziv, kategorija, opis)
2. Napravi `data/tools/[id].json` s pitanjima i prompt logikom
3. Testiraj na `tool.html?id=[id]`

Šalji samo: ID, naziv, kategoriju i lista pitanja — JSON strukturu Claude piše sam.

## Kako dodati novi kviz

1. Dodaj zapis u `data/quizzes-manifest.json` (ID, naziv, kategorija)
2. Napravi `data/quizzes/[id].json` s 10 pitanja i putanjama slika
3. Slike stavi u `assets/amk-kvizovi/[brand]-pictures/`
4. Testiraj na stranici kvizova

Šalji samo: ID, naziv, kategoriju i 10 pitanja s odgovorima — JSON strukturu Claude piše sam.

---

## Strategija rada — štednja tokena

**Jedan zadatak po sesiji.** Nakon završetka koristi `/clear` prije novog zadatka.

**Kako formulirati zahtjev:**
- Navedi točno koja datoteka i koji dio se mijenja
- Za bugove: simptom + koja stranica/funkcija — ne šalji cijeli file
- Za vizualne promjene: opiši željeni izgled — ne šalji cijeli CSS
- Za novi sadržaj: navedi samo podatke, Claude piše strukturu

**Provjera konteksta:** `/context` — ako je iznad 70%, upiši `/compact`.
