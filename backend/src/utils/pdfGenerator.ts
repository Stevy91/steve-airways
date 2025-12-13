import puppeteer from "puppeteer";

export async function generatePDF(booking: any, pdfPath: string): Promise<void> {

  const flights = booking.flights || [];
  const passengers = booking.passengers || [];

  const passengerList = passengers.map((p: any) => `<li>${p.name}</li>`).join("");


  const flightCards = flights
    .map((f: any, i: number) => `
      <div class="flight-card">
        <div class="flight-header">${i === 0 ? "Outbound Flight" : "Return Flight"}</div>
        <div class="flight-details">
          <div>
            <strong>From:</strong> ${f.from}<br>
            <strong>To:</strong> ${f.to}<br>
            <strong>Date:</strong> ${f.date}
          </div>
          <div>
            <strong>Flight Number:</strong> ${f.code}
          </div>
        </div>
      </div>
    `)
    .join("");

  const html = `
  <html>
  <head>
    <style>
      body { font-family: Arial; padding: 20px; }
      .container { max-width: 800px; margin: auto; }
      .header { background: #1A237E; color: white; padding: 20px; text-align: center; }
      .flight-card { border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
      .flight-header { font-size: 18px; font-weight: bold; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>

    <div class="container">
      <div class="header">
        <h2>Your Booking is Confirmed</h2>
      </div>

      <h3>Booking Details</h3>
      <p><strong>Reference :</strong> ${booking.reference}</p>
      <p><strong>Contact Email :</strong> ${booking.contactEmail}</p>
      <p><strong>Payment Status :</strong> ${booking.paymentStatus}</p>
      <p><strong>Total Price :</strong> $${booking.totalPrice}</p>

      <h3>Passengers</h3>
      <ul>${passengerList}</ul>

      <h3>Flight Details</h3>
      ${flightCards}

    </div>

    <div style="page-break-after: always;"></div>

    <div class="container">
      <div class="header">
        <h2>Votre réservation est confirmée</h2>
      </div>

      <h3>Détails Réservation</h3>
      <p><strong>Référence :</strong> ${booking.reference}</p>
      <p><strong>Email :</strong> ${booking.contactEmail}</p>
      <p><strong>Status paiement :</strong> ${booking.paymentStatus}</p>
      <p><strong>Total :</strong> $${booking.totalPrice}</p>

      <h3>Passagers</h3>
      <ul>${passengerList}</ul>

      <h3>Détails Vol</h3>
      ${flightCards}

    </div>

  </body>
  </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();
}
