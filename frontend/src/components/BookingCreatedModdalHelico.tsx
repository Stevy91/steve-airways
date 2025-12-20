import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { format, parseISO, isValid, parse } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const SENDER_EMAIL = "booking@trogonairways.com"; // adresse "from"

type Flight = {
    id: number;
    flight_number: string;
    airline: string;
    from?: string;
    to?: string;
    departure: string;
    arrival: string;
    price: number;
    type?: string;
    totalPrice: number;
    fromCity: string;
    toCity: string;
};

type BookingCreatedModalProps = {
    onTicketCreated?: () => void;
    open: boolean;
    flight: Flight | null;
    onClose: () => void;
};
type Passenger = {
    firstName: string;
    flightNumberReturn?: string;
    middleName?: string;
    lastName: string;
    reference: string;
    nom_urgence: string;
    email_urgence: string;
    tel_urgence: string;
    dateOfBirth?: string;
    gender?: string;
    title?: string;
    address?: string;
    type: string;
    typeVol?: string;
    typeVolV?: string;
    country?: string;
    nationality?: string;
    phone?: string;
    email?: string;
};

type BookingData = {
    from: string;
    to: string;
    fromCity?: string;
    toCity?: string;
    outbound: any;
    return?: any;
    passengersData: {
        adults: Passenger[];
        children?: Passenger[];
        infants?: Passenger[];
    };
    tabType?: string;
    totalPrice: number;
};

// const generateEmailContent = (bookingData: BookingData, bookingReference: string, paymentMethod: string): string => {
//     const outboundFlight = bookingData.outbound;
//     const returnFlight = bookingData.return;
//     const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${bookingReference}&code=Code128&dpi=96`;

//     const timeZone = "America/Port-au-Prince";

//     const formatDate = (dateString?: string) => {
//         if (!dateString) return "N/A";

//         try {
//             const [datePart] = dateString.split(" "); // Prend juste la date
//             const parsedDate = parse(datePart, "yyyy-MM-dd", new Date());

//             // Convertir en fuseau horaire Haïti
//             const zonedDate = toZonedTime(parsedDate, timeZone);

//             // Formater sans passer timeZone dans options
//             return format(zonedDate, "EEE, dd MMM");
//         } catch (err) {
//             console.error("Erreur formatDate:", err, dateString);
//             return "Invalid date";
//         }
//     };

//     const formatDateToday = () => {
//         const now = toZonedTime(new Date(), timeZone);
//         return format(now, "EEE, dd MMM");
//     };

//     // Exemple pour ton vol
//     const [departureDateStr] = outboundFlight.departure_time.split(" ");
//     const parsedDepartureDate = parse(departureDateStr, "yyyy-MM-dd", new Date());
//     const zonedDepartureDate = toZonedTime(parsedDepartureDate, timeZone);
//     const formattedDepartureDate = format(zonedDepartureDate, "EEE, dd MMM");

//     const [departureDate, departureTime] = outboundFlight.departure_time.split(" ");
//     const [returnDepartureDate, returnDepartureTime] = returnFlight.departure_time.split(" ");
//     const [arrivalDate, arrivalTime] = outboundFlight.arrival_time.split(" ");
//     const [returnArrivalDate, returnArrivalTime] = returnFlight.arrival_time.split(" ");

//     const [arrivalDateStr] = outboundFlight.arrival_time.split(" ");
//     const parsedArrivalDate = parse(arrivalDateStr, "yyyy-MM-dd", new Date());
//     const zonedArrivalDate = toZonedTime(parsedArrivalDate, timeZone);
//     const formattedArrivalDate = format(zonedArrivalDate, "EEE, dd MMM");
// const isRoundTrip = returnFlight && returnFlight.noflight;
//     return `
//     <style>
//         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//         .header { background-color: #f0f7ff; padding: 20px; text-align: center; border-radius: 5px; }
//         .flight-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
//         .flight-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
//         .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
//         .passenger-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
//         .passenger-table th, .passenger-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
//         .passenger-table th { background-color: #f2f2f2; }
//         .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
//     </style>
//     <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
//       <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
//         <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
//         <p style="margin: 5px 0 0; font-size: 1.2em;">Your Booking is Confirmed</p>
//       </div>

//       <div style="padding: 20px;">
//         <p>Dear, ${bookingData.passengersData?.adults?.map((passenger: Passenger) => `${passenger.firstName} ${passenger.lastName}`).join(", ")}</p>
//         <p>Thank you for choosing Trogon Airways. Please find your e-ticket below. We recommend printing this section or having it available on your mobile device at the airport.</p>
//       </div>

//       <!-- E-Ticket Section -->
//       <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
//         <div style="padding: 20px; text-align: center;">
//           <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Payment Method:</strong> 

