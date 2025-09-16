import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

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

const BookingCreatedModal: React.FC<BookingCreatedModalProps> = ({ open, onClose, flight }) => {
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
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
  // Validation côté front
  if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
    alert("Veuillez remplir les champs obligatoires : Prénom, Nom, Email, Téléphone");
    return;
  }

  // Fonction pour extraire et formater les dates
  const extractDate = (dateString: any): string | null => {
    if (!dateString) return null;
    
    console.log("Extracting date from:", dateString);
    
    // 1. Format DD/MM/YYYY (comme "15/09/2025 22:30")
    if (typeof dateString === 'string') {
      // Essaye d'abord le format DD/MM/YYYY
      const ddMmYyyyMatch = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (ddMmYyyyMatch) {
        const [_, day, month, year] = ddMmYyyyMatch;
        return `${year}-${month}-${day}`;
      }
      
      // Essaye le format YYYY-MM-DD
      const yyyyMmDdMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (yyyyMmDdMatch) {
        return yyyyMmDdMatch[0];
      }
    }
    
    // 2. Fallback: parsing avec Date object
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
    
    return null;
  };

  // Extraire les dates
  const departureDateFormatted = extractDate(flight.departure);
  const returnDateFormatted = extractDate(formData.returnDate);

  console.log("Formatted dates - departure:", departureDateFormatted, "return:", returnDateFormatted);

  // Vérifier que la date de départ est valide
  if (!departureDateFormatted) {
    alert("Impossible de déterminer la date de départ. Veuillez contacter l'administrateur.");
    return;
  }

  // Vérifier que la date de retour est après la date de départ
  if (returnDateFormatted) {
    const depDate = new Date(departureDateFormatted);
    const retDate = new Date(returnDateFormatted);
    
    if (retDate < depDate) {
      alert("La date de retour doit être égale ou supérieure à la date de départ.");
      return;
    }
  }

  // Création des passagers
  const passengers: Passenger[] = [];
  for (let i = 0; i < Number(formData.passengerCount); i++) {
    passengers.push({
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
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

  const body = {
    flightId: flight!.id,
    passengers,
    contactInfo: {
      email: formData.email,
      phone: formData.phone,
    },
    totalPrice: flight!.price * Number(formData.passengerCount),
    departureDate: departureDateFormatted,
    returnDate: returnDateFormatted,
    paymentMethod: formData.paymentMethod,
  };

  console.log("Form data being sent:", body);

  try {
    const res = await fetch("https://steve-airways.onrender.com/api/create-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      alert(`✅ Ticket créé avec succès ! Référence: ${data.bookingReference}`);
      onClose();
    } else {
      alert("❌ Erreur: " + (data.details || data.error));
    }
  } catch (err) {
    console.error(err);
    alert("❌ Impossible de créer le ticket.");
  }
};

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className="absolute inset-0 mx-auto my-6 flex max-w-3xl items-start justify-center p-4 sm:my-12"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    >
                        <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Header */}
                            <div className="px-6 pt-6">
                                <h2 className="text-xl font-semibold text-slate-800">Créer un Ticket pour le vol {flight.flight_number}</h2>
                                <p className="text-sm text-slate-500">
                                    {flight.from} → {flight.to} | Départ: {flight.departure}
                                </p>
                            </div>

                            <div className="my-4 h-px w-full bg-slate-100" />

                            {/* Body */}
                            <div className="space-y-4 px-6 pb-6">
                                {/** Input fields */}
                                <input
                                    type="text"
                                    name="firstName"
                                    placeholder="Prénom"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="text"
                                    name="middleName"
                                    placeholder="Deuxième prénom"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="text"
                                    name="lastName"
                                    placeholder="Nom"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    placeholder="Date de naissance"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Adresse"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="text"
                                    name="country"
                                    placeholder="Pays"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="text"
                                    name="nationality"
                                    placeholder="Nationalité"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Téléphone"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="number"
                                    name="passengerCount"
                                    min="1"
                                    defaultValue={1}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                <input
                                    type="date"
                                    name="returnDate"
                                    placeholder="Date retour"
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />

                                {/** Select */}
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Carte</option>
                                    <option value="cheque">Chèque</option>
                                </select>

                                {/** Submit button */}
                                <button
                                    onClick={handleSubmit}
                                    className="w-full rounded-md bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                                >
                                    Confirmer et Créer le Ticket
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingCreatedModal;
