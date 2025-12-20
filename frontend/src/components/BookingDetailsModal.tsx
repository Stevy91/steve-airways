import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Calendar, Mail, Edit, Save, Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "../hooks/useAuth";

export type Flight = {
    code: string;
    from: string;
    to: string;
    arrival_date: string;
    date: string;
    id?: number;
    flight_number?: string;
    airline?: string;
    departure?: string;
    arrival?: string;
    price?: number;
};

export type Passenger = {
    id?: number;
    name: string;
    email: string;
    dob: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    gender?: string;
    title?: string;
    phone?: string;
    nationality?: string;
    nom_urgence?: string;
    email_urgence?: string;
    tel_urgence?: string;
    country?: string;
    address?: string;
    dateOfBirth?: string;
    adminNotes?: string;
};

export type BookingDetails = {
    reference: string;
    contactEmail: string;
    contactPhone?: string;
    bookedOn: string;
    paymentStatus: string;
    payment_method?: string;
    flights: Flight[];
    passengers: Passenger[];
    totalPrice: string;
    id?: string;
    typeVol?: string;
    typeV?: string;
    created_by_name?: string;
    created_by_email?: string;
    user_created_booking?: number;
    adminNotes?: string;
    booking?: string;
};

type BookingDetailsModalProps = {
    open: boolean;
    onTicketCreated?: () => void;
    bookingModify?: () => void;
    data?: BookingDetails;
    onClose: () => void;
    onSave: (updated: BookingDetails) => void;
};