//           ${paymentMethod === "cash" ? "Cash" : paymentMethod === "card" ? "Credit/Debit Card" : paymentMethod === "cheque" ? "Bank Check" : paymentMethod === "virement" ? "Bank transfer" : paymentMethod === "transfert" ? "Transfer" : "Contrat"}
//           </p>
//           <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${
//               bookingData.tabType === "helicopter" ? "Helicopter" : "Helicopter"
//           }</p>
//         </div>

//         <div style=" background: rgba(0, 28, 150, 0.3);
//               border: 1px solid #eee;
//               padding: 20px;
//               border-radius: 8px;">
//           <table width="100%" style="border-collapse: collapse;">
//             <tr> 
//               <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
//                 <img src="https://storage.googleapis.com/trogon-airways.appspot.com/trogon-logo.png" alt="" style="height: 40px; vertical-align: middle;">
//                 <span style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Boarding Pass</span>
//               </td>
//               <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
//                 <img src="${barcodeUrl}" alt="Booking Barcode" style="height: 50px;">
//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 20px;">
//               <div style="padding: 20px; text-align: center;">
//                     <h3 style="color: #1A237E; margin: 0;"> ${returnFlight ? "Round Trip" : "One Way"}</h3>
//                     </div>
//                 <h3 style="color: #1A237E; margin: 0;">Itinerary</h3>



//                 <table width="100%">
//                   <tr>
//                     <td>
//                       <div class="flight-card">
//                         <div class="flight-header">Outbound Flight</div>
//                         <div class="flight-details">
//                           <div>
//                             <strong>From:</strong> ${bookingData.from}<br>
//                             <strong>To:</strong> ${bookingData.to}<br>
//                             <strong>Date:</strong> ${formattedDepartureDate}
//                           </div>
//                           <div>
//                             <strong>Departure:</strong> ${departureTime}<br>
//                             <strong>Arrival:</strong> ${arrivalTime}<br>
//                             <strong>Flight Number:</strong> ${outboundFlight.noflight}
//                           </div>
//                         </div>
//                       </div>
//                     </td>
//                     <td style="text-align: right;">
//                       ${
//                           isRoundTrip && returnFlight
//                               ? `
//                           <div class="flight-card">
//                             <div class="flight-header">Return Flight</div>
//                             <div class="flight-details">
//                               <div>
//                                 <strong>From:</strong> ${bookingData.to}<br>
//                                 <strong>To:</strong> ${bookingData.from}<br>
//                                 <strong>Date:</strong> ${formatDate(returnFlight.date)}
//                               </div>
//                               <div>
//                                 <strong>Departure:</strong> ${returnDepartureTime}<br>
//                                 <strong>Arrival:</strong> ${returnArrivalTime}<br>
//                                 <strong>Flight Number:</strong> ${returnFlight.noflight}
//                               </div>
//                             </div>
//                           </div>`
//                               : ""
//                       }
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
//                 <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passengers</h3>
//                 <p style="margin: 0;">${bookingData.passengersData?.adults
//                     ?.map((p: Passenger) => `<strong>Adult:</strong> ${p.firstName} ${p.lastName}<br> <strong>Email:</strong> ${p.email}`)
//                     .join("<br>")}</p>

//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
//                 <table width="100%">
//                   <tr>
//                     <td>
//                       <h3 style="color: #1A237E; margin: 0;">Booking Details</h3>
//                       <p style="margin: 0; font-size: 0.9em;"><strong>Booking ID:</strong> ${bookingReference}</p>
//                       <p style="margin: 0; font-size: 0.9em;"><strong>Booking Date:</strong> ${formatDateToday()}</p>
//                     </td>
//                     <td style="text-align: right;">
//                       <h3 style="color: #1A237E; margin: 0;">Payment</h3>
//                       <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${returnFlight ? bookingData.totalPrice * 2 : bookingData.totalPrice.toFixed(2)}</p>
//                       <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>
//                       ${paymentMethod === "cash" ? "Paid" : paymentMethod === "card" ? "Paid" : paymentMethod === "cheque" ? "Paid" : paymentMethod === "virement" ? "Paid" : paymentMethod === "transfert" ? "Paid" : "UnPaid"}
//                       </p>
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>
//           </table>
//         </div>
//       </div>
//       <!-- End E-Ticket Section -->

//       <div style="padding: 20px; font-size: 0.9em; color: #555;">
//         <p><strong>Important: **</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
//         <p><strong>Baggage Limitation: **</strong>The maximum allowance for passenger baggage is 20 lb.</p>
//         <p><strong>Remarks: **</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
//         <p><strong>Remarks 2: **</strong> Any cancellation on the day of or the day before your trip will result in a 50% cancellation fee being charged..</p>
//         <p>We look forward to welcoming you on board.</p>
//         <p>Sincerely,<br>The Trogon Airways Team</p>
//       </div>
//     </div>
//     <br><br><br>




//         <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
//       <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
//         <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
//         <p style="margin: 5px 0 0; font-size: 1.2em;">Votre réservation est confirmée</p>
//       </div>

