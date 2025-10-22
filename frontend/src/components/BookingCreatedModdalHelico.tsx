import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { format, parseISO, isValid, parse } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const SENDER_EMAIL = "info@kashpaw.com"; // adresse "from"

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
};

type BookingCreatedModalProps = {
    open: boolean;
    flight: Flight | null;
    onClose: () => void;
};
type Passenger = {
    firstName: string;
    middleName?: string;
    lastName: string;
    reference: string;
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

    // Exemple pour ton vol
    const [departureDateStr] = outboundFlight.departure_time.split(" ");
    const parsedDepartureDate = parse(departureDateStr, "yyyy-MM-dd", new Date());
    const zonedDepartureDate = toZonedTime(parsedDepartureDate, timeZone);
    const formattedDepartureDate = format(zonedDepartureDate, "EEE, dd MMM");

    const [departureDate, departureTime] = outboundFlight.departure_time.split(" ");
    const [arrivalDate, arrivalTime] = outboundFlight.arrival_time.split(" ");

    const [arrivalDateStr] = outboundFlight.arrival_time.split(" ");
    const parsedArrivalDate = parse(arrivalDateStr, "yyyy-MM-dd", new Date());
    const zonedArrivalDate = toZonedTime(parsedArrivalDate, timeZone);
    const formattedArrivalDate = format(zonedArrivalDate, "EEE, dd MMM");

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
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Payment Method:</strong> ${
              paymentMethod === "paypal" ? "PayPal" : paymentMethod === "paylater" ? "Pay Later" : "Credit/Debit Card"
          }</p>
          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${
              bookingData.tabType === "helicopter" ? "Helicopter" : "Helicopter"
          }</p>
        </div>

        <div style="background: #f9f9f9; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
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
                <h3 style="color: #1A237E; margin: 0;">Itinerary</h3>
                <table width="100%">
                  <tr>
                    <td>
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
                    <td style="text-align: right;">
                      ${
                          returnFlight
                              ? `
                          <div class="flight-card">
                            <div class="flight-header">Return Flight</div>
                            <div class="flight-details">
                              <div>
                                <strong>From:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                                <strong>To:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                                <strong>Date:</strong> ${formatDate(returnFlight.date)}
                              </div>
                              <div>
                                <strong>Departure:</strong> ${returnFlight.departure_time}<br>
                                <strong>Arrival:</strong> ${returnFlight.arrival_time}<br>
                                <strong>Flight Number:</strong> ${returnFlight.noflight}
                              </div>
                            </div>
                          </div>`
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
                    ?.map((p: Passenger) => `Adult: ${p.firstName} ${p.lastName}&nbsp;&nbsp;&nbsp;&nbsp;${p.email}`)
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
                      <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${bookingData.totalPrice.toFixed(2)}</p>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>${
                          paymentMethod === "paypal" ? "Paid" : paymentMethod === "paylater" ? "Unpaid" : "Paid"
                      }</p>
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
        <p>We look forward to welcoming you on board.</p>
        <p>Sincerely,<br>The Trogon Airways Team</p>
      </div>
    </div>
  `;
};

const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string, paymentMethod: string) => {
    const apiKey = "api-3E50B3ECEA894D1E8A8FFEF38495B5C4"; // ou process.env.SMTP2GO_API_KEY
    const recipientEmail = bookingData.passengersData.adults[0].email;

    const emailContent = generateEmailContent(bookingData, bookingReference, paymentMethod);

    const payload = {
        api_key: apiKey,
        to: [recipientEmail],
        sender: SENDER_EMAIL,
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

const BookingCreatedModal: React.FC<BookingCreatedModalProps> = ({ open, onClose, flight }) => {
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        reference: "",
        dateOfBirth: "",
        gender: "other",
        title: "Mr",
        address: "",
        country: "",
        nationality: "",
        email: "",
        phone: "",
        passengerCount: 1,
        paymentMethod: "cash",
        returnDate: "",
    });

    if (!open || !flight) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

   const handleSubmit = async () => {
    // 1️⃣ Validation des champs obligatoires
    if (!formData.firstName || !formData.lastName || !formData.reference || !formData.email || !formData.phone || !formData.nationality || !formData.dateOfBirth) {
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
            middleName: formData.middleName,
            lastName: formData.lastName,
            reference: formData.reference,
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
        referenceNumber: formData.reference,
        contactInfo: { email: formData.email, phone: formData.phone },
        totalPrice: flight.price * passengerCount,
        departureDate: flight.departure.split("T")[0],
        returnDate: formData.returnDate,
        paymentMethod: formData.paymentMethod,
    };

    try {
        // Récupérer le token depuis le localStorage ou le contexte d'authentification
        const token = localStorage.getItem('authToken'); // ou depuis votre contexte/auth
        
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
                "Authorization": `Bearer ${token}` // AJOUT DU TOKEN
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
                        passengersData: { adults: passengers },
                        totalPrice: body.totalPrice,
                    },
                    data.bookingReference,
                    formData.paymentMethod,
                );

                console.log("✅ Email envoyé avec succès");
            } catch (emailError) {
                console.error("❌ Erreur détaillée envoi email:", emailError);
                toast.error("Ticket créé mais email non envoyé");
            }

            onClose();
        } else {
            console.error("Erreur création ticket:", data);
            toast.error(`❌ Erreur: ${data.error || data.message || "inconnue"}`);
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
                        className="absolute inset-0 mx-auto my-6 flex max-w-3xl items-start justify-center p-4 sm:my-12"
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
                            </div>

                            <div className="my-4 h-px w-full bg-slate-100" />

                            <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2">
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

                                {/* Bouton */}
                                <div className="md:col-span-2">
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
