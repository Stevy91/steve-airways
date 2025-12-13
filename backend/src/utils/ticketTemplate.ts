export function generateTicketHTML({
  booking,
  passengers,
  flights,
  qrCode,
}: any): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>E-Ticket ${booking.booking_reference}</title>

<style>
  body {
    font-family: Arial, sans-serif;
    background: #f4f6f8;
    padding: 20px;
  }

  .container {
    max-width: 800px;
    margin: auto;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #ddd;
  }

  .header {
    background: #1A237E;
    color: white;
    padding: 20px;
    text-align: center;
  }

  .header img {
    height: 55px;
  }

  .section {
    padding: 20px;
  }

  h2 {
    color: #1A237E;
    margin-bottom: 10px;
  }

  .flight-card {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
  }

  .flight-header {
    font-weight: bold;
    margin-bottom: 10px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }

  th {
    background: #f2f2f2;
  }

  .qr {
    text-align: right;
  }

  .footer {
    font-size: 12px;
    color: #666;
    padding: 20px;
    text-align: center;
  }
</style>
</head>

<body>
<div class="container">

  <div class="header">
    <img src="https://trogonairways.com/logo-trogonpng.png" />
    <p>Billet électronique – ${booking.booking_reference}</p>
  </div>

  <div class="section qr">
    <img src="${qrCode}" width="120" />
  </div>

  <div class="section">
    <h2>Passagers</h2>
    <table>
      <tr><th>#</th><th>Nom</th></tr>
      ${passengers.map((p: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.first_name} ${p.last_name}</td>
        </tr>
      `).join("")}
    </table>
  </div>

  <div class="section">
    <h2>Détails du vol</h2>
    ${flights.map((f: any) => `
      <div class="flight-card">
        <div class="flight-header">${f.airline} — ${f.flight_number}</div>
        <p><strong>De :</strong> ${f.dep_name} (${f.dep_code})</p>
        <p><strong>À :</strong> ${f.arr_name} (${f.arr_code})</p>
        <p><strong>Départ :</strong> ${f.departure_time}</p>
        <p><strong>Arrivée :</strong> ${f.arrival_time}</p>
        <p><strong>Prix :</strong> $${f.price}</p>
      </div>
    `).join("")}
  </div>

  <div class="section">
    <h2>Total payé</h2>
    <p><strong>$${booking.total_price}</strong></p>
  </div>

  <div class="footer">
    Merci d'avoir choisi Trogon Airways ✈️<br/>
    Présentez ce billet à l'aéroport.
  </div>

</div>
</body>
</html>
`;
}