const badgeStyles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800 ring-1 ring-green-200",
    pending: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200",
    cancelled: "bg-red-100 text-red-800 ring-1 ring-red-200",
};

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ open, data, onClose, onSave, bookingModify, onTicketCreated }) => {
    const [booking, setBooking] = useState<BookingDetails | undefined>(data);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState<string>(data?.paymentStatus || "pending");
    const [isEditing, setIsEditing] = useState(false);
    const [editedBooking, setEditedBooking] = useState<BookingDetails | null>(null);
    const [saving, setSaving] = useState(false);
    const { isAdmin, isOperateur } = useAuth();

    const dialogRef = useRef<HTMLDivElement | null>(null);

    // Calculer le prix de base par passager à partir du prix total initial
    const getPassengerPrice = useCallback((totalPrice: string, passengerCount: number) => {
        const priceValue = parseFloat(totalPrice.replace("$", "").replace(",", ""));
        return passengerCount > 0 ? priceValue / passengerCount : priceValue;
    }, []);

    // Calculer le nouveau prix total basé sur le nombre de passagers et le prix de base
    const calculateTotalPrice = useCallback((passengers: Passenger[], basePassengerPrice: number) => {
        const total = passengers.length * basePassengerPrice;
        return `$${total}`;
    }, []);

    useEffect(() => {
        if (data) {
            setBooking(data);
            setEditedBooking(data);
            setPaymentStatus(data.paymentStatus);
            setLoading(false);
        }
    }, [data]);

    const handleEditToggle = () => {
        if (isEditing) {
            // Annuler l'édition
            setEditedBooking(booking || null);
        }
        setIsEditing(!isEditing);
    };

//     const handlePrint = async () => {
//   try {
//     const response = await fetch("https://steve-airways.onrender.com/api/generate", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ bookingData: booking }),
//     });

//     if (!response.ok) throw new Error("Erreur lors de la génération du PDF");

//     const blob = await response.blob();
//     const url = window.URL.createObjectURL(blob);

//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "billet.pdf";
//     a.click();
//     window.URL.revokeObjectURL(url);
//   } catch (err) {
//     console.error(err);
//     alert("Impossible de générer le PDF");
//   }
// };


// const generateTicketPDF = async (pdfPath: string): Promise<void> => {
//   if (!booking) {
//     console.error("Booking is undefined, impossible de générer le PDF.");
//     return;
//   }

//   try {
//     const response = await fetch(
//       `https://steve-airways.onrender.com/api/generate/${booking.reference}`
//     );

//     if (!response.ok) {
//       throw new Error(`Erreur serveur : ${response.statusText}`);
//     }

//     const blob = await response.blob();

//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = pdfPath || "billet.pdf";
//     a.click();

//     window.URL.revokeObjectURL(url);
//   } catch (error) {
//     console.error("Erreur lors du téléchargement du billet :", error);
//   }
// };


  if (!booking) return null;

  const generateTicketPDF = async (): Promise<void> => {
  try {
    const response = await fetch(
      `https://steve-airways.onrender.com/api/generate2/${booking.reference}`
    );

    if (!response.ok) {
      throw new Error("Erreur serveur lors de la génération du billet");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${booking.reference}.pdf`;
    a.click();

    window.URL.revokeObjectURL(url);

    onTicketCreated?.();
  } catch (err) {
    console.error("Erreur génération billet", err);
  }
};






    const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
        if (!editedBooking) return;

        const updatedPassengers = [...editedBooking.passengers];
        updatedPassengers[index] = {
            ...updatedPassengers[index],
            [field]: value,
        };

        setEditedBooking({
            ...editedBooking,
            passengers: updatedPassengers,
        });
    };

    const handleFlightChange = (index: number, field: keyof Flight, value: string) => {
        if (!editedBooking) return;

        const updatedFlights = [...editedBooking.flights];
        updatedFlights[index] = {
            ...updatedFlights[index],
            [field]: value,
        };

        setEditedBooking({
            ...editedBooking,
            flights: updatedFlights,
        });
    };

    const handleAddPassenger = () => {
        if (!editedBooking) return;

        const newPassenger: Passenger = {
            name: "",
            email: "",
            dob: "",
            firstName: "",
            lastName: "",
            middleName: "",
            dateOfBirth: "",
            gender: "",
            title: "",
            address: "",
            country: "",
            nationality: "",
            nom_urgence: "",
            email_urgence: "",
            tel_urgence: "",
            phone: "",
            adminNotes: "",
        };

        const updatedPassengers = [...editedBooking.passengers, newPassenger];

        // Calculer le prix de base par passager
        const basePassengerPrice = getPassengerPrice(
            booking?.totalPrice || editedBooking.totalPrice,
            booking?.passengers.length || editedBooking.passengers.length,
        );

        // Calculer le nouveau prix total
        const newTotalPrice = calculateTotalPrice(updatedPassengers, basePassengerPrice);

        setEditedBooking({
            ...editedBooking,
            passengers: updatedPassengers,
            totalPrice: newTotalPrice,
        });
    };

    const handleRemovePassenger = (index: number) => {
        if (!editedBooking) return;

        const updatedPassengers = editedBooking.passengers.filter((_, i) => i !== index);

        // Calculer le prix de base par passager
        const basePassengerPrice = getPassengerPrice(
            booking?.totalPrice || editedBooking.totalPrice,
            booking?.passengers.length || editedBooking.passengers.length,
        );

        // Calculer le nouveau prix total
        const newTotalPrice = calculateTotalPrice(updatedPassengers, basePassengerPrice);

        setEditedBooking({
            ...editedBooking,
            passengers: updatedPassengers,
            totalPrice: newTotalPrice,
        });
    };

    const handleAddFlight = () => {
        if (!editedBooking) return;

        const newFlight: Flight = {
            code: "",
            from: "",
            to: "",
            date: "",
            arrival_date: "",
        };

        setEditedBooking({
            ...editedBooking,
            flights: [...editedBooking.flights, newFlight],
        });
    };

    const handleRemoveFlight = (index: number) => {
        if (!editedBooking) return;

        const updatedFlights = editedBooking.flights.filter((_, i) => i !== index);
        setEditedBooking({
            ...editedBooking,
            flights: updatedFlights,
        });
    };

    const handleGeneralInfoChange = (field: keyof BookingDetails, value: string) => {
        if (!editedBooking) return;

        setEditedBooking({
            ...editedBooking,
            [field]: value,
        });
    };

    // const handleSaveChanges = async () => {
    //     if (!editedBooking) return;

    //     setSaving(true);
    //     try {
    //         // Utiliser directement le prix total depuis editedBooking au lieu de le recalculer
    //         const totalPriceForAPI = editedBooking.totalPrice.replace("$", "");

    //         // Sauvegarder les modifications via API
    //         const res = await fetch(`https://steve-airways.onrender.com/api/bookings/${editedBooking.reference}`, {
    //             method: "PUT",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({
    //                 passengers: editedBooking.passengers,
    //                 flights: editedBooking.flights,
    //                 contactEmail: editedBooking.contactEmail,
    //                 contactPhone: editedBooking.contactPhone,
    //                 totalPrice: totalPriceForAPI, // Utiliser la valeur directement depuis l'input
    //                 paymentStatus: paymentStatus,
    //                 adminNotes: editedBooking.adminNotes,
    //                 bookingReference:booking.reference,
    //                 typeVol:booking.typeVol,
    //                 payment_method:booking.payment_method,
    //             }),
    //         });

    //         if (!res.ok) {
    //             const errorData = await res.json();
    //             throw new Error(errorData.error || "Erreur lors de la mise à jour");
    //         }

    //         const updatedData = await res.json();

    //         // Mettre à jour le state local avec le prix formaté ($)
    //         const updatedBookingWithFormattedPrice = {
    //             ...editedBooking,
    //             totalPrice: `$${totalPriceForAPI}`,
    //         };

    //         setBooking(updatedBookingWithFormattedPrice);
    //         setIsEditing(false);

    //         // Callback pour le parent
    //         onSave && onSave(updatedBookingWithFormattedPrice);
    //          if (bookingModify) {
    //             bookingModify();
    //         }
    //     } catch (err) {
    //         console.error("❌ Failed to update booking", err);
    //         alert("Impossible de mettre à jour la réservation.");
    //     } finally {
    //         setSaving(false);
    //     }
    // };

   // Dans le composant BookingDetailsModal, modifier la fonction handleSaveChanges :

const handleSaveChanges = async () => {
    if (!editedBooking) return;

    setSaving(true);
    try {
        // Vérifier si le numéro de vol a changé
        const hasFlightChanged = editedBooking.flights.some((flight, index) => {
            const originalFlight = booking?.flights[index];
            return originalFlight && flight.code !== originalFlight.code;
        });

        // Si le vol a changé, rechercher l'ID du nouveau vol
        let flightIdToUpdate = undefined;
        let returnFlightIdToUpdate = undefined;

        if (hasFlightChanged && editedBooking.flights.length > 0) {
            // Rechercher l'ID du vol par son code
            const flightSearchPromises = editedBooking.flights.map(async (flight) => {
                try {
                    const res = await fetch(`https://steve-airways.onrender.com/api/flights/search?code=${flight.code}`);
                    if (res.ok) {
                        const flightData = await res.json();
                        return flightData.length > 0 ? flightData[0].id : null;
                    }
                    return null;
                } catch (err) {
                    console.error("Erreur recherche vol", err);
                    return null;
                }
            });

            const flightIds = await Promise.all(flightSearchPromises);
            
            if (flightIds[0]) flightIdToUpdate = flightIds[0];
            if (flightIds[1]) returnFlightIdToUpdate = flightIds[1];
        }

        // Utiliser directement le prix total depuis editedBooking
        const totalPriceForAPI = editedBooking.totalPrice.replace("$", "");

        // Sauvegarder les modifications via API
        const res = await fetch(`https://steve-airways.onrender.com/api/bookings2/${editedBooking.reference}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                passengers: editedBooking.passengers,
                flights: editedBooking.flights,
                contactEmail: editedBooking.contactEmail,
                contactPhone: editedBooking.contactPhone,
                totalPrice: totalPriceForAPI,
                paymentStatus: paymentStatus,
                adminNotes: editedBooking.adminNotes,
                bookingReference: booking.reference,
                typeVol: booking.typeVol,
                payment_method: booking.payment_method,
                flightId: flightIdToUpdate, // Envoyer le nouvel ID de vol si changement
                returnFlightId: returnFlightIdToUpdate // Envoyer le nouvel ID de vol retour si changement
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            if (errorData.error === "Un ou plusieurs vols n'existent pas") {
                alert(`Le vol ${errorData.missingFlights?.join(", ")} n'existe pas. Veuillez vérifier le numéro de vol.`);
            } else if (errorData.error?.includes("Pas assez de sièges disponibles")) {
                alert(`Erreur: ${errorData.error}. Sièges disponibles: ${errorData.seatsAvailable}`);
            } else {
                throw new Error(errorData.error || "Erreur lors de la mise à jour");
            }
            return;
        }

        const updatedData = await res.json();

        // Mettre à jour le state local
        const updatedBookingWithFormattedPrice = {
            ...editedBooking,
            totalPrice: `$${totalPriceForAPI}`,
        };

        setBooking(updatedBookingWithFormattedPrice);
        setIsEditing(false);

        // Afficher un message si le vol a changé
        if (updatedData.flightChanged) {
            alert("Le vol a été changé avec succès ! Un nouveau ticket a été créé.");
        }

        // Callback pour le parent
        onSave && onSave(updatedBookingWithFormattedPrice);
        if (bookingModify) {
            bookingModify();
        }
    } catch (err) {
        console.error("❌ Failed to update booking", err);
        alert("Ce vol n'existe pas Impossible de mettre à jour la réservation.");
    } finally {
        setSaving(false);
    }
};
   
   
   
   
    const handleSavePaymentStatus = async (newStatus: "pending" | "confirmed" | "cancelled") => {
        if (!booking) return;

        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/booking-plane/${booking.reference}/payment-status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentStatus: newStatus }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erreur API");
            }

            const data = await res.json();
            console.log("✅ Payment status updated:", data);

            // Met à jour le state local
            setBooking((prev) => (prev ? { ...prev, paymentStatus: data.newStatus } : prev));
            setEditedBooking((prev) => (prev ? { ...prev, paymentStatus: data.newStatus } : prev));

            

            onSave && onSave({ ...booking, paymentStatus: data.newStatus });
             if (bookingModify) {
                bookingModify();
            }
           onClose();
        } catch (err) {
            console.error("❌ Failed to update payment status", err);
            alert("Impossible de mettre à jour le paiement.");
        }
    };

    // Fonction utilitaire pour formater les dates en toute sécurité
    const formatDateSafely = (dateString: string, formatString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "Invalid date";
            }
            return format(date, formatString);
        } catch (error) {
            return "Invalid date";
        }
    };

    

