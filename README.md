# Chronopost Tracking Service

Service web Next.js pour vérifier le statut des colis Chronopost via leur API SOAP.

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Le serveur sera accessible sur [http://localhost:3000](http://localhost:3000)

## Utilisation de l'API

### GET Request

```
GET /api/tracking?skybillNumber=XN081879383FR
```

### POST Request

```
POST /api/tracking
Content-Type: application/json

{
  "skybillNumber": "XN081879383FR"
}
```

## Réponse JSON

La réponse contient les informations suivantes :

```json
{
  "status": "Livré",
  "statusCode": "D",
  "statusMessage": "Colis livré",
  "deliveryDetails": {
    "deliveryDate": "2024-01-15",
    "deliveryTime": "14:30",
    "recipientName": "Jean Dupont",
    "recipientAddress": "123 Rue Example, 75001 Paris",
    "signature": "J.Dupont"
  },
  "events": [
    {
      "date": "2024-01-15",
      "time": "14:30",
      "code": "D",
      "label": "Livré",
      "officeLabel": "Bureau de distribution"
    }
  ]
}
```

## Structure du projet

```
.
├── app/
│   ├── api/
│   │   └── tracking/
│   │       └── route.ts      # API route pour le tracking
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Page d'accueil
├── package.json
├── next.config.js
└── tsconfig.json
```

## Technologies utilisées

- Next.js 14 (App Router)
- TypeScript
- SOAP (bibliothèque `soap` pour appeler le WSDL Chronopost)

## Notes

Le service utilise le WSDL officiel de Chronopost :
`https://ws.chronopost.fr/tracking-cxf/TrackingServiceWS?wsdl`

La structure de la réponse peut varier selon la version du WSDL. Le code gère plusieurs formats de réponse possibles.

