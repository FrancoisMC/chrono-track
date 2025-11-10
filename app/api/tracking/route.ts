import { NextRequest, NextResponse } from 'next/server'

const WSDL_URL = 'https://ws.chronopost.fr/tracking-cxf/TrackingServiceWS?wsdl'

interface TrackingRequest {
  skybillNumber: string
}

interface ChronopostResponse {
  status: string
  statusCode?: string
  statusMessage?: string
  date?: string
  name?: string
  deliveryDetails?: {
    deliveryDate?: string
    deliveryTime?: string
    recipientName?: string
    recipientAddress?: string
    signature?: string
    [key: string]: any
  }
  events?: Array<{
    date?: string
    time?: string
    code?: string
    label?: string
    officeLabel?: string
    [key: string]: any
  }>
  error?: string
}

/**
 * Appelle le service SOAP Chronopost pour obtenir le statut d'un colis
 */
async function trackPackage(skybillNumber: string): Promise<ChronopostResponse> {
  // Import dynamique de soap car c'est une bibliothèque Node.js
  const soapModule = await import('soap')
  const soap = soapModule.default || soapModule
  
  return new Promise((resolve, reject) => {
    soap.createClient(WSDL_URL, { 
      disableCache: true,
      wsdl_options: {
        timeout: 10000
      }
    }, (err, client) => {
      if (err) {
        reject(new Error(`Erreur lors de la création du client SOAP: ${err.message}`))
        return
      }

      if (!client) {
        reject(new Error('Impossible de créer le client SOAP'))
        return
      }

      // Structure de la requête selon le WSDL Chronopost
      // Chronopost utilise généralement trackSkybillV2 ou trackSkybill
      const args: any = {
        skybillNumber: skybillNumber
      }

      // Liste des méthodes possibles à essayer
      const possibleMethods = [
        'trackSkybillV2',
        'trackSkybill', 
        'track',
        'trackSkybillV3',
        'trackingSkybillV2'
      ]

      // Trouve la première méthode disponible
      let methodName: string | null = null
      for (const method of possibleMethods) {
        if (client[method] && typeof client[method] === 'function') {
          methodName = method
          break
        }
      }

      // Si aucune méthode standard n'est trouvée, cherche dynamiquement
      if (!methodName) {
        const soapMethod = Object.keys(client).find(key => 
          typeof client[key] === 'function' && 
          (key.toLowerCase().includes('track') || key.toLowerCase().includes('skybill'))
        )
        if (soapMethod) {
          methodName = soapMethod
        }
      }

      if (!methodName) {
        reject(new Error('Méthode de tracking non trouvée dans le WSDL. Méthodes disponibles: ' + Object.keys(client).filter(k => typeof client[k] === 'function').join(', ')))
        return
      }

      // Appel de la méthode trouvée
      client[methodName](args, (err: any, result: any) => {
        if (err) {
          reject(new Error(`Erreur SOAP: ${err.message || JSON.stringify(err)}`))
          return
        }
        
        if (!result) {
          reject(new Error('Aucune réponse du service Chronopost'))
          return
        }

        resolve(parseChronopostResponse(result))
      })
    })
  })
}

/**
 * Parse la réponse Chronopost et extrait les informations pertinentes
 */
