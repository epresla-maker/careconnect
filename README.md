# Pharmagister

Gyógyszertári helyettesítés platform.

## Technológiák

- **Next.js 16** - React keretrendszer
- **Firebase** - Backend (Auth, Firestore, Storage)
- **Tailwind CSS** - Styling
- **PWA** - Progressive Web App funkciók

## Telepítés

1. Clone the repository
2. Telepítsd a csomagokat:
```bash
npm install
```

3. Hozz létre egy `.env.local` fájlt a `.env.local.example` alapján és add meg a Firebase konfigurációt

4. Indítsd el a development szervert:
```bash
npm run dev
```

## Firebase Konfiguráció

Ez a projekt **ugyanazt a Firebase projektet használja mint a Nexus**, így az adatok megosztottak!

### Firestore Collections:
- `users` - Felhasználók (közös)
- `pharmagisterApprovals` - Pharmagister NNK jóváhagyások
- `tutomagisterApprovals` - Tutomagister NNK jóváhagyások
- `pharmaDemands` - Gyógyszertári helyettesítési igények
- `tutoDemands` - Idősgondozási igények
- `pharmaApplications` - Pharmagister jelentkezések
- `tutoApplications` - Tutomagister jelentkezések

## Projekt Struktúra

```
pharmagister/
├── app/
│   ├── components/        # Újrafelhasználható komponensek
│   ├── pharmagister/      # Pharmagister modul
│   ├── tutomagister/      # Tutomagister modul
│   ├── login/            # Bejelentkezés/regisztráció
│   ├── valasztas/        # Modul választás
│   └── page.js           # Főoldal
├── context/              # React Context (Auth, Theme, Toast)
├── lib/                  # Utility függvények és Firebase config
└── public/              # Statikus fájlok

```

## Deployment

### Vercel Deploy

```bash
npm run build
vercel --prod
```

### Environment Variables a Vercelben:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Funkciók

### Pharmagister 💊
- Gyógyszertári helyettesítési igények feladása
- Gyógyszerész/szakasszisztens keresése
- NNK validáció
- Jelentkezések kezelése
- Értékelési rendszer

### Tutomagister ❤️
- Ápoló/gondozó keresése
- Idősgondozási megbízások feladása
- NNK validáció
- Jelentkezések kezelése
- Tapasztalatok megosztása

## PWA Funkciók

- Offline működés
- App telepítés mobilra
- Push értesítések (jövőbeli fejlesztés)
- Háttérben történő szinkronizálás

## Licensz

Private - Ez a projekt az Erős Péter tulajdona.
