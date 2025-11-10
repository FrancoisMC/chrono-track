export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Chronopost Tracking Service</h1>
      <p>Service web pour vérifier le statut des colis Chronopost</p>
      <h2>Utilisation de l'API</h2>
      <p>
        Endpoint: <code>GET /api/tracking?skybillNumber=XN081879383FR</code>
      </p>
      <p>
        Ou <code>POST /api/tracking</code> avec body JSON: 
        <code>{'{"skybillNumber": "XN081879383FR"}'}</code>
      </p>
    </main>
  )
}

