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
              bookingData.tabType === "helicopter" ? "Helicopter" : "Helicopter"
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
        <p><strong>Important: **</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
        <p><strong>Baggage Limitation: **</strong>The maximum allowance for passenger baggage is 20 lb. <strong>Luggage dimensions 35*55*25, Carry on, soft skin</strong></p>
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
          
       
          ${paymentMethod === "cash" ? "Espèces" : paymentMethod === "card" ? "Carte bancaire" : paymentMethod === "cheque" ? "chèque bancaire" : paymentMethod === "virement" ? "Virement bancaire" : paymentMethod === "transfert" ? "Dépôt" : "Contrat"}
          </p>
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${
              bookingData.tabType === "helicopter" ? "Hélicoptère" : "Hélicoptère"
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
        <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement.</p>
        <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong></p> 
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
    const [createTicket, setCreateTicket] = useState(false);
    const [loadingReturnFlight, setLoadingReturnFlight] = useState(false);

    // États pour le prix du vol retour
    const [calculatedPrice2, setCalculatedPrice2] = useState<number>(0);
    const [priceCurrency2, setPriceCurrency2] = useState<string>("USD");

    const [suggestions, setSuggestions] = useState<any[]>([]);
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
        gender: "other",
        title: "Mr",
        address: "",
        country: "",
        nationality: "",
        email: "",
        phone: "",
        passengerCount: 1,
        paymentMethod: "card",
        price: "",
        devisePayment: "usd",
        taux_jour: "",
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (!open) {
            setSuggestions([]);
            setShowDropdown(false);
            setCalculatedPrice2(0);
            setPriceCurrency2("USD");
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

    const formatNimuLicens = (value: string) => {
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
            const updatedData = {
                ...prev,
                [name]: value,
                ...(name === "devisePayment" && value !== "htg" ? { taux_jour: "" } : {}),
            };

            if (name === "paymentMethod" && value !== "cash") {
                updatedData.devisePayment = "";
                updatedData.taux_jour = "";
            }

            return updatedData;
        });
    };

    // Fonction pour gérer le changement du prénom
    const handleFirstNameChange = async (e: any) => {
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
            const data = await res.json();
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

    const selectPassenger = (p: any) => {
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
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <motion.div
                        className="fixed inset-0 bg-black/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className="relative mx-auto my-8 w-full max-w-6xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    >
                        <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                            <button
                                onClick={handleClose}
                                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="px-6 pt-6">
                                <h2 className="text-xl font-semibold text-slate-800">Create a ticket for the flight {flight.flight_number}</h2>

                                <p className="text-sm text-slate-500">
                                    {flight.from} → {flight.to} | Departure: {flight.departure}
                                </p>
                                <div className="my-4 h-px w-full bg-slate-100" />
                                <div className="mt-1 flex items-center gap-4">
                                    <span className="text-xl font-semibold text-amber-500">Round-Trip</span>

                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={isRoundTrip}
                                            onChange={(e) => handleRoundTripToggle(e.target.checked)}
                                        />

                                        <div className="peer h-6 w-11 rounded-full bg-gray-300 transition-all peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500"></div>
                                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-5"></div>
                                    </label>

                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            id="flightNumberReturn"
                                            name="flightNumberReturn"
                                            placeholder="Return flight number"
                                            disabled={!isRoundTrip}
                                            required={isRoundTrip}
                                            value={formData.flightNumberReturn}
                                            onChange={handleChange}
                                            className={`w-full rounded-md border px-4 py-2 outline-none transition ${
                                                isRoundTrip
                                                    ? "border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                    : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                            }`}
                                        />

                                        {loadingReturnFlight && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500"></div>
                                            </div>
                                        )}

                                        {!loadingReturnFlight && price2 > 0 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                                    {price2} {priceCurrency}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Affichage des infos du vol retour trouvé */}
                                {price2 > 0 ? (
                                    <div className="mt-2 rounded-lg bg-green-50 p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-green-800">Vol retour trouvé ✓</p>
                                                <div className="flex flex-wrap gap-6">
                                                    <div className="text-green-800">
                                                        Return flight number: <span className="font-bold">{formData.flightNumberReturn}</span>
                                                    </div>

                                                    <div className="text-green-800">
                                                        Return flight price:{" "}
                                                        <span className="font-bold">
                                                            {price2} {priceCurrency}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-green-700">
                                                    Total amount to pay:{" "}
                                                    <span className="font-bold">
                                                        {totalPrice.toFixed(2)} {priceCurrency}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 rounded-lg bg-green-50 p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-green-800">Vol aller ✓</p>
                                                
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-green-700">
                                                    Total amount to pay:{" "}
                                                    <span className="font-bold">
                                                        {totalPrice.toFixed(2)} {priceCurrency}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="my-4 h-px w-full bg-slate-100" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-3">
                                {/* Prénom */}
                                <div className="relative flex flex-col">
                                    <label className="mb-1 font-medium text-gray-700">First Name</label>

                                    <input
                                        type="text"
                                        ref={setInputRef}
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleFirstNameChange}
                                        onBlur={handleFirstNameBlur}
                                        autoComplete="off"
                                        placeholder="First Name"
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />

                                    {showDropdown && suggestions.length > 0 && (
                                        <div
                                            ref={setDropdownRef}
                                            className="absolute top-full z-50 w-full rounded-md border bg-white shadow-md"
                                        >
                                            {suggestions.map((p) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => selectPassenger(p)}
                                                    className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                                >
                                                    <p className="font-medium">
                                                        {p.first_name} {p.last_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{p.email || p.phone}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Deuxième prénom */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="middleName"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Middle Name
                                    </label>
                                    <input
                                        type="text"
                                        id="middleName"
                                        name="middleName"
                                        placeholder="Middle Name"
                                        value={formData.middleName}
                                        autoComplete="off"
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
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Last Name"
                                        value={formData.lastName}
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
                                        Date of birth
                                    </label>
                                    <input
                                        type="date"
                                        id="dateOfBirth"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
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
                                        Adress
                                    </label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        placeholder="Adress"
                                        value={formData.address}
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                {/* ID Type */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="idTypeClient"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        ID Type
                                    </label>
                                    <select
                                        id="idTypeClient"
                                        name="idTypeClient"
                                        value={formData.idTypeClient}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="passport">Passport</option>
                                        <option value="nimu">NINU</option>
                                        <option value="licens">License</option>
                                    </select>
                                </div>

                                {/* ID Number */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="idClient"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        {formData.idTypeClient === "nimu"
                                            ? "ID NINU"
                                            : formData.idTypeClient === "licens"
                                              ? "ID LICENSE"
                                              : "ID PASSPORT"}
                                    </label>
                                    <input
                                        type="text"
                                        id="idClient"
                                        name="idClient"
                                        placeholder={
                                            formData.idTypeClient === "nimu"
                                                ? "000-000-000-0"
                                                : formData.idTypeClient === "licens"
                                                  ? "ID LICENSE"
                                                  : "ID PASSPORT"
                                        }
                                        value={formData.idClient}
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
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Nationalité */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="nationality"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Nationality
                                    </label>
                                    <input
                                        type="text"
                                        id="nationality"
                                        name="nationality"
                                        placeholder="Nationality"
                                        value={formData.nationality}
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
                                        E-mail
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="E-mail"
                                        value={formData.email}
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
                                        Phone
                                    </label>
                                    <input
                                        type="text"
                                        id="phone"
                                        name="phone"
                                        placeholder="Phone"
                                        value={formData.phone}
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Méthode de paiement */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="paymentMethod"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Payment Method
                                    </label>
                                    <select
                                        id="paymentMethod"
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="cheque">Check</option>
                                        <option value="virement">Bank Transfer</option>
                                        <option value="transfert">Deposit</option>
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
                                        UnPaid
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

                                {/* Prix du vol */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="price"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Flight Price
                                    </label>
                                    <input
                                        type="text"
                                        id="price"
                                        name="price"
                                        value={`${totalPrice.toFixed(2)} ${priceCurrency}`}
                                        readOnly
                                        className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 outline-none"
                                    />
                                    {isRoundTrip && price2 > 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Aller: {price1.toFixed(2)} {priceCurrency} + Retour: {price2.toFixed(2)} {priceCurrency}
                                        </p>
                                    )}
                                </div>

                                {formData.paymentMethod === "cash" && (
                                    <>
                                        <div className="flex flex-col">
                                            <label className="mb-1 font-medium text-gray-700">Payment currency</label>

                                            <select
                                                name="devisePayment"
                                                value={formData.devisePayment}
                                                onChange={handleChange}
                                                className="w-full rounded-md border px-4 py-2"
                                            >
                                                <option value="usd">USD</option>
                                                <option value="htg">GOURDE</option>
                                            </select>
                                        </div>

                                        {/* Taux du jour */}
                                        <div className="flex flex-col">
                                            <label className="mb-1 font-medium text-gray-700">Taux du jour</label>

                                            <input
                                                type="number"
                                                name="taux_jour"
                                                value={formData.taux_jour}
                                                onChange={handleChange}
                                                disabled={formData.devisePayment !== "htg"}
                                                placeholder="Ex: 135"
                                                className={`w-full rounded-md border px-4 py-2 outline-none ${
                                                    formData.devisePayment !== "htg" ? "cursor-not-allowed bg-gray-100" : ""
                                                }`}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Téléphone */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="companyName"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        id="companyName"
                                        name="companyName"
                                        placeholder="Company Name"
                                        required
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Téléphone */}
                                <div className="flex flex-col">
                                    <label
                                        htmlFor="reference"
                                        className="mb-1 font-medium text-gray-700"
                                    >
                                        Reference Number
                                    </label>
                                    <input
                                        type="text"
                                        id="reference"
                                        name="reference"
                                        placeholder="Reference Number"
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
                                        value={formData.nom_urgence}
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
                                        value={formData.email_urgence}
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
                                        value={formData.tel_urgence}
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
                                        disabled={createTicket}
                                        className="w-full rounded-md bg-amber-500 py-3 font-semibold text-white transition-colors hover:bg-amber-600 disabled:bg-gray-400"
                                    >
                                        {createTicket ? "Saving..." : "Confirm and Create the Ticket"}
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
