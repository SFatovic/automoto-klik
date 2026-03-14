const TOOLS = [
//"Preporuka vrste automobila"
    {
    id: "car-type",
    title: "Preporuka vrste automobila",
    description:
      "Na temelju načina korištenja, prioriteta i životne situacije generira AI upit za odabir najprikladnije vrste karoserije.",
    fields: [
      {
        id: "forWho",
        label: "Auto biram",
        type: "select",
        required: true,
        options: [
          "Samo za mene",
          "Za partnerica / partnericu",
          "Za mene i partnera/partnericu",
          "Za obitelj i djecu",
          "Za mladu osobu",
          "Za starijeg člana obitelji",
          "Za službeno vozilo / posao / zaposlenika"
        ]
      },
      {
        id: "usage",
        label: "Primarna namjena",
        type: "select",
        required: true,
        options: [
          "Pretežno gradska vožnja",
          "Kombinacija grada i otvorene ceste",
          "Duža putovanja / autoput",
          "Obiteljske aktivnosti i izleti",
          "Posao / profesionalna upotreba (npr. dostava, prevoz)",
          "Rekreativna ili vikend vožnja",
          "Različite situacije / kombinirana svakodnevna vožnja"
        ]
      },
      {
        id: "passengers",
        label: "Najčešći broj putnika",
        type: "select",
        required: true,
        options: [
          "1–2 osobe",
          "3–4 osobe",
          "5 osoba",
          "6-7 osoba"
        ]
      },
      {
        id: "luggage",
        label: "Prostor za prtljagu mi je",
        type: "select",
        required: true,
        options: [
          "Jako bitan - često prevozim veće stvari ili prtljagu",
          "Ne tako bitan - povremeno prevozim veće stvari ili prtljagu",
          "Nebitan - rijetko nešto prevozim"
        ]
      },
      {
        id: "priorities",
        label: "Najvažniji prioriteti su",
        type: "checkbox",
        required: true,
        options: [
          "Praktičnost i prostor",
          "Ekonomičnost i niski troškovi",
          "Udobnost",
          "Performanse",
          "Sigurnost",
          "Moderan dizajn",
          "Kompaktnost",
          "Luksuz i oprema",
          "Svestranost"
        ]
      },
      {
        id: "emotion",
        label: "Koliko ti je važna praktičnost naspram emocije",
        type: "select",
        required: true,
        options: [
          "Prije svega praktičnost",
          "Balans praktičnosti i užitka",
          "Želim auto koji me veseli"
        ]
      },
      {
        id: "height",
        label: "Preferiraš li povišena ili niža vozila",
        type: "select",
        required: true,
        options: [
          "Povišen (npr. SUV, crossover)",
          "Nemam posebnu preferenciju",
          "Niža (npr. limuzina, coupe)"
        ]
      },
      {
        id: "notes",
        label: "Dodatne napomene",
        type: "textarea",
        required: false,
        rows: 3
      }
    ],
    generatePrompt(data) {
      return `Ponašaj se kao iskusan automobilski savjetnik koji pomaže ljudima odabrati najprikladniju vrstu vozila prema njihovim stvarnim potrebama, načinu korištenja i životnoj situaciji. Razmišljaj praktično, objektivno i usmjereno na korisnika, kao stručnjak koji ima dugogodišnje iskustvo u autoindustriji i razumije različite životne stilove i potrebe vozača.

Na temelju tih informacija preporuči najprikladniju vrstu karoserije (npr. hatchback s 3 vrata, hatchback s 5 vrata, limuzina, karavan, SUV, pickup, MPV, cabrio, roadster, coupe, crossover ili drugo).

Podaci:
- Auto biram za: ${data.forWho}
- Primarna namjena: ${data.usage}
- Najčešći broj putnika: ${data.passengers}
- Prostor za prtljagu: ${data.luggage}
- Najvažniji prioriteti: ${data.priorities || "Nije navedeno"}
- Praktičnost vs emocija: ${data.emotion}
- Preferencija u vezi s visinom vozila: ${data.height}
- Dodatne napomene: ${data.notes || "Nema dodatnih napomena"}

Na temelju tih informacija:
1. Predloži glavni prijedlog vrste karoserije i objasni zašto je to najlogičniji izbor.
2. Predloži alternativne opcije vrste karoserije i objasni zašto bi i one mogle imati smisla.
3. Ukratko objasni prednosti i nedostatke svake relevantne opcije.
4. Daj završni savjet za donošenje informirane odluke.
5. Odgovor napiši jasno, praktično i bez nepotrebnog tehničkog žargona.`;
    }
    },
// "Preporuka za gume"
    {
    id: "tire-choice",
    title: "Preporuka guma",
    description:
      "Na temelju načina vožnje, uvjeta korištenja i prioriteta generiraj AI upit za odabir najprikladnije vrste guma.",
    fields: [
      {
        id: "vehicleClass",
        label: "Tip vozila",
        type: "select",
        required: true,
        options: [
          "Gradski automobil / hatchback",
          "Kompaktni automobil",
          "Limuzina",
          "Karavan",
          "SUV / crossover",
          "Terenac (4x4)",
          "Pick-Up",
          "Monovolumen MPV",
          "Kabriolet / roadster",
          "Sportski automobil / coupe",
          "Dostavno / radno vozilo",
          "Putnički kombi"
        ]
      },
      {
        id: "tireUsage",
        label: "Najčešći način korištenja",
        type: "select",
        required: true,
        options: [
          "Pretežno gradska vožnja",
          "Kombinacija grada i otvorene ceste",
          "Duža putovanja / autoput",
          "Dinamična vožnja",
          "Posao / profesionalna upotreba",
          "Različiti uvjeti tijekom godine"
        ]
      },
      {
        id: "type",
        label: "Koju vrstu gume trebaš",
        type: "select",
        required: true,
        options: [
          "Ljetnu",
          "Zimsku",
          "Cijelogodišnju",
          "Nisam siguran"
        ]
      },
      {
        id: "weather",
        label: "U kakvim uvjetima najčešće voziš",
        type: "select",
        required: true,
        options: [
          "Uglavnom suho i umjereno vrijeme",
          "Često kiša i mokra cesta",
          "Zimski uvjeti i snijeg",
          "Različiti vremenski uvjeti tijekom godine"
        ]
      },
      {
        id: "tirePriority",
        label: "Što ti je najvažnije kod guma",
        type: "checkbox",
        required: true,
        options: [
          "Sigurnost i prianjanje",
          "Dugotrajnost",
          "Niska buka",
          "Udobnost",
          "Performanse",
          "Povoljnija cijena",
          "Niska potrošnja"
        ]
      },
      {
        id: "notes",
        label: "Dodatne napomene",
        type: "textarea",
        required: false,
        rows: 3
      }
    ],
    generatePrompt(data) {
      return `Ponašaj se kao iskusan automobilski savjetnik specijaliziran za odabir guma. Analiziraj potrebe korisnika, način vožnje i uvjete korištenja vozila te preporuči najprikladniju vrstu guma.

Podaci:
- Tip vozila: ${data.vehicleClass}
- Najčešći način korištenja: ${data.tireUsage}
- Uvjeti vožnje: ${data.weather}
- Koju vrstu gume trebaš: ${data.type}
- Najvažniji prioriteti: ${data.tirePriority || "Nije navedeno"}
- Dodatne napomene: ${data.notes || "Nema dodatnih napomena"}

Na temelju tih informacija:
1. Preporuči najprikladniju vrstu i model guma.
2. Objasni zašto je to dobar izbor.
3. Navedi glavne prednosti i moguće nedostatke.
4. Ako ima smisla, predloži i alternativnu opciju.
5. Odgovor napiši jasno, praktično i bez nepotrebnog tehničkog žargona.`;
    }
    }
];