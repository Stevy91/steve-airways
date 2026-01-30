import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Search } from "lucide-react";
import toast from "react-hot-toast";
import { format, parse } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useProfile } from "../hooks/useProfile";

const SENDER_EMAIL = "booking@trogonairways.com";

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
    status: string;
    selectedSeat: string;
    total_seat: number;
    seats_available: number;
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
    idClient: string;
    idTypeClient: string;
    reference: string;
    companyName: string;
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
    devisePayment?: string;
    taux_jour?: string;
    price?: string;
    selectedSeat?: string;
};

type BookingData = {
    from: string;
    to: string;
    fromCity?: string;
    currency: string;
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
    total_seat?: number;
    selectedSeat?: string;
};

// Ajoutez ces types pour les données API
type SeatAvailabilityResponse = {
    success: boolean;
    available: boolean;
    seatNumber: string;
    flight: Flight;
    occupiedSeats: string[];
    seatsAvailable: number;
    message: string;
};

type OccupiedSeatsResponse = {
    success: boolean;
    flightId: string;
    flightNumber: string;
    totalSeats: number;
    seatsAvailable: number;
    occupiedSeats: Array<{ selectedSeat: string }>;
    count: number;
};

type ApiPassenger = {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    date_of_birth?: string;
    idClient?: string;
    idTypeClient?: string;
    address?: string;
    country?: string;
    nationality?: string;
    phone?: string;
    email?: string;
    nom_urgence?: string;
    email_urgence?: string;
    tel_urgence?: string;
};

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
          
          ${paymentMethod === "cash" ? "Cash" : paymentMethod === "card" ? "Credit/Debit Card" : paymentMethod === "cheque" ? "Bank Check" : paymentMethod === "virement" ? "Bank transfer" : paymentMethod === "transfert" ? "Deposit" : "Contrat"}
          </p>
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${
              bookingData.tabType === "helicopter" ? "Helicopter" : "Air Plane"
          }</p>
        </div>

        <div style=" background: rgba(0, 28, 150, 0.3);
              border: 1px solid #eee;
              padding: 20px;
              border-radius: 8px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr> 
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
                
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
                            ${
                                isRoundTrip && returnFlight
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
                                    : ""
                            }
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
                      <p style="margin: 0; font-size: 1.1em;"><strong>Total: </strong>${bookingData.totalPrice.toFixed(2)}${" "}${bookingData.currency === "htg" ? "HTG" : "USD"}</p>
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
        <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
       <p><strong>Baggage Limitation: **</strong> The maximum allowance for passenger baggage is 30 lb. <strong>Luggage dimensions 65*40*25</strong></p>
        <p><strong>Remarks: **</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
        <p><strong>Remarks 2: **</strong> Any cancellation on the day of or the day before your trip will result in a 50% cancellation fee being charged..</p>
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
          
       
          ${paymentMethod === "cash" ? "Espèces" : paymentMethod === "card" ? "Carte bancaire" : paymentMethod === "cheque" ? "chèque bancaire" : paymentMethod === "virement" ? "Virement bancaire" : paymentMethod === "transfert" ? "Dépôt" : "Contrat"}
          </p>
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${
              bookingData.tabType === "helicopter" ? "Helicopter" : "Avion"
          }</p>
        </div>

        <div style=" background: rgba(0, 28, 150, 0.3);
              border: 1px solid #eee;
              padding: 20px;
              border-radius: 8px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr> 
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
                
                <span style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Carte d'embarquement</span>
              </td>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                <img src="${barcodeUrl}" alt="Booking Barcode" style="height: 50px;">
              </td>
            </tr>
           
             <tr>
            <td colspan="2" style="padding-top: 20px;">
              <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #1A237E; margin: 0;"> ${isRoundTrip ? "Vol Aller-Retour" : "Aller Simple"}</h3>
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
                            ${
                                isRoundTrip && returnFlight
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
                                    : ""
                            }
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passager</h3>
                
                    <p style="margin: 0;">${bookingData.passengersData?.adults
                        ?.map(
                            (p: Passenger) => `<strong>Adult:</strong> ${p.firstName} ${p.lastName}<br> <strong>Email:</strong> ${p.email || "N/A"}`,
                        )
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
                      <p style="margin: 0; font-size: 1.1em;"><strong>Total: </strong>${bookingData.totalPrice.toFixed(2)}${" "}${bookingData.currency === "htg" ? "HTG" : "USD"}</p>
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
        <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
        <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong></p>
        <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité.
Le client est responsable de ses propres dispositions (heure d'arrivée à l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.
</p>
        <p><strong>Remarques 2:</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une retenue de 50% du montant total à titre de frais d'annulation.</p>
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
    const [createTicket, setCreateTicket] = useState(false);
    const [loadingReturnFlight, setLoadingReturnFlight] = useState(false);

    // États pour le prix du vol retour
    const [calculatedPrice2, setCalculatedPrice2] = useState<number>(0);
    const [priceCurrency2, setPriceCurrency2] = useState<string>("USD");

    const [suggestions, setSuggestions] = useState<ApiPassenger[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownRef, setDropdownRef] = useState<HTMLDivElement | null>(null);
    const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
    const user = useProfile();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const initialFormData = {
        firstName: "",
        flightNumberReturn: "",
        middleName: "",
        lastName: "",
        idClient: "",
        idTypeClient: "",
        unpaid: "",
        reference: "",
        companyName: "",
        nom_urgence: "",
        email_urgence: "",
        tel_urgence: "",
        dateOfBirth: "",
        gender: "other" as const,
        title: "Mr" as const,
        address: "",
        country: "",
        nationality: "",
        email: "",
        phone: "",
        passengerCount: 1,
        paymentMethod: "card" as "card" | "cash" | "cheque" | "virement" | "transfert" | "contrat",
        price: "",
        devisePayment: "usd" as "usd" | "htg",
        taux_jour: "",
        selectedSeat: "",
    };

    type FormDataType = {
        firstName: string;
        flightNumberReturn: string;
        middleName: string;
        lastName: string;
        idClient: string;
        idTypeClient: string;
        unpaid: string;
        reference: string;
        companyName: string;
        nom_urgence: string;
        email_urgence: string;
        tel_urgence: string;
        dateOfBirth: string;
        gender: "other";
        title: "Mr";
        address: string;
        country: string;
        nationality: string;
        email: string;
        phone: string;
        passengerCount: number;
        paymentMethod: "card" | "cash" | "cheque" | "virement" | "transfert" | "contrat";
        price: string;
        devisePayment: "usd" | "htg";
        taux_jour: string;
        selectedSeat: string;
    };

    const [formData, setFormData] = useState<FormDataType>(initialFormData);

    // Ajoutez cet état pour stocker les sièges occupés avec type explicite
    const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);

    // Ajoutez cette fonction pour vérifier la disponibilité du siège
    const checkSeatAvailability = async (seatId: string): Promise<boolean> => {
        if (!seatId || !flight) return true; // Pour le moment, retournez true pour continuer

        try {
            const token = localStorage.getItem("authToken");

            console.log("🔍 Vérification siège - Token présent:", !!token);
            console.log("🔍 Détails:", { flightId: flight?.id, seatId, token: token?.substring(0, 20) + "..." });

            if (!token) {
                console.warn("⚠️ Aucun token d'authentification trouvé");
                // Pour le développement, retournez true
                return true;
            }

            const response = await fetch("https://steve-airways.onrender.com/api/check-seat-availability", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    flightId: flight.id,
                    seatNumber: seatId,
                }),
            });

            console.log("🔍 Réponse API - Status:", response.status, response.statusText);

            if (response.status === 403) {
                console.error("❌ Accès interdit (403). Token probablement invalide ou expiré.");

                // Essayez de rafraîchir le token
                try {
                    const refreshResponse = await fetch("https://steve-airways.onrender.com/api/auth/refresh", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        localStorage.setItem("authToken", refreshData.token);
                        console.log("✅ Token rafraîchi");
                        // Réessayez avec le nouveau token
                        return checkSeatAvailability(seatId);
                    }
                } catch (refreshError) {
                    console.error("❌ Impossible de rafraîchir le token:", refreshError);
                }

                // Pour le développement, retournez true
                return true;
            }

            if (!response.ok) {
                console.warn("⚠️ Réponse non-OK:", response.status);
                const errorText = await response.text();
                console.warn("⚠️ Contenu erreur:", errorText.substring(0, 200));

                // Pour le développement, retournez true
                return true;
            }

            const data = await response.json();
            console.log("✅ Données reçues:", data);

            return data.success ? data.available : false;
        } catch (error) {
            console.error("❌ Erreur vérification siège:", error);

            // Pour le développement, retournez true pour permettre la sélection
            // En production, vous voudrez retourner false
            return process.env.NODE_ENV === "development" ? true : false;
        }
    };

    // Modifiez la fonction handleSeatSelect avec types
    const handleSeatSelect = async (seatId: string): Promise<void> => {
        // Si on clique sur un siège déjà sélectionné, on le désélectionne
        if (formData.selectedSeat === seatId) {
            setFormData((prev) => ({
                ...prev,
                selectedSeat: "",
            }));
            return;
        }

        // Vérifier la disponibilité du siège
        const isAvailable = await checkSeatAvailability(seatId);

        if (!isAvailable) {
            toast.error(`Le siège ${seatId} est déjà occupé. Veuillez choisir un autre siège.`, {
                duration: 3000,
            });
            return;
        }

        // Si le siège est disponible, le sélectionner
        setFormData((prev) => ({
            ...prev,
            selectedSeat: seatId,
        }));
    };

    // Ajoutez cette fonction pour charger les sièges occupés au démarrage
    useEffect(() => {
        const loadOccupiedSeats = async () => {
            if (!open || !flight) return;

            try {
                const token = localStorage.getItem("authToken");
                const response = await fetch(`https://steve-airways.onrender.com/api/occupied-seats/${flight.id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data: OccupiedSeatsResponse = await response.json();
                    if (data.success) {
                        // Stocker les sièges occupés dans un état
                        const occupiedSeatsList = data.occupiedSeats.map((seat) => seat.selectedSeat);
                        setOccupiedSeats(occupiedSeatsList);
                    }
                }
            } catch (error) {
                console.error("Erreur chargement sièges occupés:", error);
            }
        };

        loadOccupiedSeats();
    }, [open, flight]);

    console.log("✅ siege selected", formData.selectedSeat);

    useEffect(() => {
        if (!open) {
            setSuggestions([]);
            setShowDropdown(false);
            setCalculatedPrice2(0);
            setPriceCurrency2("USD");
            setOccupiedSeats([]); // Réinitialiser aussi les sièges occupés
        }
    }, [open]);

    // Gérer les clics en dehors du dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showDropdown && suggestions.length > 0) {
                if (dropdownRef && !dropdownRef.contains(event.target as Node) && inputRef && !inputRef.contains(event.target as Node)) {
                    setShowDropdown(false);
                    setSuggestions([]);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown, suggestions, dropdownRef, inputRef]);

    // Nettoyer le timeout
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    if (!open || !flight) return null;

    const formatNimuLicens = (value: string): string => {
        const numbers = value.replace(/\D/g, "");
        const trimmed = numbers.slice(0, 10);
        const parts = [];
        if (trimmed.length > 0) parts.push(trimmed.slice(0, 3));
        if (trimmed.length > 3) parts.push(trimmed.slice(3, 6));
        if (trimmed.length > 6) parts.push(trimmed.slice(6, 9));
        if (trimmed.length > 9) parts.push(trimmed.slice(9, 10));
        return parts.join("-");
    };

    // Fonction pour rechercher le prix du vol retour

    const fetchReturnFlightPrice = async (flightNumber: string): Promise<{ price: number; currency: string } | null> => {
        if (!flightNumber || flightNumber.trim().length < 2) {
            return null;
        }

        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(`https://steve-airways.onrender.com/api/flights/get-price/${flightNumber.trim().toUpperCase()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    toast.error(`Vol ${flightNumber} non trouvé`, { duration: 3000 });
                    return null;
                }
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.price) {
                return {
                    price: Number(data.price) || 0,
                    currency: data.currency || "USD",
                };
            }

            return null;
        } catch (error) {
            console.error("Erreur lors de la récupération du prix:", error);
            toast.error("Erreur de connexion au serveur", { duration: 3000 });
            return null;
        }
    };

    // Gestion du changement du numéro de vol retour
    const handleFlightNumberReturnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const flightNumber = e.target.value;

        // Mettre à jour l'état du champ
        setFormData((prev) => ({
            ...prev,
            flightNumberReturn: flightNumber,
        }));

        // Réinitialiser le prix du vol retour si le champ est vide
        if (!flightNumber || flightNumber.trim().length < 2) {
            setCalculatedPrice2(0);
            setPriceCurrency2("USD");
            return;
        }

        // Annuler le timeout précédent
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Rechercher le prix après un délai (debounce)
        timeoutRef.current = setTimeout(async () => {
            if (flightNumber && flightNumber.trim().length >= 3) {
                setLoadingReturnFlight(true);
                try {
                    const flightData = await fetchReturnFlightPrice(flightNumber.trim());

                    if (flightData) {
                        // Mettre à jour le prix du vol retour
                        setCalculatedPrice2(flightData.price);
                        setPriceCurrency2(flightData.currency);

                        // Afficher un message de succès
                        toast.success(
                            `Prix du vol retour trouvé: ${flightData.currency === "USD" ? "$" : ""}${flightData.price} ${flightData.currency}`,
                            { duration: 3000 },
                        );
                    } else if (flightNumber.trim().length >= 5) {
                        // Si le numéro est complet mais pas trouvé
                        toast.error(`Vol ${flightNumber} non trouvé`, {
                            duration: 3000,
                        });
                        setCalculatedPrice2(0);
                        setPriceCurrency2("USD");
                    }
                } catch (error) {
                    console.error("Erreur recherche vol retour:", error);
                } finally {
                    setLoadingReturnFlight(false);
                }
            }
        }, 500);
    };

    // Fonction pour réinitialiser quand on désactive "Round-Trip"
    const handleRoundTripToggle = (checked: boolean) => {
        setIsRoundTrip(checked);
        if (!checked) {
            setFormData((prev) => ({ ...prev, flightNumberReturn: "" }));
            setCalculatedPrice2(0);
            setPriceCurrency2("USD");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "flightNumberReturn") {
            handleFlightNumberReturnChange(e as React.ChangeEvent<HTMLInputElement>);
            return;
        }

        if (name === "idClient" && formData.idTypeClient === "nimu") {
            setFormData((prev) => ({
                ...prev,
                idClient: formatNimuLicens(value),
            }));
            return;
        }

        if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
            setFormData({
                ...formData,
                [name]: e.target.checked ? value : "",
            });
            return;
        }

        setFormData((prev) => {
            // Créez un objet temporaire avec des types plus larges
            const updatedData: any = {
                ...prev,
                [name]: value,
            };

            // Gestion conditionnelle pour devisePayment
            if (name === "devisePayment") {
                if (value !== "htg") {
                    updatedData.taux_jour = "";
                }
                // TypeScript sait maintenant que value peut être "usd" ou "htg"
                updatedData.devisePayment = value as "usd" | "htg";
            }

            // Gestion conditionnelle pour paymentMethod
            if (name === "paymentMethod") {
                if (value !== "cash") {
                    updatedData.devisePayment = "";
                    updatedData.taux_jour = "";
                }
                // TypeScript sait maintenant que value peut être l'une des méthodes de paiement
                updatedData.paymentMethod = value as "card" | "cash" | "cheque" | "virement" | "transfert" | "contrat";
            }

            return updatedData;
        });
    };

    // Fonction pour gérer le changement du prénom
    const handleFirstNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        setFormData((prev) => ({
            ...prev,
            firstName: value,
        }));

        if (value.length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/passengers/search?q=${value}`);
            const data: ApiPassenger[] = await res.json();
            setSuggestions(data);
            setShowDropdown(data.length > 0);
        } catch (error) {
            console.error("Erreur recherche passagers:", error);
            setSuggestions([]);
            setShowDropdown(false);
        }
    };

    // Fonction pour quand l'input perd le focus
    const handleFirstNameBlur = () => {
        setTimeout(() => {
            setShowDropdown(false);
            setSuggestions([]);
        }, 200);
    };

    const selectPassenger = (p: ApiPassenger) => {
        setFormData((prev) => ({
            ...prev,
            firstName: p.first_name || "",
            middleName: p.middle_name || "",
            lastName: p.last_name || "",
            dateOfBirth: p.date_of_birth || "",
            idClient: p.idClient || "",
            idTypeClient: p.idTypeClient || "",
            address: p.address || "",
            country: p.country || "",
            nationality: p.nationality || "",
            phone: p.phone || "",
            email: p.email || "",
            nom_urgence: p.nom_urgence || "",
            email_urgence: p.email_urgence || "",
            tel_urgence: p.tel_urgence || "",
        }));

        setShowDropdown(false);
        setSuggestions([]);
    };

    // Calcul du prix du vol aller - CORRIGÉ
    const baseFlightPrice = Number(flight.price) || 0;
    const tauxJourNumber = Number(formData.taux_jour) || 0;

    const calculatedPrice = formData.devisePayment === "htg" && tauxJourNumber > 0 ? baseFlightPrice * tauxJourNumber : baseFlightPrice;

    const calculatedPrice3 = formData.devisePayment === "htg" && tauxJourNumber > 0 ? calculatedPrice2 * tauxJourNumber : calculatedPrice2;

    const priceCurrency = formData.devisePayment === "htg" ? "HTG" : "USD";

    // Calcul du prix total - CORRIGÉ
    const price2 = Number(calculatedPrice3) || 0;
    const price1 = Number(calculatedPrice) || 0;
    const totalPrice = isRoundTrip ? price1 + price2 : price1;

    const handleSubmit = async () => {
        setCreateTicket(true);

        // Validation des champs obligatoires
        const requiredFields = [
            { field: formData.firstName, name: "Prénom" },
            { field: formData.lastName, name: "Nom" },
            { field: formData.email, name: "Email" },
            { field: formData.phone, name: "Téléphone" },
            { field: formData.nationality, name: "Nationalité" },
            { field: formData.dateOfBirth, name: "Date de naissance" },
        ];

        const missingFields = requiredFields.filter((f) => !f.field).map((f) => f.name);

        if (missingFields.length > 0) {
            toast.error(`Veuillez remplir tous les champs obligatoires : ${missingFields.join(", ")}`, {
                style: {
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #f87171",
                },
                iconTheme: { primary: "#fff", secondary: "#dc2626" },
            });
            setCreateTicket(false);
            return;
        }

        // Si aller-retour mais pas de vol retour trouvé
        if (isRoundTrip && price2 <= 0) {
            toast.error("Veuillez entrer un numéro de vol retour valide", {
                duration: 3000,
            });
            setCreateTicket(false);
            return;
        }

        // Préparer les passagers
        const passengers: Passenger[] = [];
        const passengerCount = Number(formData.passengerCount || 1);

        for (let i = 0; i < passengerCount; i++) {
            passengers.push({
                firstName: formData.firstName,
                flightNumberReturn: formData.flightNumberReturn || "",
                middleName: formData.middleName || "",
                lastName: formData.lastName,
                reference: formData.reference || "",
                companyName: formData.companyName || "",
                idClient: formData.idClient || "",
                idTypeClient: formData.idTypeClient || "passport",
                nom_urgence: formData.nom_urgence || "",
                email_urgence: formData.email_urgence || "",
                tel_urgence: formData.tel_urgence || "",
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender || "other",
                title: formData.title || "Mr",
                address: formData.address || "",
                type: "adult",
                typeVol: flight?.type || "plane",
                typeVolV: isRoundTrip ? "roundtrip" : "onway",
                country: formData.country || "",
                nationality: formData.nationality || "",
                phone: formData.phone || "",
                email: formData.email || "",
                devisePayment: formData.devisePayment || "",
                price: totalPrice.toString(),
                taux_jour: formData.taux_jour || "",
                selectedSeat: formData.selectedSeat || "",
            });
        }

        // Préparer le body
        const body = {
            flightId: flight.id,
            passengers,
            contactInfo: {
                email: formData.email,
                phone: formData.phone,
            },
            totalPrice: totalPrice,
            unpaid: formData.unpaid || "confirmed",
            referenceNumber: formData.reference || "",
            currency: formData.devisePayment || "usd",
            price: totalPrice,
            taux_jour: formData.taux_jour || "",
            companyName: formData.companyName || "",
            departureDate: flight.departure.split("T")[0],
            paymentMethod: formData.paymentMethod || "card",
            idClient: formData.idClient || "",
            idTypeClient: formData.idTypeClient || "passport",
            returnFlightNumber: formData.flightNumberReturn || null,
            isRoundTrip: isRoundTrip,
            selectedSeat: formData.selectedSeat || "",
        };

        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                toast.error("❌ Vous devez être connecté pour créer un ticket");
                setCreateTicket(false);
                return;
            }

            const res = await fetch("https://steve-airways.onrender.com/api/create-ticket", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            let data: any;
            try {
                data = await res.json();
            } catch (jsonErr) {
                console.error("❌ Erreur parsing JSON:", jsonErr);
                const text = await res.text();
                console.error("📝 Réponse brute:", text);
                toast.error("❌ Réponse serveur invalide");
                setCreateTicket(false);
                return;
            }

            // Gestion des erreurs
            if (res.status === 400) {
                if (data.error === "No seats available" || data.error === "Not enough seats available") {
                    toast.error(data.message || "Plus de places disponibles pour ce vol", {
                        style: {
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #f87171",
                        },
                        iconTheme: { primary: "#fff", secondary: "#dc2626" },
                        duration: 5000,
                    });
                } else {
                    toast.error(data.message || "Erreur de validation", {
                        style: {
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #f87171",
                        },
                        iconTheme: { primary: "#fff", secondary: "#dc2626" },
                    });
                }
                setCreateTicket(false);
                return;
            }

            if (res.status === 409) {
                toast.error(data.message || "Ce passager a déjà une réservation sur ce vol", {
                    style: {
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #f87171",
                    },
                    iconTheme: { primary: "#fff", secondary: "#dc2626" },
                    duration: 5000,
                });
                setCreateTicket(false);
                return;
            }

            if (res.status === 404) {
                toast.error(data.message || "Le vol spécifié n'existe pas", {
                    style: {
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #f87171",
                    },
                    iconTheme: { primary: "#fff", secondary: "#dc2626" },
                    duration: 5000,
                });
                setCreateTicket(false);
                return;
            }

            if (res.status === 500) {
                console.error("❌ Erreur 500 détaillée:", data);
                let errorMessage = "Une erreur interne s'est produite lors de la création du ticket";
                if (data.details) errorMessage += ` (${data.details})`;

                toast.error(errorMessage, {
                    style: {
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #f87171",
                    },
                    iconTheme: { primary: "#fff", secondary: "#dc2626" },
                    duration: 5000,
                });
                setCreateTicket(false);
                return;
            }

            // Succès
            if (res.status === 200 && data.success) {
                console.log("✅ Ticket créé avec succès:", data.bookingReference);

                toast.success(`Ticket créé avec succès ! Référence: ${data.bookingReference}`, {
                    style: {
                        background: "#28a745",
                        color: "#fff",
                        border: "1px solid #1e7e34",
                    },
                    iconTheme: { primary: "#fff", secondary: "#1e7e34" },
                });

                // Envoyer l'email
                try {
                    let returnFlight = null;
                    if (isRoundTrip && formData.flightNumberReturn) {
                        try {
                            const resReturn = await fetch(`https://steve-airways.onrender.com/api/flights/${formData.flightNumberReturn}`, {
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                                },
                            });

                            if (resReturn.ok) {
                                const flightData = await resReturn.json();
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
                            }
                        } catch (err) {
                            console.error("Erreur récupération vol retour:", err);
                        }
                    }

                    const bookingData = {
                        from: flight.from || "",
                        to: flight.to || "",
                        fromCity: flight.fromCity || "",
                        toCity: flight.toCity || "",
                        outbound: {
                            date: flight.departure,
                            noflight: flight.flight_number,
                            departure_time: flight.departure,
                            arrival_time: flight.arrival,
                        },
                        return: returnFlight,
                        passengersData: { adults: passengers },
                        totalPrice: data.totalPrice || totalPrice,
                        selectedSeat: data.selectedSeat || formData.selectedSeat || "",
                        tabType: flight.type || "plane",
                        status: data.status || "pending",
                        currency: formData.devisePayment,
                    };

                    await sendTicketByEmail(bookingData, data.bookingReference, formData.paymentMethod);
                    console.log("✅ Email envoyé avec succès");
                    // 4️⃣ AFFICHER UN REÇU HTML POUR BACKUP
                    const showHTMLReceipt = () => {
                        const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Reçu - ${data.bookingReference}</title>
                            <meta charset="UTF-8">
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 0;
                                    padding: 20px;
                                    background: #f5f5f5;
                                }
                                .receipt-container {
                                    max-width: 320px;
                                    margin: 0 auto;
                                    background: white;
                                    padding: 20px;
                                   
                                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                }
                                .header {
                                    text-align: center;
                                    font-weight: bold;
                                    font-size: 18px;
                                    margin-bottom: 10px;
                                    color: #1A237E;
                                }
                                .divider {
                                    margin: 20px 0;
                                }

                                .section-title {
                                    font-weight: bold;
                                    margin: 10px 0 5px 0;
                                    color: #333;
                                }
                                .barcode {
                                    text-align: center;
                                    margin: 20px 0;
                                }
                                .controls {
                                    text-align: center;
                                    margin-top: 20px;
                                    padding-top: 20px;
                                    border-top: 1px solid #eee;
                                }
                                button {
                                    padding: 10px 20px;
                                    margin: 0 10px;
                                    background: #1A237E;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                }
                                button:hover {
                                    background: #283593;
                                }
                                .info-line {
                                    margin: 5px 0;
                                    font-size: 13px;
                                }
                                .total {
                                    font-weight: bold;
                                    font-size: 16px;
                                    color: #d32f2f;
                                }
                                @media print {
                                    body {
                                        background: white;
                                        padding: 0;
                                    }
                                    .receipt-container {
                                        box-shadow: none;
                                       
                                        max-width: 80mm;
                                    }
                                    .controls {
                                        display: none;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="receipt-container">
                                 <div class="header" style="text-align: center; margin-bottom: 15px;">
                                    <img src="https://trogonairways.com/assets/logo/trogon-bird-color.svg" alt="" style="height: 40px; vertical-align: middle;">
                                    <div id="logoText" class="logo-fallback">
                                        TROGON AIRWAYS
                                    </div>
                                </div>
                                <div style="text-align: center; font-size: 12px; color: #666;">
                                    Reçu de réservation<br>
                                    ${new Date().toLocaleDateString("fr-FR", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                                
                                <div class="divider"></div> 
                                
                                <div style=" font-weight: bold; font-size: 14px;">Caissier: ${user ? user.name : "..."}</div>
                                <div class="divider"></div>
                               
                                <div class="divider"></div>

                                <div style="text-align: center; font-weight: bold; font-size: 14px;">
                                   ${bookingData.return ? `Billet Aller-Retour` : `Billet Simple`}
                                </div>
                                
                                <div class="divider"></div>
                                
                                <div class="section-title">VOL ALLER</div>
                                <div class="info-line">${bookingData.from} → ${bookingData.to}</div>
                                <div class="info-line">Vol: ${bookingData.outbound.noflight}</div>
                                <div class="info-line">Départ: ${new Date(bookingData.outbound.departure_time).toLocaleString("fr-FR")}</div>
                                <div class="info-line">Arrivée: ${new Date(bookingData.outbound.arrival_time).toLocaleString("fr-FR")}</div>
                                
                                ${
                                    bookingData.return
                                        ? `
                                    <div class="divider"></div>
                                    <div class="section-title">VOL RETOUR</div>
                                    <div class="info-line">${bookingData.to} → ${bookingData.from}</div>
                                    <div class="info-line">Vol: ${bookingData.return.noflight}</div>
                                    <div class="info-line">Départ: ${new Date(bookingData.return.departure_time).toLocaleString("fr-FR")}</div>
                                    <div class="info-line">Arrivée: ${new Date(bookingData.return.arrival_time).toLocaleString("fr-FR")}</div>
                                `
                                        : ""
                                }
                                
                                <div class="divider"></div>
                                
                                <div class="section-title">Client</div>
                                ${bookingData.passengersData.adults
                                    .map((p: Passenger, i: number) => `<div class="info-line">${p.firstName} ${p.lastName}</div>`)
                                    .join("")}
                                
                                <div class="divider"></div>
                                
                                <div class="section-title">PAIEMENT</div>
                                <div class="info-line">
                                    <span>TOTAL:</span>
                                <span style="float: right;" class="total">
${totalPrice.toFixed(2)} ${priceCurrency}
</span>
                                </div>
                                <div class="info-line">
                                    <span>Mode de paiment:</span>
                                    <span style="float: right;">
                                        ${
                                            formData.paymentMethod === "cash"
                                                ? "Espèces"
                                                : formData.paymentMethod === "card"
                                                  ? "Carte"
                                                  : formData.paymentMethod === "cheque"
                                                    ? "Chèque"
                                                    : formData.paymentMethod === "transfert"
                                                      ? "dépôt"
                                                      : formData.paymentMethod === "virement"
                                                        ? "Virement"
                                                        : "Contrat"
                                        }
                                    </span>
                                </div>
                                <div class="info-line">
                                    <span>Statut:</span>
                                    <span style="float: right; color: green; font-weight: bold;">${formData.paymentMethod === "cash" ? "Confirmé" : formData.paymentMethod === "card" ? "Confirmé" : formData.paymentMethod === "cheque" ? "Confirmé" : formData.paymentMethod === "virement" ? "Confirmé" : formData.paymentMethod === "transfert" ? "Confirmé" : "Non Confirmé"}</span>
                                </div>
                                
                             
                                
                                <div class="barcode">
                                    <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.bookingReference}&code=Code128&dpi=96&dataseparator=" 
                                         alt="Barcode ${data.bookingReference}" 
                                         style="max-width: 100%; height: auto;">
                                </div>
                                
                                <div style="font-size: 11px; text-align: center; color: #666; margin-top: 15px;">
                                    <div style="font-weight: bold; margin-bottom: 5px;">IMPORTANT</div>
                                    <div>• Présentez ce reçu à l'enregistrement</div>
                                    <div>• Arrivez 2h avant le départ</div>
                                    <div>• Pièces d'identité obligatoires</div>
                                    <div style="margin-top: 10px;">Tél: +509 3341 0404 / +509 2995 0404</div>
                                    <div>www.trogonairways.com</div>
                                </div>
                                
                                <div class="controls">
                                    <button onclick="window.print()">🖨️ Imprimer ce reçu</button>
                                    <button onclick="window.close()">Fermer</button>
                                </div>
                            </div>
                            
                           
                        </body>
                        </html>
                    `;

                        const receiptWindow = window.open("", "_blank", "width=500,height=800");
                        if (receiptWindow) {
                            receiptWindow.document.write(htmlContent);
                            receiptWindow.document.close();
                        }
                    };

                    // Afficher le reçu HTML en backup
                    showHTMLReceipt();
                } catch (emailError) {
                    console.error("❌ Erreur détaillée envoi email:", emailError);
                    toast.error("Ticket créé mais email non envoyé", {
                        duration: 3000,
                    });
                }

                // Réinitialiser
                setFormData({
                    ...initialFormData,
                    paymentMethod: "card",
                    gender: "other",
                    title: "Mr",
                    passengerCount: 1,
                });

                setIsRoundTrip(false);
                setCalculatedPrice2(0);
                setPriceCurrency2("USD");
                setSuggestions([]);
                setShowDropdown(false);

                if (onTicketCreated) {
                    onTicketCreated();
                }

                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                console.error("❌ Erreur création ticket - Réponse:", data);
                const errorMessage = data.message || data.details || data.error || "Une erreur s'est produite";

                toast.error(errorMessage, {
                    style: {
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #f87171",
                    },
                    iconTheme: { primary: "#fff", secondary: "#dc2626" },
                    duration: 5000,
                });
            }
        } catch (err: any) {
            console.error("❌ Erreur réseau/fetch:", {
                message: err.message,
                stack: err.stack,
                name: err.name,
            });

            let errorMsg = "❌ Erreur de connexion au serveur";
            if (err.message.includes("Failed to fetch")) {
                errorMsg = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
            } else if (err.message.includes("NetworkError")) {
                errorMsg = "Erreur réseau. Vérifiez votre connexion.";
            }

            toast.error(errorMsg, {
                duration: 5000,
            });
        } finally {
            setCreateTicket(false);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setIsRoundTrip(false);
        setCalculatedPrice2(0);
        setPriceCurrency2("USD");
        setSuggestions([]);
        setShowDropdown(false);
        setOccupiedSeats([]); // Réinitialiser les sièges occupés
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Backdrop avec flou - identique aux autres popups */}
                    <motion.div
                        className="fixed inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    {/* Contenu du modal - plus large */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className="relative mx-auto my-8 flex w-full max-w-7xl items-center justify-center p-4"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl shadow-slate-900/30 ring-1 ring-white/50">
                            {/* Bouton fermer identique */}
                            <button
                                onClick={handleClose}
                                className="group absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 active:scale-95"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5 text-slate-700 transition-transform group-hover:rotate-90" />
                                <span className="absolute -inset-1 rounded-full bg-slate-100/50 transition-all group-hover:bg-slate-200/50" />
                            </button>

                            <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-8 pb-6 pt-8">
                                <div className="absolute -bottom-1 left-0 right-0 h-4 bg-gradient-to-t from-white/20 to-transparent" />

                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <svg
                                                className="h-7 w-7 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Create Ticket for Flight {flight.flight_number}</h2>
                                            <div className="mt-2 flex items-center gap-3">
                                                <div className="rounded-full bg-white/20 px-4 py-1.5">
                                                    <span className="text-sm font-semibold text-white">
                                                        {flight.from} → {flight.to}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-white/90">
                                                    • Departure: {new Date(flight.departure).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section vol retour */}
                                <div className="mt-6 rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-semibold text-white">Round-Trip</span>

                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    checked={isRoundTrip}
                                                    onChange={(e) => handleRoundTripToggle(e.target.checked)}
                                                />
                                                <div className="peer h-7 w-14 rounded-full bg-white/30 transition-all peer-checked:bg-amber-400 peer-focus:ring-2 peer-focus:ring-amber-400/50"></div>
                                                <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all peer-checked:translate-x-7"></div>
                                            </label>

                                            <div className="relative flex-1">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        id="flightNumberReturn"
                                                        name="flightNumberReturn"
                                                        placeholder="Return flight number"
                                                        disabled={!isRoundTrip}
                                                        required={isRoundTrip}
                                                        value={formData.flightNumberReturn}
                                                        onChange={handleChange}
                                                        className={`w-full rounded-xl border-0 bg-white/20 px-4 py-3 pl-12 text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/60 ${
                                                            isRoundTrip
                                                                ? "focus:bg-white/30 focus:ring-2 focus:ring-white/50"
                                                                : "cursor-not-allowed opacity-50"
                                                        }`}
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        <svg
                                                            className="h-5 w-5 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                                            />
                                                        </svg>
                                                    </div>

                                                    {loadingReturnFlight && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                                        </div>
                                                    )}

                                                    {!loadingReturnFlight && price2 > 0 && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                                                                {price2} {priceCurrency}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Affichage des infos du vol retour */}
                                    {price2 > 0 ? (
                                        <div className="mt-3 rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">Round-trip flight confirmed ✓</p>
                                                        <div className="flex flex-wrap gap-4 text-sm text-white/90">
                                                            <span>
                                                                Return flight: <span className="font-bold">{formData.flightNumberReturn}</span>
                                                            </span>
                                                            <span>
                                                                Return price:{" "}
                                                                <span className="font-bold">
                                                                    {price2} {priceCurrency}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-white/90">
                                                        Total to pay:{" "}
                                                        <span className="text-lg font-bold text-white">
                                                            {totalPrice.toFixed(2)} {priceCurrency}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3 rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">One-way flight ✓</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-white/90">
                                                        Total to pay:{" "}
                                                        <span className="text-lg font-bold text-white">
                                                            {totalPrice.toFixed(2)} {priceCurrency}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contenu principal avec formulaire et sièges */}
                            <div className="flex max-h-[70vh] overflow-hidden">
                                {/* Formulaire (gauche) */}
                                <div className="flex-1 overflow-auto p-8">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        {/* Prénom avec autocomplete */}
                                        <div className="relative flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-amber-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                                First Name
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    ref={setInputRef}
                                                    id="firstName"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleFirstNameChange}
                                                    onBlur={handleFirstNameBlur}
                                                    autoComplete="off"
                                                    placeholder="Enter first name"
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 p-1">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {showDropdown && suggestions.length > 0 && (
                                                    <div
                                                        ref={setDropdownRef}
                                                        className="absolute top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl"
                                                    >
                                                        {suggestions.map((p) => (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => selectPassenger(p)}
                                                                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-amber-50"
                                                            >
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-100 to-amber-200">
                                                                    <span className="text-xs font-semibold text-amber-700">
                                                                        {p.first_name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">
                                                                        {p.first_name} {p.last_name}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">{p.email || p.phone}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Middle Name */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">Middle Name</label>
                                            <input
                                                type="text"
                                                id="middleName"
                                                name="middleName"
                                                placeholder="Middle name"
                                                value={formData.middleName}
                                                autoComplete="off"
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Last Name */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">Last Name</label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                name="lastName"
                                                placeholder="Last name"
                                                value={formData.lastName}
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Date of Birth */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-amber-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                Date of Birth
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    id="dateOfBirth"
                                                    name="dateOfBirth"
                                                    value={formData.dateOfBirth}
                                                    required
                                                    onChange={handleChange}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 p-1">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-emerald-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                </svg>
                                                Address
                                            </label>
                                            <input
                                                type="text"
                                                id="address"
                                                name="address"
                                                placeholder="Full address"
                                                value={formData.address}
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* ID Type */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-blue-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                    />
                                                </svg>
                                                ID Type
                                            </label>
                                            <select
                                                id="idTypeClient"
                                                name="idTypeClient"
                                                value={formData.idTypeClient}
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            >
                                                <option value="passport">Passport</option>
                                                <option value="nimu">NINU</option>
                                                <option value="licens">License</option>
                                            </select>
                                        </div>

                                        {/* ID Number */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">
                                                {formData.idTypeClient === "nimu"
                                                    ? "NINU ID"
                                                    : formData.idTypeClient === "licens"
                                                      ? "License ID"
                                                      : "Passport Number"}
                                            </label>
                                            <input
                                                type="text"
                                                id="idClient"
                                                name="idClient"
                                                placeholder={
                                                    formData.idTypeClient === "nimu"
                                                        ? "000-000-000-0"
                                                        : formData.idTypeClient === "licens"
                                                          ? "License number"
                                                          : "Passport number"
                                                }
                                                value={formData.idClient}
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Country */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-red-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                id="country"
                                                name="country"
                                                placeholder="Country"
                                                required
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Nationality */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">Nationality</label>
                                            <input
                                                type="text"
                                                id="nationality"
                                                name="nationality"
                                                placeholder="Nationality"
                                                value={formData.nationality}
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-orange-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                Email
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    placeholder="Email address"
                                                    value={formData.email}
                                                    required
                                                    onChange={handleChange}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 p-1">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-green-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                    />
                                                </svg>
                                                Phone
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    id="phone"
                                                    name="phone"
                                                    placeholder="Phone number"
                                                    value={formData.phone}
                                                    required
                                                    onChange={handleChange}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 p-1">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Method */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-amber-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                Payment Method
                                            </label>
                                            <select
                                                id="paymentMethod"
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="cheque">Check</option>
                                                <option value="virement">Bank Transfer</option>
                                                <option value="transfert">Deposit</option>
                                                <option value="contrat">Contract</option>
                                            </select>
                                        </div>

                                        {/* UnPaid */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">Payment Status</label>
                                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <label className="flex cursor-pointer items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-700">Mark as Unpaid</span>
                                                    <div className="relative inline-flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id="unpaid"
                                                            name="unpaid"
                                                            value="pending"
                                                            required
                                                            onChange={handleChange}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="peer h-7 w-14 rounded-full bg-slate-200 transition-all peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500/50"></div>
                                                        <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all peer-checked:translate-x-7"></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Price Display */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">Total Price</label>
                                            <div className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-amber-700">
                                                        {totalPrice.toFixed(2)} {priceCurrency}
                                                    </div>
                                                    {isRoundTrip && price2 > 0 && (
                                                        <p className="mt-1 text-xs text-amber-600">
                                                            Outbound: {price1.toFixed(2)} {priceCurrency} + Return: {price2.toFixed(2)}{" "}
                                                            {priceCurrency}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Details (Cash only) */}
                                        {formData.paymentMethod === "cash" && (
                                            <>
                                                <div className="flex flex-col">
                                                    <label className="mb-2 text-sm font-semibold text-slate-700">Payment Currency</label>
                                                    <select
                                                        name="devisePayment"
                                                        value={formData.devisePayment}
                                                        onChange={handleChange}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                    >
                                                        <option value="usd">USD</option>
                                                        <option value="htg">GOURDE</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col">
                                                    <label className="mb-2 text-sm font-semibold text-slate-700">Exchange Rate</label>
                                                    <input
                                                        type="number"
                                                        name="taux_jour"
                                                        value={formData.taux_jour}
                                                        onChange={handleChange}
                                                        disabled={formData.devisePayment !== "htg"}
                                                        placeholder="e.g., 135"
                                                        className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 ${
                                                            formData.devisePayment !== "htg" ? "cursor-not-allowed bg-slate-50" : "bg-white"
                                                        }`}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Company Name */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <svg
                                                    className="h-4 w-4 text-blue-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                    />
                                                </svg>
                                                Company Name
                                            </label>
                                            <input
                                                type="text"
                                                id="companyName"
                                                name="companyName"
                                                placeholder="Company name"
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Reference Number */}
                                        <div className="flex flex-col">
                                            <label className="mb-2 text-sm font-semibold text-slate-700">Reference Number</label>
                                            <input
                                                type="text"
                                                id="reference"
                                                name="reference"
                                                placeholder="Reference number"
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>

                                        {/* Emergency Contact */}
                                        <div className="md:col-span-3">
                                            <div className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 p-6">
                                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-rose-800">
                                                    <svg
                                                        className="h-5 w-5 text-rose-500"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                                                        />
                                                    </svg>
                                                    Emergency Contact Information
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                    <div className="flex flex-col">
                                                        <label className="mb-2 text-sm font-medium text-rose-700">Contact Name</label>
                                                        <input
                                                            type="text"
                                                            id="nom_urgence"
                                                            name="nom_urgence"
                                                            value={formData.nom_urgence}
                                                            placeholder="Contact name"
                                                            required
                                                            onChange={handleChange}
                                                            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="mb-2 text-sm font-medium text-rose-700">Contact Email</label>
                                                        <input
                                                            type="text"
                                                            id="email_urgence"
                                                            name="email_urgence"
                                                            value={formData.email_urgence}
                                                            placeholder="Contact email"
                                                            required
                                                            onChange={handleChange}
                                                            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="mb-2 text-sm font-medium text-rose-700">Contact Phone</label>
                                                        <input
                                                            type="text"
                                                            id="tel_urgence"
                                                            name="tel_urgence"
                                                            value={formData.tel_urgence}
                                                            placeholder="Contact phone"
                                                            required
                                                            onChange={handleChange}
                                                            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hidden field */}
                                        <input
                                            type="hidden"
                                            id="passengerCount"
                                            name="passengerCount"
                                            min="1"
                                            defaultValue={1}
                                            required
                                            onChange={handleChange}
                                        />

                                        {/* Submit Button */}
                                        <div className="md:col-span-3">
                                            <div className="relative pt-6">
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={createTicket}
                                                    className="relative w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                                >
                                                    <span className="flex items-center justify-center gap-3">
                                                        {createTicket ? (
                                                            <>
                                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                                Creating Ticket...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg
                                                                    className="h-5 w-5"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                    />
                                                                </svg>
                                                                Confirm & Create Ticket
                                                            </>
                                                        )}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section Sélection de Siège (droite) */}
                                <div className="w-96 border-l border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6">
                                    <div className="mb-6">
                                        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                            <svg
                                                className="h-5 w-5 text-amber-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                                />
                                            </svg>
                                            Seat Selection
                                        </h3>
                                        <p className="text-sm text-slate-600">
                                            Aircraft: {flight.airline} • Available: {flight.seats_available} seats
                                        </p>
                                    </div>

                                    {/* Visualisation de la cabine améliorée */}
                                    <div className="mb-6">
                                        <div className="mb-4 flex justify-between px-2">
                                            <div className="text-sm font-medium text-slate-700">Left Side</div>
                                            <div className="text-sm font-medium text-slate-700">Right Side</div>
                                        </div>

                                        {/* Rangées de sièges */}
                                        <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                                            {Array.from({ length: Math.floor(flight.total_seat / 6) }).map((_, rowIndex) => (
                                                <div
                                                    key={rowIndex}
                                                    className="flex items-center"
                                                >
                                                    <div className="w-8 text-center text-sm font-bold text-amber-600">{rowIndex + 1}</div>
                                                    <div className="ml-2 flex flex-1 justify-between">
                                                        {/* Sièges gauche (A, B, C) */}
                                                        <div className="flex space-x-2">
                                                            {["A", "B", "C"].map((seat) => {
                                                                const seatId = `${rowIndex + 1}${seat}`;
                                                                const isOccupied = occupiedSeats.includes(seatId);
                                                                const isSelected = formData.selectedSeat === seatId;
                                                                const isWindow = seat === "A" || seat === "F";
                                                                return (
                                                                    <button
                                                                        key={seat}
                                                                        type="button"
                                                                        onClick={() => handleSeatSelect(seatId)}
                                                                        disabled={isOccupied}
                                                                        className={`relative h-10 w-10 rounded-lg text-sm font-semibold transition-all ${
                                                                            isSelected
                                                                                ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg"
                                                                                : isOccupied
                                                                                  ? "cursor-not-allowed bg-gradient-to-br from-red-400 to-red-500 text-white opacity-80"
                                                                                  : `bg-gradient-to-br from-white to-slate-50 text-slate-700 shadow-sm hover:shadow-md ${
                                                                                        isWindow
                                                                                            ? "border-2 border-blue-300"
                                                                                            : "border border-slate-300"
                                                                                    }`
                                                                        }`}
                                                                        title={`Seat ${seatId}${isWindow ? " (Window)" : ""}`}
                                                                    >
                                                                        {seat}
                                                                        {isWindow && !isOccupied && !isSelected && (
                                                                            <div className="absolute -right-1 -top-1">
                                                                                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Allée */}
                                                        <div className="flex w-12 items-center justify-center">
                                                            <div className="h-1 w-full rounded-full bg-slate-200"></div>
                                                        </div>

                                                        {/* Sièges droite (D, E, F) */}
                                                        <div className="flex space-x-2">
                                                            {["D", "E", "F"].map((seat) => {
                                                                const seatId = `${rowIndex + 1}${seat}`;
                                                                const isOccupied = occupiedSeats.includes(seatId);
                                                                const isSelected = formData.selectedSeat === seatId;
                                                                const isWindow = seat === "A" || seat === "F";
                                                                return (
                                                                    <button
                                                                        key={seat}
                                                                        type="button"
                                                                        onClick={() => handleSeatSelect(seatId)}
                                                                        disabled={isOccupied}
                                                                        className={`relative h-10 w-10 rounded-lg text-sm font-semibold transition-all ${
                                                                            isSelected
                                                                                ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg"
                                                                                : isOccupied
                                                                                  ? "cursor-not-allowed bg-gradient-to-br from-red-400 to-red-500 text-white opacity-80"
                                                                                  : `bg-gradient-to-br from-white to-slate-50 text-slate-700 shadow-sm hover:shadow-md ${
                                                                                        isWindow
                                                                                            ? "border-2 border-blue-300"
                                                                                            : "border border-slate-300"
                                                                                    }`
                                                                        }`}
                                                                        title={`Seat ${seatId}${isWindow ? " (Window)" : ""}`}
                                                                    >
                                                                        {seat}
                                                                        {isWindow && !isOccupied && !isSelected && (
                                                                            <div className="absolute -right-1 -top-1">
                                                                                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Légende améliorée */}
                                    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
                                        <h4 className="mb-3 text-sm font-semibold text-slate-800">Seat Legend</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg border border-slate-300 bg-gradient-to-br from-white to-slate-50"></div>
                                                <span className="text-xs text-slate-600">Available</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500"></div>
                                                <span className="text-xs text-slate-600">Selected</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-red-400 to-red-500"></div>
                                                <span className="text-xs text-slate-600">Unavailable</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg border-2 border-blue-300 bg-gradient-to-br from-white to-slate-50"></div>
                                                <span className="text-xs text-slate-600">Window Seat</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Siège sélectionné */}
                                    <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                                        <h4 className="mb-3 text-sm font-semibold text-slate-800">Selected Seat</h4>
                                        {formData.selectedSeat ? (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-purple-500">
                                                            <span className="text-lg font-bold text-white">{formData.selectedSeat}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">Seat {formData.selectedSeat}</p>
                                                            <p className="text-xs text-slate-600">
                                                                Row {formData.selectedSeat.slice(0, -1)}, Seat {formData.selectedSeat.slice(-1)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSeatSelect("")}
                                                    className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-3 text-center">
                                                <svg
                                                    className="mx-auto h-8 w-8 text-slate-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                <p className="mt-2 text-sm text-slate-500">No seat selected yet</p>
                                                <p className="text-xs text-slate-400">Please select a seat from the map</p>
                                            </div>
                                        )}
                                    </div>
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