//       <div style="padding: 20px;">
//         <p>Cher(e), ${bookingData.passengersData?.adults?.map((passenger: Passenger) => `${passenger.firstName} ${passenger.lastName}`).join(", ")}</p>
//         <p>Merci d'avoir choisi Trogon Airways. Veuillez trouver ci-dessous votre billet électronique. Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile au comptoire de l'aéroport.</p>
//       </div>

//       <!-- E-Ticket Section -->
//       <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
//         <div style="padding: 20px; text-align: center;">
//           <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Mode de paiement:</strong> 


//           ${paymentMethod === "cash" ? "Cash" : paymentMethod === "card" ? "Carte bancaire" : paymentMethod === "cheque" ? "chèque bancaire" : paymentMethod === "virement" ? "Virement bancaire" : paymentMethod === "transfert" ? "Transfert" : "Contrat"}
//           </p>
//           <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${
//               bookingData.tabType === "helicopter" ? "Hélicoptère" : "Hélicoptère"
//           }</p>
//         </div>

//         <div style=" background: rgba(0, 28, 150, 0.3);
//               border: 1px solid #eee;
//               padding: 20px;
//               border-radius: 8px;">
//           <table width="100%" style="border-collapse: collapse;">
//             <tr> 
//               <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
//                 <img src="https://storage.googleapis.com/trogon-airways.appspot.com/trogon-logo.png" alt="" style="height: 40px; vertical-align: middle;">
//                 <span style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Carte d'embarquement</span>
//               </td>
//               <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
//                 <img src="${barcodeUrl}" alt="Booking Barcode" style="height: 50px;">
//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 20px;">
//                <div style="padding: 20px; text-align: center;">
//                     <h3 style="color: #1A237E; margin: 0;"> ${returnFlight ? "Vol Aller-Retour" : "Vol Simple"}</h3>
//                     </div>
//                 <h3 style="color: #1A237E; margin: 0;">Itinéraire</h3>


//                 <table width="100%">
//                   <tr>
//                     <td>
//                       <div class="flight-card">
//                         <div class="flight-header">Vol aller</div>
//                         <div class="flight-details">
//                           <div>
//                             <strong>De:</strong> ${bookingData.from}<br>
//                             <strong>A:</strong> ${bookingData.to}<br>
//                             <strong>Date:</strong> ${formattedDepartureDate}
//                           </div>
//                           <div>
//                             <strong>Départ:</strong> ${departureTime}<br>
//                             <strong>Arrivée:</strong> ${arrivalTime}<br>
//                             <strong>Numéro du vol:</strong> ${outboundFlight.noflight}
//                           </div>
//                         </div>
//                       </div>
//                     </td>
//                     <td style="text-align: right;">
//                       ${
//                           isRoundTrip && returnFlight
//                               ? `
//                           <div class="flight-card">
//                             <div class="flight-header">Vol de retour</div>
//                             <div class="flight-details">
//                               <div>
//                                 <strong>De:</strong> ${bookingData.toCity} (${bookingData.to})<br>
//                                 <strong>A:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
//                                 <strong>Date:</strong> ${formatDate(returnFlight.date)}
//                               </div>
//                               <div>

//                                 <strong>Départ:</strong> ${returnDepartureTime}<br>
//                                 <strong>Arrivée:</strong> ${returnArrivalTime}<br>
//                                 <strong>Numéro du vol:</strong> ${returnFlight.noflight}
//                               </div>
//                             </div>
//                           </div>`
//                               : ""
//                       }
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
//                 <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passager</h3>

//                     <p style="margin: 0;">${bookingData.passengersData?.adults
//                         ?.map((p: Passenger) => `<strong>Adult:</strong> ${p.firstName} ${p.lastName}<br> <strong>Email:</strong> ${p.email}`)
//                         .join("<br>")}</p>

//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
//                 <table width="100%">
//                   <tr>
//                     <td>
//                       <h3 style="color: #1A237E; margin: 0;">Détails de la réservation</h3>
//                       <p style="margin: 0; font-size: 0.9em;"><strong>Réservation ID:</strong> ${bookingReference}</p>
//                       <p style="margin: 0; font-size: 0.9em;"><strong>Date de réservation:</strong> ${formatDateToday()}</p>
//                     </td>
//                     <td style="text-align: right;">
//                       <h3 style="color: #1A237E; margin: 0;">Paiement</h3>
//                       <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${returnFlight ? bookingData.totalPrice * 2 : bookingData.totalPrice.toFixed(2)}</p>
//                       <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>

//                       ${paymentMethod === "cash" ? "Payé" : paymentMethod === "card" ? "Payé" : paymentMethod === "cheque" ? "Payé" : paymentMethod === "virement" ? "Payé" : paymentMethod === "transfert" ? "Payé" : "Non rémunéré"}
//                       </p>
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>
//           </table>
//         </div>
//       </div>
//       <!-- End E-Ticket Section -->