function parseChronopostResponse(result: any): ChronopostResponse {
  // Format 1: result.return ou result.trackingResponse ou result.returnValue
  let data = result.return || result.trackingResponse || result.result || result.returnValue || result

  // Si data est un tableau, prendre le premier élément
  if (Array.isArray(data) && data.length > 0) {
    data = data[0]
  }

  if (!data || typeof data !== 'object') {
    return {
      status: 'unknown'
    }
  }

  // Extrait les événements depuis listEventInfoComp.events
  let events: any[] = []
  if (data.listEventInfoComp && data.listEventInfoComp.events && Array.isArray(data.listEventInfoComp.events)) {
    events = data.listEventInfoComp.events
  } else if (data.events && Array.isArray(data.events)) {
    events = data.events
  } else if (data.listEvents && Array.isArray(data.listEvents)) {
    events = data.listEvents
  }

  // Variables pour les champs principaux
  let status = 'unknown'
  let statusCode: string | undefined
  let statusMessage: string | undefined
  let date: string | undefined
  let name: string | undefined

  // Trouve le dernier événement (le plus récent) pour le status
  if (events.length > 0) {
    const lastEvent = events[events.length - 1]
    const eventCode = lastEvent.code || lastEvent.eventCode
    const eventLabel = lastEvent.eventLabel || lastEvent.label || lastEvent.statusLabel

    if (eventCode) {
      statusCode = String(eventCode)
    }

    if (eventLabel) {
      status = eventLabel
      statusMessage = eventLabel
    } else if (eventCode) {
      status = mapStatusToFrench(eventCode)
      statusMessage = status
    }
  }

  // Trouve l'événement avec code="D" pour extraire date et name
  const deliveredEvent = events.find((event: any) => {
    const code = event.code || event.eventCode
    return code === 'D' || String(code).toUpperCase() === 'D'
  })

  if (deliveredEvent) {
    // Ajoute date à la racine si code="D"
    const deliveryDate = deliveredEvent.eventDate || deliveredEvent.date || deliveredEvent.deliveryDate
    if (deliveryDate) {
      date = deliveryDate
    }

    // Ajoute name à la racine depuis infoCompList de l'événement avec code="D"
    if (deliveredEvent.infoCompList && Array.isArray(deliveredEvent.infoCompList)) {
      // Cherche l'élément avec name="Nom du réceptionnaire" ou similaire
      const nameComp = deliveredEvent.infoCompList.find((item: any) => 
        item.name && (
          item.name.toLowerCase().includes('réceptionnaire') || 
          item.name.toLowerCase().includes('nom') ||
          item.name.toLowerCase().includes('name')
        )
      )
      
      if (nameComp && nameComp.value) {
        name = nameComp.value
      } else if (deliveredEvent.infoCompList.length > 0) {
        // Sinon, prend le premier élément avec une valeur
        const firstComp = deliveredEvent.infoCompList.find((item: any) => item.value)
        if (firstComp && firstComp.value) {
          name = firstComp.value
        }
      }
    }
  }

  // Mappe les événements pour la réponse
  const mappedEvents = events.length > 0 ? events.map((event: any) => ({
    date: event.date || event.eventDate || event.deliveryDate,
    time: event.time || event.eventTime || event.deliveryTime,
    code: event.code || event.eventCode || event.statusCode,
    label: event.label || event.eventLabel || event.statusLabel || event.message,
    officeLabel: event.officeLabel || event.office || event.officeName,
    ...event
  })) : undefined

  // Construit la réponse dans l'ordre souhaité
  const response: ChronopostResponse = {
    status,
    ...(statusCode && { statusCode }),
    ...(statusMessage && { statusMessage }),
    ...(date && { date }),
    ...(name && { name }),
    deliveryDetails: { ...data },
    ...(mappedEvents && { events: mappedEvents })
  }

  return response
}

/**
 * Convertit le code de statut en libellé français
 */
function mapStatusToFrench(statusCode: string | number): string {
  const statusMap: { [key: string]: string } = {
    '0': 'En attente',
    '1': 'En transit',
    '2': 'Livré',
    '3': 'En attente de retrait',
    '4': 'Retourné',
    '5': 'Annoncé',
    '6': 'En cours de livraison',
    '7': 'Livré',
    '8': 'Non livré',
    '9': 'En attente',
    'D': 'Livré',
    'ND': 'Non livré',
    'R': 'Retourné',
    'T': 'En transit'
  }

  return statusMap[String(statusCode)] || 'Statut inconnu'
}

/**
 * GET /api/tracking?skybillNumber=XN081879383FR
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skybillNumber = searchParams.get('skybillNumber')

    if (!skybillNumber) {
      return NextResponse.json(
        { error: 'Le paramètre skybillNumber est requis' },
        { status: 400 }
      )
    }

    const result = await trackPackage(skybillNumber)
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('Erreur lors du tracking:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération du statut',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tracking
 * Body: { "skybillNumber": "XN081879383FR" }
 */
export async function POST(request: NextRequest) {
  try {
    const body: TrackingRequest = await request.json()
    const { skybillNumber } = body

    if (!skybillNumber) {
      return NextResponse.json(
        { error: 'Le paramètre skybillNumber est requis dans le body' },
        { status: 400 }
      )
    }

    const result = await trackPackage(skybillNumber)
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('Erreur lors du tracking:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération du statut',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

