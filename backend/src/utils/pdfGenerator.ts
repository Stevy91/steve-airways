import puppeteer from "puppeteer";
import fs from "fs";

export async function generatePDF(bookingData: any, pdfPath: string, paymentMethod?: string, returnFlight?: any) {
  const formattedDepartureDate = new Date(bookingData.outbound.date).toLocaleDateString();
  const departureTime = bookingData.outbound.departure_time;
  const arrivalTime = bookingData.outbound.arrival_time;
  
  // Code barre URL
  const bookingReference = bookingData.reference || "ABC123";
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${bookingReference}&code=Code128&dpi=96`;

  // HTML complet du billet bilingue
  const htmlContent = `
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .header { background-color: #1A237E; color: white; padding: 20px; text-align: center; }
        .flight-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
        .flight-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      </style>
    </head>
    <body>
      <!-- Page 1: English -->
      <div class="container">
        <div class="header">
          <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px;">
          <p>Your Booking is Confirmed</p>
        </div>
        <div>
          <p>Dear ${bookingData.passengersData?.adults?.map(p => `${p.firstName} ${p.lastName}`).join(", ")}</p>
          <p>Thank you for choosing Trogon Airways. Please find your e-ticket below.</p>
        </div>
        <div>
          <h3>Flight Details</h3>
          <div class="flight-card">
            <div class="flight-header">Outbound Flight</div>
            <div class="flight-details">
              <div>
                <strong>From:</strong> ${bookingData.from}<br>
                <strong>To:</strong> ${bookingData.to}<br>
                <strong>Date:</strong> ${formattedDepartureDate}
              </div>
              <div>
                <strong>Departure:</strong> ${departureTime}<br>
                <strong>Arrival:</strong> ${arrivalTime}<br>
                <strong>Flight Number:</strong> ${bookingData.outbound.noflight}
              </div>
            </div>
          </div>
          ${returnFlight ? `
          <div class="flight-card">
            <div class="flight-header">Return Flight</div>
            <div class="flight-details">
              <div>
                <strong>From:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                <strong>To:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                <strong>Date:</strong> ${new Date(returnFlight.date).toLocaleDateString()}
              </div>
              <div>
                <strong>Departure:</strong> ${returnFlight.departure_time}<br>
                <strong>Arrival:</strong> ${returnFlight.arrival_time}<br>
                <strong>Flight Number:</strong> ${returnFlight.noflight}
              </div>
            </div>
          </div>` : ''}
        </div>
        <div>
          <p><strong>Booking Reference:</strong> ${bookingReference}</p>
        </div>
      </div>

      <div style="page-break-after: always;"></div>

      <!-- Page 2: French -->
      <div class="container">
        <div class="header">
          <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px;">
          <p>Votre réservation est confirmée</p>
        </div>
        <div>
          <p>Cher ${bookingData.passengersData?.adults?.map(p => `${p.firstName} ${p.lastName}`).join(", ")}</p>
          <p>Merci d'avoir choisi Trogon Airways. Veuillez trouver ci-dessous votre billet électronique.</p>
        </div>
        <div>
          <h3>Détails du vol</h3>
          <div class="flight-card">
            <div class="flight-header">Vol Aller</div>
            <div class="flight-details">
              <div>
                <strong>De:</strong> ${bookingData.from}<br>
                <strong>À:</strong> ${bookingData.to}<br>
                <strong>Date:</strong> ${formattedDepartureDate}
              </div>
              <div>
                <strong>Départ:</strong> ${departureTime}<br>
                <strong>Arrivée:</strong> ${arrivalTime}<br>
                <strong>Numéro du vol:</strong> ${bookingData.outbound.noflight}
              </div>
            </div>
          </div>
          ${returnFlight ? `
          <div class="flight-card">
            <div class="flight-header">Vol de retour</div>
            <div class="flight-details">
              <div>
                <strong>De:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                <strong>À:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                <strong>Date:</strong> ${new Date(returnFlight.date).toLocaleDateString()}
              </div>
              <div>
                <strong>Départ:</strong> ${returnFlight.departure_time}<br>
                <strong>Arrivée:</strong> ${returnFlight.arrival_time}<br>
                <strong>Numéro du vol:</strong> ${returnFlight.noflight}
              </div>
            </div>
          </div>` : ''}
        </div>
        <div>
          <p><strong>Référence réservation:</strong> ${bookingReference}</p>
        </div>
      </div>

    </body>
  </html>
  `;

  // Générer PDF
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();
}
