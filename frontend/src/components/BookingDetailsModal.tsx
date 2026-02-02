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
    idTypeClient?: string;
    idClient?: string;
    nationality?: string;
    nom_urgence?: string;
    email_urgence?: string;
    tel_urgence?: string;
    country?: string;
    address?: string;
    dateOfBirth?: string;
    adminNotes?: string;
    selectedSeat?: string;
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
    currency: string;
    id?: string;
    typeVol?: string;
    typecharter?: string;
    flightId?: number;
    returnFlightId?: number;
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

    const { user, loading: authLoading, isAdmin, hasPermission, permissions } = useAuth();

    // Vérifier plusieurs permissions
    const cancelledTicket = isAdmin || hasPermission("cancelledTicket");
    const imprimerTicket = isAdmin || hasPermission("imprimerTicket");
    const editBookings = isAdmin || hasPermission("editBookings");

    const dialogRef = useRef<HTMLDivElement | null>(null);

    // Calculer le prix de base par passager à partir du prix total initial
    const getPassengerPrice = useCallback((totalPrice: string, passengerCount: number) => {
        const priceValue = parseFloat(totalPrice.replace("$", "").replace(",", ""));
        return passengerCount > 0 ? priceValue / passengerCount : priceValue;
    }, []);

    // Calculer le nouveau prix total basé sur le nombre de passagers et le prix de base
    const calculateTotalPrice = useCallback((passengers: Passenger[], basePassengerPrice: number) => {
        const total = passengers.length * basePassengerPrice;
        return `${total} ${booking?.currency === "htg" || editedBooking?.currency === "htg" ? "HTG" : "USD"}`;
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

    if (!booking) return null;

    const generateTicketPDF = async (): Promise<void> => {
        try {
            const response = await fetch(`https://steve-airways.onrender.com/api/generate/${booking.reference}`);

            if (!response.ok) {
                throw new Error("Erreur serveur lors de la génération du billet");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `${booking.reference}.pdf`;
            a.click();

            window.URL.revokeObjectURL(url);

            onTicketCreated?.();
        } catch (err) {
            console.error("Erreur génération billet", err);
        }
    };

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

    // const handlePassengerChange = (index: number, field: keyof Passenger, value: string, name: string) => {
    //     if (!editedBooking) return;
        

    //     const updatedPassengers = [...editedBooking.passengers];
    //     updatedPassengers[index] = {
    //         ...updatedPassengers[index],
    //         [field]: value,
    //     };


    //     setEditedBooking({
    //         ...editedBooking,
    //         passengers: updatedPassengers,
    //     });
    // };



const handlePassengerChange = (index: number, field: keyof Passenger, value: string, name: string) => {
    if (!editedBooking) return;

    const updatedPassengers = [...editedBooking.passengers];
    
    // Si c'est un NINU et qu'on modifie l'ID, formater la valeur
    let formattedValue = value;
    if (name === "idClient" && updatedPassengers[index]?.idTypeClient === "nimu") {
        formattedValue = formatNimuLicens(value);
    }
    
    updatedPassengers[index] = {
        ...updatedPassengers[index],
        [field]: formattedValue,
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
            idTypeClient: "",
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
            const res = await fetch(`https://steve-airways.onrender.com/api/bookings/${editedBooking.reference}`, {
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
                    currency: booking.currency,
                    typeVol: booking.typeVol,
                    typecharter: booking.typecharter,
                    payment_method: booking.payment_method,
                    flightId: flightIdToUpdate, // Envoyer le nouvel ID de vol si changement
                    returnFlightId: returnFlightIdToUpdate, // Envoyer le nouvel ID de vol retour si changement
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
                    {/* Backdrop avec flou - identique aux autres popups */}
                    <motion.div
                        key={`modal-${booking?.reference || "new"}`}
                        className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-black/70 backdrop-blur-sm"
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
                        className="absolute inset-0 mx-auto my-6 flex items-center justify-center p-4 sm:my-12"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl shadow-slate-900/30 ring-1 ring-white/50">
                            {/* Header avec gradient bleu foncé pour détails */}
                            <div className="relative bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 px-8 pb-6 pt-8">
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
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2
                                                className="text-2xl font-bold text-white"
                                                id="booking-dialog-title"
                                            >
                                                Booking Details
                                            </h2>
                                            <div className="mt-2 flex items-center gap-3">
                                                <div className="rounded-full bg-white/20 px-4 py-1.5">
                                                    <span className="text-sm font-semibold text-white">Reference: {booking.reference}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Boutons d'action */}
                                    <div className="flex items-center gap-2">
                                        {imprimerTicket && (
                                            <button
                                                onClick={() => generateTicketPDF()}
                                                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 font-semibold text-white transition-all hover:from-amber-600 hover:to-amber-500 hover:shadow-lg"
                                            >
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                Download Ticket
                                            </button>
                                        )}

                                        {editBookings && (
                                            <button
                                                onClick={handleEditToggle}
                                                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-500 hover:shadow-lg"
                                            >
                                                {isEditing ? (
                                                    <X className="h-4 w-4" />
                                                ) : (
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                )}
                                                {isEditing ? "Cancel" : "Edit"}
                                            </button>
                                        )}

                                        {/* Bouton fermer identique */}
                                        <button
                                            onClick={onClose}
                                            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 active:scale-95"
                                            aria-label="Close"
                                        >
                                            <X className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
                                            <span className="absolute -inset-1 rounded-full bg-white/10 transition-all group-hover:bg-white/20" />
                                        </button>
                                    </div>
                                </div>

                                {/* Informations du booking */}
                                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/90">
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="h-4 w-4"
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
                                        <span>Contact:</span>
                                        {isEditing ? (
                                            <span>{editedBooking.contactEmail}</span>
                                        ) : (
                                            <a
                                                className="text-white hover:text-amber-300 hover:underline"
                                                href={`mailto:${booking.contactEmail}`}
                                            >
                                                {booking.contactEmail}
                                            </a>
                                        )}
                                    </div>
                                    <div className="h-4 w-px bg-white/30"></div>
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="h-4 w-4"
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
                                        <span>Booked on: {formatDateSafely(booking.bookedOn, "EEE, dd MMM yy")}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contenu principal */}
                            <div className="max-h-[70vh] overflow-auto p-8">
                                {/* Status de paiement */}
                                <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-lg ring-1 ring-slate-200/50">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                        <svg
                                            className="h-5 w-5 text-emerald-500"
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
                                        Payment Status
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm ${
                                                paymentStatus === "confirmed"
                                                    ? "bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                    : paymentStatus === "pending"
                                                      ? "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 ring-1 ring-amber-200"
                                                      : "bg-gradient-to-r from-red-100 to-red-50 text-red-700 ring-1 ring-red-200"
                                            }`}
                                        >
                                            {paymentStatus === "confirmed" ? (
                                                <svg
                                                    className="h-4 w-4"
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
                                            ) : paymentStatus === "pending" ? (
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            )}
                                            {paymentStatus === "confirmed" ? "Paid" : paymentStatus === "pending" ? "Unpaid" : "Cancelled"}
                                        </div>
                                    </div>
                                </div>

                                {/* Informations des vols */}
                                <div className="mb-8">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                        <svg
                                            className="h-5 w-5 text-blue-500"
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
                                        Flight Information
                                    </h3>
                                    <div className="space-y-4">
                                        {editedBooking.flights.map((flight, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-2xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-lg ring-1 ring-slate-200/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-blue-200">
                                                        <svg
                                                            className="h-6 w-6 text-blue-600"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        {isEditing ? (
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <div className="flex flex-col">
                                                                    <label className="mb-2 text-sm font-medium text-slate-700">Flight Number</label>
                                                                    <input
                                                                        value={flight.code}
                                                                        onChange={(e) => handleFlightChange(idx, "code", e.target.value)}
                                                                        placeholder="Flight code"
                                                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                <div>
                                                                    <div className="text-sm text-slate-600">
                                                                        <span className="font-semibold text-slate-700">Route: </span>
                                                                        {flight.from} → {flight.to}
                                                                    </div>
                                                                    <div className="text-sm text-slate-600">
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
                                                                    <div className="text-sm text-slate-600">
                                                                        <span className="font-semibold text-slate-700">Flight Number: </span>
                                                                        <span className="font-bold text-blue-700">{flight.code}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Passagers */}
                                <div className="mb-8">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                                            <svg
                                                className="h-5 w-5 text-purple-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                            </svg>
                                            Passengers ({editedBooking.passengers.length})
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        {editedBooking.passengers.map((passenger, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-2xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-lg ring-1 ring-slate-200/50"
                                            >
                                                <div className="mb-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-purple-200">
                                                            <span className="text-sm font-semibold text-purple-700">
                                                                {passenger.firstName?.charAt(0).toUpperCase() || "P"}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800">Passenger {idx + 1}</h4>
                                                            <p className="text-sm text-slate-600">
                                                                {passenger.name || `${passenger.firstName} ${passenger.lastName}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isEditing && editedBooking.passengers.length > 1 && (
                                                        <button
                                                            onClick={() => handleRemovePassenger(idx)}
                                                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                        >
                                                            <svg
                                                                className="h-4 w-4"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>

                                                {isEditing ? (
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">First Name</label>
                                                            <input
                                                                value={passenger.firstName || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "firstName", e.target.value, "firstName")}
                                                                placeholder="First name"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Middle Name</label>
                                                            <input
                                                                value={passenger.middleName || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "middleName", e.target.value, 'middleName')}
                                                                placeholder="Middle name"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Last Name</label>
                                                            <input
                                                                value={passenger.lastName || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "lastName", e.target.value, "lastName")}
                                                                placeholder="Last name"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Date of Birth</label>
                                                            <input
                                                                type="date"
                                                                value={passenger.dob || passenger.dateOfBirth || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "dob", e.target.value, "dob")}
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                         <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Address</label>
                                                            <input
                                                                type="text"
                                                                value={passenger.address || ""}
                                                                placeholder="Address"
                                                                onChange={(e) => handlePassengerChange(idx, "address", e.target.value, "address")}
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
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
                                                value={passenger.idTypeClient || ""}
                                                onChange={(e) => handlePassengerChange(idx, "idTypeClient", e.target.value, "idTypeClient")}
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
                                                {passenger.idTypeClient === "nimu"
                                                    ? "NINU ID"
                                                    : passenger.idTypeClient === "licens"
                                                      ? "License ID"
                                                      : "Passport Number"}
                                            </label>
                                            <input
                                                type="text"
                                                id="idClient"
                                                name="idClient"
                                                placeholder={
                                                    passenger.idTypeClient === "nimu"
                                                        ? "000-000-000-0"
                                                        : passenger.idTypeClient === "licens"
                                                          ? "License number"
                                                          : "Passport number"
                                                }
                                                value={passenger.idClient}
                                                required
                                                 onChange={(e) => handlePassengerChange(idx, "idClient", e.target.value, "idClient")}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                            />
                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Country</label>
                                                            <input
                                                                type="text"
                                                                value={passenger.country || ""}
                                                                placeholder="Country"
                                                                onChange={(e) => handlePassengerChange(idx, "country", e.target.value, "country")}
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Nationality</label>
                                                            <input
                                                                type="text"
                                                                value={passenger.nationality || ""}
                                                                placeholder="Nationality"
                                                                onChange={(e) => handlePassengerChange(idx, "nationality", e.target.value, "nationality")}
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Email</label>
                                                            <input
                                                                type="email"
                                                                value={passenger.email || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "email", e.target.value, "email",)}
                                                                placeholder="Email"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Phone</label>
                                                            <input
                                                                value={passenger.phone || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "phone", e.target.value, "phone")}
                                                                placeholder="Phone"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Emergency Contact Name</label>
                                                            <input
                                                                value={passenger.nom_urgence || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "nom_urgence", e.target.value, "nom_urgence")}
                                                                placeholder="Emergency contact name"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Emergency Email</label>
                                                            <input
                                                                value={passenger.email_urgence || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "email_urgence", e.target.value, "email_urgence")}
                                                                placeholder="Emergency email"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="mb-2 text-sm font-medium text-slate-700">Emergency Phone</label>
                                                            <input
                                                                value={passenger.tel_urgence || ""}
                                                                onChange={(e) => handlePassengerChange(idx, "tel_urgence", e.target.value, "tel_urgence")}
                                                                placeholder="Emergency phone"
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                        {passenger.email && (
                                                            <div className="text-sm text-slate-600">
                                                                <span className="font-semibold text-slate-700">Email: </span>
                                                                <a
                                                                    href={`mailto:${passenger.email}`}
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    {passenger.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {passenger.dob && (
                                                            <div className="text-sm text-slate-600">
                                                                <span className="font-semibold text-slate-700">Birthday: </span>
                                                                {birth(passenger.dob, "EEE, dd MMM yyyy")}
                                                            </div>
                                                        )}
                                                        {passenger.phone && (
                                                            <div className="text-sm text-slate-600">
                                                                <span className="font-semibold text-slate-700">Phone: </span>
                                                                <a
                                                                    href={`tel:${passenger.phone}`}
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    {passenger.phone}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {passenger.selectedSeat && (
                                                            <div className="text-sm text-slate-600">
                                                                <span className="font-semibold text-slate-700">Seat: </span>
                                                                <span className="font-bold text-amber-600">{passenger.selectedSeat}</span>
                                                            </div>
                                                        )}
                                                        {passenger.nom_urgence && (
                                                            <div className="text-sm text-slate-600">
                                                                <span className="font-semibold text-slate-700">Emergency Contact: </span>
                                                                {passenger.nom_urgence}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Prix total */}
                                <div className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-6">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                        <svg
                                            className="h-5 w-5 text-emerald-600"
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
                                        Total Price
                                    </h3>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-emerald-700">
                                            {calculateTotalPrice(editedBooking.passengers, basePassengerPrice)}
                                        </div>
                                        <div className="mt-2 text-sm text-emerald-600">
                                            {booking?.currency === "htg" || editedBooking.currency === "htg" ? "HTG" : "USD"} •{" "}
                                            {editedBooking.passengers.length} passenger{editedBooking.passengers.length !== 1 ? "s" : ""}
                                        </div>
                                    </div>
                                </div>

                                {/* Contrôles admin */}
                                <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-lg ring-1 ring-slate-200/50">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                        <svg
                                            className="h-5 w-5 text-blue-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        Admin Controls
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Status de paiement */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-slate-700">Payment Status</label>
                                            <div className="relative">
                                                <select
                                                    value={paymentStatus}
                                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
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
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 p-1">
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
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes admin */}
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
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
                                                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                                    />
                                                </svg>
                                                Admin Notes
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    value={editedBooking.adminNotes || ""}
                                                    onChange={(e) => handleGeneralInfoChange("adminNotes", e.target.value)}
                                                    placeholder="Add admin notes..."
                                                    rows={3}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                />
                                            ) : (
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-sm text-slate-700">{booking.adminNotes || "No admin notes"}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Boutons d'action */}
                                <div className="sticky bottom-0 border-t border-slate-200 bg-gradient-to-t from-white to-slate-50 px-8 py-6">
                                    <div className="flex items-center justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                                        >
                                            Close
                                        </button>

                                        {isEditing ? (
                                            <div className="relative">
                                                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 opacity-50 blur-sm" />
                                                <button
                                                    type="button"
                                                    onClick={handleSaveChanges}
                                                    disabled={saving}
                                                    className="relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                            Saving...
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
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                            Save Changes
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            cancelledTicket && (
                                                <div className="relative">
                                                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-50 blur-sm" />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleSavePaymentStatus(paymentStatus as "pending" | "confirmed" | "cancelled")
                                                        }
                                                        className="relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                                                    >
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
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                        Update Status
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

    // <AnimatePresence mode="wait">
    //         {open && (
    //             <div className="fixed inset-0 z-50">
    //                 {/* Backdrop */}
    //                 <motion.div
    //                     key={`modal-${booking?.reference || "new"}`}
    //                     className="absolute inset-0 bg-black/50"
    //                     initial={{ opacity: 0 }}
    //                     animate={{ opacity: 1 }}
    //                     exit={{ opacity: 0 }}
    //                     onClick={onClose}
    //                 />

    //                 {/* Dialog */}
    //                 <motion.div
    //                     role="dialog"
    //                     aria-modal="true"
    //                     aria-labelledby="booking-dialog-title"
    //                     ref={dialogRef}
    //                     className="absolute inset-0 mx-auto my-6 flex max-w-4xl items-start justify-center p-4 sm:my-12"
    //                     initial={{ opacity: 0, y: 20, scale: 0.98 }}
    //                     animate={{ opacity: 1, y: 0, scale: 1 }}
    //                     exit={{ opacity: 0, y: 10, scale: 0.98 }}
    //                 >
    //                     <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
    //                         {/* Header */}
    //                         <div className="sticky top-0 z-10 bg-white px-6 pb-4 pt-6 sm:px-8">
    //                             <div className="flex items-center justify-between">
    //                                 <h2
    //                                     id="booking-dialog-title"
    //                                     className="text-xl font-semibold text-slate-800 sm:text-2xl"
    //                                 >
    //                                     Booking Details: <span className="text-blue-900">{booking.reference}</span>
    //                                 </h2>
    //                                 <div className="flex items-center gap-2">
    //                                     {imprimerTicket && (

    //                                     <button
    //                                     className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-white hover:from-amber-600 hover:to-amber-500 hover:text-black "
    //                                         onClick={() => generateTicketPDF()}
    //                                         >
    //                                         Download the ticket
    //                                     </button>

    //                                     )}
    //                                 </div>
    //                                 <div className="flex items-center gap-2">
    //                                      {editBookings && (
    //                                            <button
    //                                         onClick={handleEditToggle}
    //                                         className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600  px-3 py-2 text-white hover:from-amber-600 hover:to-amber-500 hover:text-black "
    //                                     >
    //                                         {isEditing ? <X size={16} /> : <Edit size={16} />}
    //                                         {isEditing ? "Cancel" : "Edit"}
    //                                     </button>
    //                                         )} 
                                        
    //                                     <button
    //                                         onClick={onClose}
    //                                         className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    //                                         aria-label="Close"
    //                                     >
    //                                         <X className="h-5 w-5" />
    //                                     </button>
    //                                 </div>
    //                             </div>
    //                             <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
    //                                 <Mail className="h-4 w-4" />
    //                                 <span>Contact:</span>
                                    
    //                                 {isEditing ? (
    //                                     <span>{editedBooking.contactEmail}</span>
                                       
    //                                 ) : (
    //                                     <a
    //                                         className="text-blue-900 hover:underline"
    //                                         href={`mailto:${booking.contactEmail}`}
    //                                     >
    //                                         {booking.contactEmail}
    //                                     </a>
    //                                 )}
    //                                 <span className="mx-1">|</span>
    //                                 <Calendar className="h-4 w-4" />
    //                                 <span>Booked on: {formatDateSafely(booking.bookedOn, "EEE, dd MMM yy")}</span>
    //                             </div>
    //                         </div>

    //                         <div className="h-px w-full bg-slate-100" />

    //                         {/* Body */}
    //                         <div className="space-y-6 px-6 py-6 sm:px-8">
    //                             {/* Payment Status */}
    //                             <section className="space-y-2">
    //                                 <h3 className="text-lg font-bold text-amber-500">Payment Status</h3>
    //                                 <div className="flex items-center gap-3">
    //                                     <span
    //                                         className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium ${
    //                                             badgeStyles[paymentStatus] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    //                                         }`}
    //                                     >
    //                                         {paymentStatus === "confirmed" ? "Paid" : paymentStatus === "pending" ? "Unpaid" : "cancelled"}
    //                                     </span>
    //                                 </div>
    //                             </section>

    //                             {/* add Flights important*/}

    //                             <section className="space-y-4">
    //                                 {/* <div className="flex items-center justify-between">
    //                                     <h3 className="text-lg font-bold text-amber-500">Flights</h3>
    //                                     {isEditing && (
    //                                         <button
    //                                             onClick={handleAddFlight}
    //                                             className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
    //                                         >
    //                                             <Plus size={16} /> Add Flight
    //                                         </button>
    //                                     )}
    //                                 </div> */}
    //                                 <ul className="space-y-3">
    //                                     {editedBooking.flights.map((flight, idx) => (
    //                                         <li
    //                                             key={idx}
    //                                             className="flex items-center gap-3 rounded-lg border p-3"
    //                                         >
    //                                             <Plane className="h-4 w-4 flex-shrink-0" />
    //                                             <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
    //                                                 {isEditing ? (
    //                                                     <>
                                                        
    //                                                             <span className="font-semibold text-slate-700">Flight Number: </span>
                                                                
                                                            
    //                                                         <input
    //                                                             value={flight.code}
    //                                                             onChange={(e) => handleFlightChange(idx, "code", e.target.value)}
    //                                                             placeholder="Flight code"
    //                                                             className="rounded border px-2 py-1 text-sm"
    //                                                         />
    //                                                         {/* <input
    //                                                             value={flight.from}
    //                                                             onChange={(e) => handleFlightChange(idx, "from", e.target.value)}
    //                                                             placeholder="From"
    //                                                             className="rounded border px-2 py-1 text-sm"
    //                                                         />
    //                                                         <input
    //                                                             value={flight.to}
    //                                                             onChange={(e) => handleFlightChange(idx, "to", e.target.value)}
    //                                                             placeholder="To"
    //                                                             className="rounded border px-2 py-1 text-sm"
    //                                                         />
    //                                                         <input
    //                                                             type="datetime-local"
    //                                                             value={flight.date}
    //                                                             onChange={(e) => handleFlightChange(idx, "date", e.target.value)}
    //                                                             className="rounded border px-2 py-1 text-sm"
    //                                                         /> */}
    //                                                     </>
    //                                                 ) : (
    //                                                     <div className="text-sm text-slate-600">
    //                                                         <div>
    //                                                             <span className="font-semibold text-slate-700">Depart: </span>
    //                                                             {flight.from} → {flight.to}
    //                                                         </div>
    //                                                         <div>
    //                                                             <span className="font-semibold text-slate-700">Date: </span>
    //                                                             {formatDateSafely(flight.date, "EEE, dd MMM yy")} at{" "}
    //                                                             {(() => {
    //                                                                 try {
    //                                                                     const date = new Date(flight.date);
    //                                                                     return isNaN(date.getTime())
    //                                                                         ? "Invalid time"
    //                                                                         : date.toLocaleTimeString("fr-FR", {
    //                                                                               hour: "2-digit",
    //                                                                               minute: "2-digit",
    //                                                                           });
    //                                                                 } catch (error) {
    //                                                                     return "Invalid time";
    //                                                                 }
    //                                                             })()}
    //                                                         </div>
    //                                                         <div>
    //                                                             <span className="font-semibold text-slate-700">Flight Number:</span> {flight.code}
    //                                                         </div>
    //                                                     </div>
    //                                                 )}
    //                                             </div>
    //                                             {/* {isEditing && editedBooking.flights.length > 1 && (
    //                                                 <button
    //                                                     onClick={() => handleRemoveFlight(idx)}
    //                                                     className="text-red-500 hover:text-red-700"
    //                                                 >
    //                                                     <Trash2 size={16} />
    //                                                 </button>
    //                                             )} */}
    //                                         </li>
    //                                     ))}
    //                                 </ul>
    //                             </section>

    //                             {/* Passengers */}
    //                             <section className="space-y-4">
    //                                 {/* <div className="flex items-center justify-between">
    //                                     <h3 className="text-lg font-bold text-amber-500">Passengers ({editedBooking.passengers.length})</h3>
    //                                     {isEditing && (
    //                                         <button
    //                                             onClick={handleAddPassenger}
    //                                             className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
    //                                         >
    //                                             <Plus size={16} /> Add Passenger
    //                                         </button>
    //                                     )}
    //                                 </div> */}
    //                                 <ul className="space-y-3">
    //                                     {editedBooking.passengers.map((passenger, idx) => (
    //                                         <li
    //                                             key={idx}
    //                                             className="space-y-2 rounded-lg border p-3"
    //                                         >
    //                                             <div className="flex items-start justify-between">
    //                                                 <span className="font-medium text-slate-700">Passenger {idx + 1}</span>
    //                                                 {isEditing && editedBooking.passengers.length > 1 && (
    //                                                     <button
    //                                                         onClick={() => handleRemovePassenger(idx)}
    //                                                         className="text-red-500 hover:text-red-700"
    //                                                     >
    //                                                         <Trash2 size={16} />
    //                                                     </button>
    //                                                 )}
    //                                             </div>
    //                                             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    //                                                 {isEditing ? (
    //                                                     <>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Firstname</label>
    //                                                             <input
    //                                                                 value={passenger.firstName || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "firstName", e.target.value)}
    //                                                                 placeholder="First name"
    //                                                                 className="w-full rounded-md border border-gray-300 px-4 py-1 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Middle Name</label>
    //                                                             <input
    //                                                                 value={passenger.middleName || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "middleName", e.target.value)}
    //                                                                 placeholder="Middle name"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Lastname</label>
    //                                                             <input
    //                                                                 value={passenger.lastName || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "lastName", e.target.value)}
    //                                                                 placeholder="Last name"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Birthday</label>
    //                                                             <input
    //                                                                 type="date"
    //                                                                 value={passenger.dob || passenger.dateOfBirth || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "dob", e.target.value)}
    //                                                                 placeholder="Date of birth"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Address</label>
    //                                                             <input
    //                                                                 value={passenger.address || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "address", e.target.value)}
    //                                                                 placeholder="Address"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Country</label>
    //                                                             <input
    //                                                                 value={passenger.country || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "country", e.target.value)}
    //                                                                 placeholder="Country"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Nationality</label>
    //                                                             <input
    //                                                                 value={passenger.nationality || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "nationality", e.target.value)}
    //                                                                 placeholder="Nationality"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Email Address</label>
    //                                                             <input
    //                                                                 type="email"
    //                                                                 value={passenger.email || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "email", e.target.value)}
    //                                                                 placeholder="Email"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                         <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Phone</label>
    //                                                             <input
    //                                                                 value={passenger.phone || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "phone", e.target.value)}
    //                                                                 placeholder="Phone"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                          <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Emergency contact person name</label>
    //                                                             <input
    //                                                                 value={passenger.nom_urgence || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "nom_urgence", e.target.value)}
    //                                                                 placeholder="Emergency contact person name"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                          <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Email personne en cas urgence</label>
    //                                                             <input
    //                                                                 value={passenger.email_urgence || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "email_urgence", e.target.value)}
    //                                                                 placeholder="Email personne en cas urgence"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                          <div className="flex flex-col">
    //                                                             <label className="mb-1 font-medium text-gray-700">Telephone personne en cas urgence</label>
    //                                                             <input
    //                                                                 value={passenger.tel_urgence || ""}
    //                                                                 onChange={(e) => handlePassengerChange(idx, "tel_urgence", e.target.value)}
    //                                                                 placeholder="Telephone personne en cas urgence"
    //                                                                 className="rounded border px-2 py-1 text-sm"
    //                                                             />
    //                                                         </div>
    //                                                     </>
    //                                                 ) : (
    //                                                     <div className="text-sm text-slate-600">
    //                                                         <div>
    //                                                             <span className="font-semibold text-slate-700">Name: </span>{" "}
    //                                                             {passenger.name || `${passenger.firstName} ${passenger.lastName}`}
    //                                                         </div>
    //                                                         <div>
    //                                                             <span className="font-semibold text-slate-700">Email: </span> {passenger.email}
    //                                                         </div>
    //                                                         <div>
    //                                                             <span className="font-semibold text-slate-700">Birthday: </span>{" "}
    //                                                             {birth(passenger.dob, "EEE, dd MMM yyyy")}
    //                                                         </div>
    //                                                         {passenger.phone && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Phone: </span> {passenger.phone}
    //                                                             </div>
    //                                                         )}
                                                            
    //                                                         {passenger.address && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Address: </span>{" "}
    //                                                                 {passenger.address}
    //                                                             </div>
    //                                                         )}
    //                                                         {passenger.country && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Country: </span>{" "}
    //                                                                 {passenger.country}
    //                                                             </div>
    //                                                         )}
    //                                                         {passenger.nationality && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Nationality: </span>{" "}
    //                                                                 {passenger.nationality}
    //                                                             </div>
    //                                                         )}
    //                                                         {passenger.selectedSeat && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Seat: </span>{" "}
    //                                                                 {passenger.selectedSeat}
    //                                                             </div>
    //                                                         )}
    //                                                         {passenger.nom_urgence && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Emergency contact person name: </span>{" "}
    //                                                                 {passenger.nom_urgence}
    //                                                             </div>
    //                                                         )}
    //                                                         {passenger.email_urgence && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Email person in case of emergency: </span>{" "}
    //                                                                 {passenger.email_urgence}
    //                                                             </div>
    //                                                         )}
    //                                                         {passenger.tel_urgence && (
    //                                                             <div>
    //                                                                 <span className="font-semibold text-slate-700">Emergency contact number: </span>{" "}
    //                                                                 {passenger.tel_urgence}
    //                                                             </div>
    //                                                         )}
    //                                                     </div>
    //                                                 )}
    //                                             </div>
    //                                         </li>
    //                                     ))}
    //                                 </ul>
    //                             </section>

    //                             {/* Total Price */}
    //                             {/* Total Price - Version calcul automatique seulement */}
    //                             <section className="space-y-2">
    //                                 <div className="text-lg font-bold text-amber-500">
    //                                     Total Price: {booking?.currency === 'htg' || editedBooking.currency === 'htg' ? `${calculateTotalPrice(editedBooking.passengers, basePassengerPrice).replace("$", "")}  HTG` : `${calculateTotalPrice(editedBooking.passengers, basePassengerPrice).replace("$", "")}  USD`}
    //                                     {/* <div className="text-sm font-normal text-gray-500">
    //                                         ({editedBooking.passengers.length} passenger(s) × ${basePassengerPrice.toFixed(2)})
    //                                     </div> */}
    //                                 </div>
    //                             </section>

    //                             {/* Admin Controls */}
    //                             <section className="space-y-4">
    //                                 <h3 className="text-lg font-bold text-blue-900">Admin Controls</h3>

    //                                 {/* Payment Status Control */}
    //                                 <div className="grid gap-3 sm:max-w-md">
    //                                     <div className="relative">
    //                                         <select
    //                                             value={paymentStatus}
    //                                             onChange={(e) => setPaymentStatus(e.target.value)}
    //                                             className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
    //                                         >
    //                                             {["pending", "confirmed", "cancelled"].map((s) => (
    //                                                 <option
    //                                                     key={s}
    //                                                     value={s}
    //                                                 >
    //                                                     {s === "confirmed" ? "Paid" : s === "pending" ? "Unpaid" : "Cancelled"}
                                                        
    //                                                 </option>
    //                                             ))}
    //                                         </select>
    //                                     </div>
    //                                 </div>

    //                                 {/* Admin Notes */}
    //                                 <div className="grid gap-3">
    //                                     <label className="text-lg font-bold text-amber-500">Admin Notes</label>
    //                                     {isEditing ? (
    //                                         <textarea
    //                                             value={editedBooking.adminNotes || ""}
    //                                             onChange={(e) => handleGeneralInfoChange("adminNotes", e.target.value)}
    //                                             placeholder="Admin notes..."
    //                                             className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
    //                                             rows={3}
    //                                         />
    //                                     ) : (
    //                                         <div className="rounded bg-slate-50 p-2 text-sm text-slate-600">{booking.adminNotes || "No notes"}</div>
    //                                     )}
    //                                 </div>
    //                             </section>

    //                             {/* Save Buttons */}
    //                             <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
    //                                 <button
    //                                     type="button"
    //                                     onClick={onClose}
    //                                     className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    //                                 >
    //                                     Close
    //                                 </button>

    //                                 {isEditing ? (
    //                                     <button
    //                                         type="button"
    //                                         onClick={handleSaveChanges}
    //                                         disabled={saving}
    //                                         className="flex items-center gap-2 rounded-md bg-gradient-to-r hover:from-green-600 hover:to-green-500 from-green-500 to-green-600 px-4 py-2 text-white  disabled:bg-gray-400"
    //                                     >
    //                                         <Save size={16} />
    //                                         {saving ? "Saving..." : "Save"}
    //                                     </button>
    //                                 ) : (
    //                                     cancelledTicket && (
    //                                     <button
    //                                         type="button"
    //                                         onClick={() => handleSavePaymentStatus(paymentStatus as "pending" | "confirmed" | "cancelled")}
    //                                         className="rounded-md bg-gradient-to-r hover:from-amber-600 hover:to-amber-500 from-amber-500 to-amber-600 hover:text-black px-4 py-2 text-white  focus:outline-none focus:ring-2 focus:ring-amber-500"
    //                                     >
    //                                         Update Status
    //                                     </button>)
    //                                 )}
    //                             </div>
    //                         </div>
    //                     </div>
    //                 </motion.div>
    //             </div>
    //         )}
    //     </AnimatePresence>
    );
};

export default BookingDetailsModal;