const birth = (dateString: string, formatString: string) => {
  try {
    if (!dateString) return "Invalid date";

    const date = parseISO(dateString);
    date.setHours(12); // 🔥 empêche le décalage de jour

    return format(date, formatString);
  } catch {
    return "Invalid date";
  }
};


    if (!open) return null;
    if (loading || !booking || !editedBooking)
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="rounded-lg bg-white p-6 shadow-lg">
                    <p className="text-gray-600">Chargement des détails...</p>
                </div>
            </div>
        );

    // Calculer le prix de base par passager pour l'affichage
    const basePassengerPrice = getPassengerPrice(booking.totalPrice, booking.passengers.length);

    return (
        <AnimatePresence mode="wait">
            {open && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <motion.div
                        key={`modal-${booking?.reference || "new"}`}
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
                        aria-labelledby="booking-dialog-title"
                        ref={dialogRef}
                        className="absolute inset-0 mx-auto my-6 flex max-w-4xl items-start justify-center p-4 sm:my-12"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    >
                        <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                            {/* Header */}
                            <div className="sticky top-0 z-10 bg-white px-6 pb-4 pt-6 sm:px-8">
                                <div className="flex items-center justify-between">
                                    <h2
                                        id="booking-dialog-title"
                                        className="text-xl font-semibold text-slate-800 sm:text-2xl"
                                    >
                                        Booking Details: <span className="text-blue-900">{booking.reference}</span>
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-white hover:bg-blue-900"
                                            onClick={() => generateTicketPDF()}
                                            >
                                            Imprimer le billet
                                        </button>

                                       
                                    </div>
                                    <div className="flex items-center gap-2">
                                         {(isAdmin || isOperateur) && (
                                               <button
                                            onClick={handleEditToggle}
                                            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-white hover:bg-blue-900"
                                        >
                                            {isEditing ? <X size={16} /> : <Edit size={16} />}
                                            {isEditing ? "Cancel" : "Edit"}
                                        </button>
                                            )} 
                                        
                                        <button
                                            onClick={onClose}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                            aria-label="Close"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                                    <Mail className="h-4 w-4" />
                                    <span>Contact:</span>
                                    
                                    {isEditing ? (
                                        <span>{editedBooking.contactEmail}</span>
                                       
                                    ) : (
                                        <a
                                            className="text-blue-900 hover:underline"
                                            href={`mailto:${booking.contactEmail}`}
                                        >
                                            {booking.contactEmail}
                                        </a>
                                    )}
                                    <span className="mx-1">|</span>
                                    <Calendar className="h-4 w-4" />
                                    <span>Booked on: {formatDateSafely(booking.bookedOn, "EEE, dd MMM yy")}</span>
                                </div>
                            </div>

                            <div className="h-px w-full bg-slate-100" />

                            {/* Body */}
                            <div className="space-y-6 px-6 py-6 sm:px-8">
                                {/* Payment Status */}
                                <section className="space-y-2">
                                    <h3 className="text-lg font-bold text-amber-500">Payment Status</h3>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium ${
                                                badgeStyles[paymentStatus] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                                            }`}
                                        >
                                            {paymentStatus === "confirmed" ? "Paid" : paymentStatus === "pending" ? "Unpaid" : "cancelled"}
                                        </span>
                                    </div>
                                </section>

                                {/* add Flights important*/}

                                <section className="space-y-4">
                                    {/* <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-amber-500">Flights</h3>
                                        {isEditing && (
                                            <button
                                                onClick={handleAddFlight}
                                                className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                                            >
                                                <Plus size={16} /> Add Flight
                                            </button>
                                        )}
                                    </div> */}
                                    <ul className="space-y-3">
                                        {editedBooking.flights.map((flight, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center gap-3 rounded-lg border p-3"
                                            >
                                                <Plane className="h-4 w-4 flex-shrink-0" />
                                                <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                                                    {isEditing ? (
                                                        <>
                                                        
                                                                <span className="font-semibold text-slate-700">Flight Number: </span>
                                                                
                                                            
                                                            <input
                                                                value={flight.code}
                                                                onChange={(e) => handleFlightChange(idx, "code", e.target.value)}
                                                                placeholder="Flight code"
                                                                className="rounded border px-2 py-1 text-sm"
                                                            />
                                                            {/* <input
                                                                value={flight.from}
                                                                onChange={(e) => handleFlightChange(idx, "from", e.target.value)}
                                                                placeholder="From"
                                                                className="rounded border px-2 py-1 text-sm"
                                                            />
                                                            <input
                                                                value={flight.to}
                                                                onChange={(e) => handleFlightChange(idx, "to", e.target.value)}
                                                                placeholder="To"
                                                                className="rounded border px-2 py-1 text-sm"
                                                            />
                                                            <input
                                                                type="datetime-local"
                                                                value={flight.date}
                                                                onChange={(e) => handleFlightChange(idx, "date", e.target.value)}
                                                                className="rounded border px-2 py-1 text-sm"
                                                            /> */}
                                                        </>
                                                    ) : (
                                                        <div className="text-sm text-slate-600">
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Depart: </span>
                                                                {flight.from} → {flight.to}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Date: </span>
                                                                {formatDateSafely(flight.date, "EEE, dd MMM yy")} at{" "}
                                                                {(() => {
                                                                    try {
                                                                        const date = new Date(flight.date);
                                                                        return isNaN(date.getTime())
                                                                            ? "Invalid time"
                                                                            : date.toLocaleTimeString("fr-FR", {
                                                                                  hour: "2-digit",
                                                                                  minute: "2-digit",
                                                                              });
                                                                    } catch (error) {
                                                                        return "Invalid time";
                                                                    }
                                                                })()}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Flight Number:</span> {flight.code}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {isEditing && editedBooking.flights.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveFlight(idx)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                {/* Passengers */}
                                <section className="space-y-4">
                                    {/* <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-amber-500">Passengers ({editedBooking.passengers.length})</h3>
                                        {isEditing && (
                                            <button
                                                onClick={handleAddPassenger}
                                                className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                                            >
                                                <Plus size={16} /> Add Passenger
                                            </button>
                                        )}
                                    </div> */}
                                    <ul className="space-y-3">
                                        {editedBooking.passengers.map((passenger, idx) => (
                                            <li
                                                key={idx}
                                                className="space-y-2 rounded-lg border p-3"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <span className="font-medium text-slate-700">Passenger {idx + 1}</span>
                                                    {isEditing && editedBooking.passengers.length > 1 && (
                                                        <button
                                                            onClick={() => handleRemovePassenger(idx)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    {isEditing ? (
                                                        <>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Firstname</label>
                                                                <input
                                                                    value={passenger.firstName || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "firstName", e.target.value)}
                                                                    placeholder="First name"
                                                                    className="w-full rounded-md border border-gray-300 px-4 py-1 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Middle Name</label>
                                                                <input
                                                                    value={passenger.middleName || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "middleName", e.target.value)}
                                                                    placeholder="Middle name"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Lastname</label>
                                                                <input
                                                                    value={passenger.lastName || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "lastName", e.target.value)}
                                                                    placeholder="Last name"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Birthday</label>
                                                                <input
                                                                    type="date"
                                                                    value={passenger.dob || passenger.dateOfBirth || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "dob", e.target.value)}
                                                                    placeholder="Date of birth"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Address</label>
                                                                <input
                                                                    value={passenger.address || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "address", e.target.value)}
                                                                    placeholder="Address"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Country</label>
                                                                <input
                                                                    value={passenger.country || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "country", e.target.value)}
                                                                    placeholder="Country"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Nationality</label>
                                                                <input
                                                                    value={passenger.nationality || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "nationality", e.target.value)}
                                                                    placeholder="Nationality"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Email Address</label>
                                                                <input
                                                                    type="email"
                                                                    value={passenger.email || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "email", e.target.value)}
                                                                    placeholder="Email"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Phone</label>
                                                                <input
                                                                    value={passenger.phone || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "phone", e.target.value)}
                                                                    placeholder="Phone"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                             <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Emergency contact person name</label>
                                                                <input
                                                                    value={passenger.nom_urgence || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "nom_urgence", e.target.value)}
                                                                    placeholder="Emergency contact person name"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                             <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Email personne en cas urgence</label>
                                                                <input
                                                                    value={passenger.email_urgence || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "email_urgence", e.target.value)}
                                                                    placeholder="Email personne en cas urgence"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                             <div className="flex flex-col">
                                                                <label className="mb-1 font-medium text-gray-700">Telephone personne en cas urgence</label>
                                                                <input
                                                                    value={passenger.tel_urgence || ""}
                                                                    onChange={(e) => handlePassengerChange(idx, "tel_urgence", e.target.value)}
                                                                    placeholder="Telephone personne en cas urgence"
                                                                    className="rounded border px-2 py-1 text-sm"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-sm text-slate-600">
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Name: </span>{" "}
                                                                {passenger.name || `${passenger.firstName} ${passenger.lastName}`}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Email: </span> {passenger.email}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Birthday: </span>{" "}
                                                                {birth(passenger.dob, "EEE, dd MMM yyyy")}
                                                            </div>
                                                            {passenger.phone && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Phone: </span> {passenger.phone}
                                                                </div>
                                                            )}
                                                            
                                                            {passenger.address && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Address: </span>{" "}
                                                                    {passenger.address}
                                                                </div>
                                                            )}
                                                            {passenger.country && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Country: </span>{" "}
                                                                    {passenger.country}
                                                                </div>
                                                            )}
                                                            {passenger.nationality && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Nationality: </span>{" "}
                                                                    {passenger.nationality}
                                                                </div>
                                                            )}
                                                            {passenger.nom_urgence && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Emergency contact person name: </span>{" "}
                                                                    {passenger.nom_urgence}
                                                                </div>
                                                            )}
                                                            {passenger.email_urgence && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Email person in case of emergency: </span>{" "}
                                                                    {passenger.email_urgence}
                                                                </div>
                                                            )}
                                                            {passenger.tel_urgence && (
                                                                <div>
                                                                    <span className="font-semibold text-slate-700">Emergency contact number: </span>{" "}
                                                                    {passenger.tel_urgence}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                {/* Total Price */}
                                {/* Total Price - Version calcul automatique seulement */}
                                <section className="space-y-2">
                                    <div className="text-lg font-bold text-amber-500">
                                        Total Price: ${calculateTotalPrice(editedBooking.passengers, basePassengerPrice).replace("$", "")}
                                        {/* <div className="text-sm font-normal text-gray-500">
                                            ({editedBooking.passengers.length} passenger(s) × ${basePassengerPrice.toFixed(2)})
                                        </div> */}
                                    </div>
                                </section>

                                {/* Admin Controls */}
                                <section className="space-y-4">
                                    <h3 className="text-lg font-bold text-blue-900">Admin Controls</h3>

                                    {/* Payment Status Control */}
                                    <div className="grid gap-3 sm:max-w-md">
                                        <div className="relative">
                                            <select
                                                value={paymentStatus}
                                                onChange={(e) => setPaymentStatus(e.target.value)}
                                                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            >
                                                {["pending", "confirmed", "cancelled"].map((s) => (
                                                    <option
                                                        key={s}
                                                        value={s}
                                                    >
                                                        {s === "confirmed" ? "Paid" : s === "pending" ? "Unpaid" : "Cancelled"}
                                                        
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Admin Notes */}
                                    <div className="grid gap-3">
                                        <label className="text-lg font-bold text-amber-500">Admin Notes</label>
                                        {isEditing ? (
                                            <textarea
                                                value={editedBooking.adminNotes || ""}
                                                onChange={(e) => handleGeneralInfoChange("adminNotes", e.target.value)}
                                                placeholder="Admin notes..."
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                                rows={3}
                                            />
                                        ) : (
                                            <div className="rounded bg-slate-50 p-2 text-sm text-slate-600">{booking.adminNotes || "No notes"}</div>
                                        )}
                                    </div>
                                </section>

                                {/* Save Buttons */}
                                <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        Close
                                    </button>

                                    {isEditing ? (
                                        <button
                                            type="button"
                                            onClick={handleSaveChanges}
                                            disabled={saving}
                                            className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-400"
                                        >
                                            <Save size={16} />
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSavePaymentStatus(paymentStatus as "pending" | "confirmed" | "cancelled")}
                                            className="rounded-md bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            Update Status
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingDetailsModal;