//       <div style="padding: 20px; font-size: 0.9em; color: #555;">
//         <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
//         <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb.</p> 
//          <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol
// imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
// incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à
// l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué
// pour ces raisons.</p>
//         <p><strong>Remarques 2: **</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une retenue de 50% du montant total à titre de frais d'annulation.</p>
//         <p>Nous nous réjouissons de vous accueillir à bord.</p>
//         <p>Cordialement,<br>L'équipe de Trogon Airways</p>
//       </div>
//     </div>
//   `;
// };


const generateEmailContent = (bookingData: BookingData, bookingReference: string, paymentMethod: string): string => {
    const outboundFlight = bookingData.outbound;
    const returnFlight = bookingData.return;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${bookingReference}&code=Code128&dpi=96`;

    const timeZone = "America/Port-au-Prince";

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";

        try {
            const [datePart] = dateString.split(" "); // Prend juste la date
            const parsedDate = parse(datePart, "yyyy-MM-dd", new Date());

            // Convertir en fuseau horaire Haïti
            const zonedDate = toZonedTime(parsedDate, timeZone);

            // Formater sans passer timeZone dans options
            return format(zonedDate, "EEE, dd MMM");
        } catch (err) {
            console.error("Erreur formatDate:", err, dateString);
            return "Invalid date";
        }
    };

    const formatDateToday = () => {
        const now = toZonedTime(new Date(), timeZone);
        return format(now, "EEE, dd MMM");
    };

    // Extraire les dates et heures du vol aller
    const [departureDate, departureTime] = outboundFlight.departure_time.split(" ");
    const [arrivalDate, arrivalTime] = outboundFlight.arrival_time.split(" ");

    // Extraire les dates et heures du vol retour SI IL EXISTE
    let returnDepartureDate = "N/A";
    let returnDepartureTime = "N/A";
    let returnArrivalDate = "N/A";
    let returnArrivalTime = "N/A";

    if (returnFlight && returnFlight.departure_time) {
        [returnDepartureDate, returnDepartureTime] = returnFlight.departure_time.split(" ");
    }

    if (returnFlight && returnFlight.arrival_time) {
        [returnArrivalDate, returnArrivalTime] = returnFlight.arrival_time.split(" ");
    }

    // Formater la date de départ
    let formattedDepartureDate = "N/A";
    try {
        const [departureDateStr] = outboundFlight.departure_time.split(" ");
        const parsedDepartureDate = parse(departureDateStr, "yyyy-MM-dd", new Date());
        const zonedDepartureDate = toZonedTime(parsedDepartureDate, timeZone);
        formattedDepartureDate = format(zonedDepartureDate, "EEE, dd MMM");
    } catch (err) {
        console.error("Erreur formatDate départ:", err);
    }

    // Formater la date d'arrivée
    let formattedArrivalDate = "N/A";
    try {
        const [arrivalDateStr] = outboundFlight.arrival_time.split(" ");
        const parsedArrivalDate = parse(arrivalDateStr, "yyyy-MM-dd", new Date());
        const zonedArrivalDate = toZonedTime(parsedArrivalDate, timeZone);
        formattedArrivalDate = format(zonedArrivalDate, "EEE, dd MMM");
    } catch (err) {
        console.error("Erreur formatDate arrivée:", err);
    }

    // Vérifier si c'est un aller-retour
    const isRoundTrip = returnFlight && returnFlight.noflight;

    return `
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f0f7ff; padding: 20px; text-align: center; border-radius: 5px; }
        .flight-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
        .flight-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .passenger-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .passenger-table th, .passenger-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .passenger-table th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
    </style>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
        <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
        <p style="margin: 5px 0 0; font-size: 1.2em;">Your Booking is Confirmed</p>
      </div>

      <div style="padding: 20px;">
        <p>Dear, ${bookingData.passengersData?.adults?.map((passenger: Passenger) => `${passenger.firstName} ${passenger.lastName}`).join(", ")}</p>
        <p>Thank you for choosing Trogon Airways. Please find your e-ticket below. We recommend printing this section or having it available on your mobile device at the airport.</p>
      </div>

      <!-- E-Ticket Section -->
      <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
        <div style="padding: 20px; text-align: center;">
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Payment Method:</strong> 
          
          ${paymentMethod === "cash" ? "Cash" : paymentMethod === "card" ? "Credit/Debit Card" : paymentMethod === "cheque" ? "Bank Check" : paymentMethod === "virement" ? "Bank transfer" : paymentMethod === "transfert" ? "Transfer" : "Contrat"}
          </p>
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${bookingData.tabType === "helicopter" ? "Helicopter" : "Helicopter"
        }</p>
        </div>

        <div style=" background: rgba(0, 28, 150, 0.3);
              border: 1px solid #eee;
              padding: 20px;
              border-radius: 8px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr> 
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
                <img src="https://storage.googleapis.com/trogon-airways.appspot.com/trogon-logo.png" alt="" style="height: 40px; vertical-align: middle;">
                <span style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Boarding Pass</span>
              </td>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                <img src="${barcodeUrl}" alt="Booking Barcode" style="height: 50px;">
              </td>
            </tr>

                   <tr>
            <td colspan="2" style="padding-top: 20px;">
              <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #1A237E; margin: 0;"> ${isRoundTrip ? "Round Trip" : "One Way"}</h3>
                    </div>
                <h3 style="color: #1A237E; margin: 0;">Itinerary</h3>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="50%" valign="top" align="left">
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
                                    <strong>Flight Number:</strong> ${outboundFlight.noflight}
                                </div>
                                </div>
                            </div>
                        </td>
                        <td  width="50%" valign="top">
                            ${isRoundTrip && returnFlight
                            ? `
                                <table align="right" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <div class="flight-card">
                                                <div class="flight-header">Return flight</div>
                                                <div class="flight-details">
                                                    <div>
                                                        <strong>From:</strong> ${bookingData.to || "N/A"}<br>
                                                        <strong>To:</strong> ${bookingData.from || "N/A"}<br>
                                                        <strong>Date:</strong> ${formatDate(returnFlight.date)}
                                                    </div>
                                                    <div>
                                                        <strong>Departure:</strong> ${returnDepartureTime}<br>
                                                        <strong>Arrival:</strong> ${returnArrivalTime}<br>
                                                        <strong>Flight Number:</strong> ${returnFlight.noflight}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>`
                            : ""}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passengers</h3>
                <p style="margin: 0;">${bookingData.passengersData?.adults
            ?.map((p: Passenger) => `<strong>Adult:</strong> ${p.firstName} ${p.lastName}<br> <strong>Email:</strong> ${p.email || "N/A"}`)
            .join("<br>")}</p>
              </td>
            </tr>

            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <table width="100%">
                  <tr>
                    <td>
                      <h3 style="color: #1A237E; margin: 0;">Booking Details</h3>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Booking ID:</strong> ${bookingReference}</p>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Booking Date:</strong> ${formatDateToday()}</p>
                    </td>
                    <td style="text-align: right;">
                      <h3 style="color: #1A237E; margin: 0;">Payment</h3>
                      <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${isRoundTrip ? (bookingData.totalPrice * 2).toFixed(2) : bookingData.totalPrice.toFixed(2)}</p>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>
                      ${paymentMethod === "cash" ? "Paid" : paymentMethod === "card" ? "Paid" : paymentMethod === "cheque" ? "Paid" : paymentMethod === "virement" ? "Paid" : paymentMethod === "transfert" ? "Paid" : "UnPaid"}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <!-- End E-Ticket Section -->

      <div style="padding: 20px; font-size: 0.9em; color: #555;">
        <p><strong>Important: **</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
        <p><strong>Baggage Limitation: **</strong>The maximum allowance for passenger baggage is 20 lb.</p>
        <p><strong>Remarks: **</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
        <p><strong>Remarks 2: **</strong> Any cancellation on the day of or the day before your trip will result in a 50% cancellation fee being charged.</p>
        <p>We look forward to welcoming you on board.</p>
        <p>Sincerely,<br>The Trogon Airways Team</p>
      </div>
    </div>
    <br><br><br>

    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
        <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
        <p style="margin: 5px 0 0; font-size: 1.2em;">Votre réservation est confirmée</p>
      </div>

      <div style="padding: 20px;">
        <p>Cher(e), ${bookingData.passengersData?.adults?.map((passenger: Passenger) => `${passenger.firstName} ${passenger.lastName}`).join(", ")}</p>
        <p>Merci d'avoir choisi Trogon Airways. Veuillez trouver ci-dessous votre billet électronique. Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile au comptoir de l'aéroport.</p>
      </div>

      <!-- E-Ticket Section -->
      <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
        <div style="padding: 20px; text-align: center;">
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Mode de paiement:</strong> 
          
       
          ${paymentMethod === "cash" ? "Cash" : paymentMethod === "card" ? "Carte bancaire" : paymentMethod === "cheque" ? "chèque bancaire" : paymentMethod === "virement" ? "Virement bancaire" : paymentMethod === "transfert" ? "Transfert" : "Contrat"}
          </p>
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${bookingData.tabType === "helicopter" ? "Hélicoptère" : "Hélicoptère"
        }</p>
        </div>

        <div style=" background: rgba(0, 28, 150, 0.3);
              border: 1px solid #eee;
              padding: 20px;
              border-radius: 8px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr> 
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
                <img src="https://storage.googleapis.com/trogon-airways.appspot.com/trogon-logo.png" alt="" style="height: 40px; vertical-align: middle;">
                <span style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Carte d'embarquement</span>
              </td>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                <img src="${barcodeUrl}" alt="Booking Barcode" style="height: 50px;">
              </td>
            </tr>
           
        <tr>
            <td colspan="2" style="padding-top: 20px;">
              <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #1A237E; margin: 0;"> ${isRoundTrip ? "Vol Aller Retour" : "Vol Simple"}</h3>
                    </div>
                <h3 style="color: #1A237E; margin: 0;">Itinéraire</h3>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="50%" valign="top" align="left">
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
                                    <strong>Numéro du vol:</strong> ${outboundFlight.noflight}
                                </div>
                                </div>
                            </div>
                        </td>
                        <td  width="50%" valign="top">
                            ${isRoundTrip && returnFlight
                            ? `
                                <table align="right" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <div class="flight-card">
                                                <div class="flight-header">Vol de Retour</div>
                                                <div class="flight-details">
                                                    <div>
                                                        <strong>De:</strong> ${bookingData.to || "N/A"}<br>
                                                        <strong>À:</strong> ${bookingData.from || "N/A"}<br>
                                                        <strong>Date:</strong> ${formatDate(returnFlight.date)}
                                                    </div>
                                                    <div>
                                                        <strong>Départ:</strong> ${returnDepartureTime}<br>
                                                        <strong>Arrivée:</strong> ${returnArrivalTime}<br>
                                                        <strong>Numéro du vol:</strong> ${returnFlight.noflight}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>`
                            : ""}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passager</h3>
                
                    <p style="margin: 0;">${bookingData.passengersData?.adults
            ?.map((p: Passenger) => `<strong>Adult:</strong> ${p.firstName} ${p.lastName}<br> <strong>Email:</strong> ${p.email || "N/A"}`)
            .join("<br>")}</p>
               
              </td>
            </tr>

            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <table width="100%">
                  <tr>
                    <td>
                      <h3 style="color: #1A237E; margin: 0;">Détails de la réservation</h3>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Réservation ID:</strong> ${bookingReference}</p>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Date de réservation:</strong> ${formatDateToday()}</p>
                    </td>
                    <td style="text-align: right;">
                      <h3 style="color: #1A237E; margin: 0;">Paiement</h3>
                      <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${isRoundTrip ? (bookingData.totalPrice * 2).toFixed(2) : bookingData.totalPrice.toFixed(2)}</p>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>

                      ${paymentMethod === "cash" ? "Payé" : paymentMethod === "card" ? "Payé" : paymentMethod === "cheque" ? "Payé" : paymentMethod === "virement" ? "Payé" : paymentMethod === "transfert" ? "Payé" : "Non rémunéré"}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <!-- End E-Ticket Section -->

      <div style="padding: 20px; font-size: 0.9em; color: #555;">
        <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement.</p>
        <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb.</p> 
         <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol
imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à
l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué
pour ces raisons.</p>
        <p><strong>Remarques 2: **</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une retenue de 50% du montant total à titre de frais d'annulation.</p>
        <p>Nous nous réjouissons de vous accueillir à bord.</p>
        <p>Cordialement,<br>L'équipe de Trogon Airways</p>
      </div>
    </div>
  `;
};

const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string, paymentMethod: string) => {
    const apiKey = "api-F876F566C8754DB299476B9DF6E9B82B"; // ou process.env.SMTP2GO_API_KEY
    const recipientEmail = bookingData.passengersData.adults[0].email;

    const emailContent = generateEmailContent(bookingData, bookingReference, paymentMethod);

    const payload = {
        api_key: apiKey,
        to: [recipientEmail],
        sender: "Booking Trogon Airways <booking@trogonairways.com>",
        subject: `Your Trogon Airways E-Ticket - Booking ID: ${bookingReference}`,
        html_body: emailContent,
    };

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to send email: ${data?.error || JSON.stringify(data)}`);
    }
    console.log("✅ Email sent", data);
};

const BookingCreatedModal: React.FC<BookingCreatedModalProps> = ({ open, onClose, flight, onTicketCreated }) => {
    const [isRoundTrip, setIsRoundTrip] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        flightNumberReturn: "",
        middleName: "",
        lastName: "",
        unpaid: "",
        reference: "",
        nom_urgence: "",
        email_urgence: "",
        tel_urgence: "",
        dateOfBirth: "",
        gender: "other",
        title: "Mr",
        address: "",
        country: "",
        nationality: "",
        email: "",
        phone: "",
        passengerCount: 1,
        paymentMethod: "card",
        returnDate: "",
    });

    if (!open || !flight) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Si c’est un checkbox → on cast pour accéder à checked
        if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
            setFormData({
                ...formData,
                [name]: e.target.checked ? value : "",
            });
            return;
        }

        // Sinon → input, select…
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async () => {
        // 1️⃣ Validation des champs obligatoires
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.nationality || !formData.dateOfBirth) {
            toast.error(`Veuillez remplir tous les champs obligatoires`, {
                style: {
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #f87171",
                },
                iconTheme: { primary: "#fff", secondary: "#dc2626" },
            });
            return;
        }

        // 2️⃣ Préparer les passagers
        const passengers: Passenger[] = [];
        const passengerCount = Number(formData.passengerCount || 1);
        for (let i = 0; i < passengerCount; i++) {
            passengers.push({
                firstName: formData.firstName,
                flightNumberReturn: formData.flightNumberReturn || "",
                middleName: formData.middleName,
                lastName: formData.lastName,
                reference: formData.reference,
                nom_urgence: formData.nom_urgence,
                email_urgence: formData.email_urgence,
                tel_urgence: formData.tel_urgence,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                title: formData.title,
                address: formData.address,
                type: "adult",
                typeVol: flight?.type || "plane",
                typeVolV: "onway",
                country: formData.country,
                nationality: formData.nationality,
                phone: formData.phone,
                email: formData.email,
            });
        }

        // 3️⃣ Préparer le body à envoyer
        const body = {
            flightId: flight.id,
            passengers,
            unpaid: formData.unpaid,
            referenceNumber: formData.reference,
            contactInfo: { email: formData.email, phone: formData.phone },
            totalPrice: flight.price * passengerCount,
            departureDate: flight.departure.split("T")[0],
            returnDate: formData.returnDate,
            paymentMethod: formData.paymentMethod,
        };

        try {
            // Récupérer le token depuis le localStorage ou le contexte d'authentification
            const token = localStorage.getItem("authToken"); // ou depuis votre contexte/auth

            if (!token) {
                toast.error("❌ Vous devez être connecté pour créer un ticket");
                // Rediriger vers la page de login si nécessaire
                // window.location.href = '/login';
                return;
            }

            const res = await fetch("https://steve-airways.onrender.com/api/create-ticket", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, // AJOUT DU TOKEN
                },
                body: JSON.stringify(body),
            });

            let data: any;

            try {
                data = await res.json();
            } catch (jsonErr) {
                console.error("Erreur parsing JSON:", jsonErr);
                toast.error("❌ Réponse serveur invalide");
                return;
            }

            // Vérifiez explicitement le statut HTTP ET le champ success
            if (res.status === 200 && data.success) {
                toast.success(`Ticket créé avec succès ! Référence: ${data.bookingReference}`, {
                    style: {
                        background: "#28a745",
                        color: "#fff",
                        border: "1px solid #1e7e34",
                    },

                    iconTheme: { primary: "#fff", secondary: "#1e7e34" },
                });

                try {
                    console.log("📧 Tentative d'envoi d'email...");
                    console.log("Données email:", {
                        bookingReference: data.bookingReference,
                        passengerCount: passengers.length,
                        email: formData.email,
                    });

                    let returnFlight = null;

                    if (isRoundTrip && formData.flightNumberReturn) {
                        try {
                            const resReturn = await fetch(`https://steve-airways.onrender.com/api/flights/${formData.flightNumberReturn}`, {
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                                },
                            });
                            const dataReturn = await resReturn.json();

                            if (resReturn.ok && dataReturn) {
                                const flightData = dataReturn;
                                returnFlight = {
                                    date: flightData.departure_time,
                                    noflight: flightData.flight_number,
                                    departure_time: flightData.departure_time,
                                    arrival_time: flightData.arrival_time,
                                    from: flightData.from,
                                    to: flightData.to,
                                    fromCity: flightData.fromCity,
                                    toCity: flightData.toCity,
                                };
                            } else {
                                console.warn("Vol retour introuvable, création sans vol retour");
                                // Ne pas afficher d'erreur toast ici pour ne pas interrompre le processus
                            }
                        } catch (err) {
                            console.error("Erreur récupération vol retour:", err);
                            // Ne pas afficher d'erreur toast pour ne pas bloquer l'email
                        }
                    }

                    // Envoyer l'email même si returnFlight est null
                    try {
                        await sendTicketByEmail(
                            {
                                from: flight.from || "",
                                to: flight.to || "",
                                outbound: {
                                    date: flight.departure,
                                    noflight: flight.flight_number,
                                    departure_time: flight.departure,
                                    arrival_time: flight.arrival,
                                },
                                return: returnFlight, // Peut être null
                                passengersData: { adults: passengers },
                                totalPrice: body.totalPrice,
                            },
                            data.bookingReference,
                            formData.paymentMethod,
                        );

                        console.log("✅ Email envoyé avec succès");
                    } catch (emailError) {
                        console.error("❌ Erreur détaillée envoi email:", emailError);
                        // Afficher un warning plutôt qu'une erreur pour ne pas perturber l'utilisateur
                        toast.error("Ticket créé mais email non envoyé");
                    }

                    console.log("✅ Email envoyé avec succès");
                } catch (emailError) {
                    console.error("❌ Erreur détaillée envoi email:", emailError);
                    toast.error("Ticket créé mais email non envoyé");
                }

                if (onTicketCreated) {
                    onTicketCreated();
                }

                onClose();
            } else {
                console.error("Erreur création ticket:", data);

                toast.error(`${data.message || "inconnue"}`, {
                    style: {
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #f87171",
                    },
                    iconTheme: { primary: "#fff", secondary: "#dc2626" },
                });
            }
        } catch (err) {
            console.error("Erreur réseau:", err);
            toast.error("❌ Erreur de connexion au serveur");
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50">
                    <motion.div
                        className="absolute inset-0 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className="absolute inset-0 mx-auto my-6 flex max-w-6xl items-start justify-center p-4 sm:my-12"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    >
                        <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                            <button
                                onClick={onClose}
                                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="px-6 pt-6">
                                <h2 className="text-xl font-semibold text-slate-800">Créer un Ticket pour le vol {flight.flight_number}</h2>

                                <p className="text-sm text-slate-500">
                                    {flight.from} → {flight.to} | Départ: {flight.departure}
                                </p>
                                <div className="my-4 h-px w-full bg-slate-100" />
                                <div className="mt-1 flex items-center gap-4">
                                    <span className="text-xl font-semibold text-amber-500">Round-Trip</span>

                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={isRoundTrip}
                                            onChange={(e) => setIsRoundTrip(e.target.checked)}
                                        />

                                        <div className="peer h-6 w-11 rounded-full bg-gray-300 transition-all peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500"></div>
                                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-5"></div>
                                    </label>

                                    <input
                                        type="text"
                                        id="flightNumberReturn"
                                        name="flightNumberReturn"
                                        placeholder="Numéro de vol retour"
                                        disabled={!isRoundTrip}
                                        required={isRoundTrip}
                                        onChange={handleChange}
                                        className={`w-full rounded-md border px-4 py-2 outline-none transition ${isRoundTrip
                                                ? "border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                            } `}
                                    />
                                </div>
                            </div>

                            <div className="my-4 h-px w-full bg-slate-100" />

                            <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-3">
                                {/* Prénom */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="firstName"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Prénom
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        placeholder="Prénom"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Deuxième prénom */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="middleName"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Deuxième prénom
                                    </label>
                                    <input
                                        type="text"
                                        id="middleName"
                                        name="middleName"
                                        placeholder="Deuxième prénom"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Nom */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="lastName"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Nom
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Nom"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Date de naissance */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="dateOfBirth"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Date de naissance
                                    </label>
                                    <input
                                        type="date"
                                        id="dateOfBirth"
                                        name="dateOfBirth"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Adresse */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="address"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Adresse
                                    </label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        placeholder="Adresse"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Pays */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="country"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Pays
                                    </label>
                                    <input
                                        type="text"
                                        id="country"
                                        name="country"
                                        placeholder="Pays"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Nationalité */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="nationality"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Nationalité
                                    </label>
                                    <input
                                        type="text"
                                        id="nationality"
                                        name="nationality"
                                        placeholder="Nationalité"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Email */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="email"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="Email"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Téléphone */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="phone"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Téléphone
                                    </label>
                                    <input
                                        type="text"
                                        id="phone"
                                        name="phone"
                                        placeholder="Téléphone"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    {/* Méthode de paiement */}
                                    <label
                                        htmlFor="paymentMethod"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Méthode de paiement
                                    </label>
                                    <select
                                        id="paymentMethod"
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Carte</option>
                                        <option value="cheque">Chèque</option>
                                        <option value="virement">Virement</option>
                                        <option value="transfert">Transfert</option>
                                        <option value="contrat">Contrat</option>
                                    </select>
                                    {/* Nombre de passagers */}
                                    <input
                                        type="hidden"
                                        id="passengerCount"
                                        name="passengerCount"
                                        min="1"
                                        defaultValue={1}
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div className="flex w-28 flex-col">
                                    <label
                                        htmlFor="unpaid"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Non rémunéré
                                    </label>

                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            id="unpaid"
                                            name="unpaid"
                                            value="pending"
                                            required
                                            onChange={handleChange}
                                            className="peer sr-only"
                                        />

                                        <div className="peer h-6 w-11 rounded-full bg-gray-300 transition-all peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500"></div>

                                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-5"></div>
                                    </label>
                                </div>

                                {/* Téléphone */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="reference"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Numéro de Référence
                                    </label>
                                    <input
                                        type="text"
                                        id="reference"
                                        name="reference"
                                        placeholder="Numéro de Référence"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="nom_urgence"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Emergency contact person name
                                    </label>
                                    <input
                                        type="text"
                                        id="nom_urgence"
                                        name="nom_urgence"
                                        placeholder="Emergency contact person name"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="email_urgence"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Emergency contact email
                                    </label>
                                    <input
                                        type="text"
                                        id="email_urgence"
                                        name="email_urgence"
                                        placeholder="Emergency contact email"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="tel_urgence"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Emergency contact number
                                    </label>
                                    <input
                                        type="text"
                                        id="tel_urgence"
                                        name="tel_urgence"
                                        placeholder="Emergency contact number"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Bouton */}
                                <div className="md:col-span-3">
                                    <button
                                        onClick={handleSubmit}
                                        className="w-full rounded-md bg-amber-500 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
                                    >
                                        Confirmer et Créer le Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingCreatedModal;
