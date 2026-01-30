import { ChevronDown, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, MoreVertical, Pencil, PersonStanding, Ticket, Trash2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";
import { format, toZonedTime } from "date-fns-tz";
import { parse, parseISO } from "date-fns";

import { AnimatePresence, motion } from "framer-motion";
import Passenger from "../../passenger/page";
import BookingCreatedModalCharter from "../../../components/BookingCreatedModalCharter";
import { NoFlightIcon } from "../../../components/icons/AvionTracer";

interface Flight {
    id: number;
    flightId: number;
    flight_number?: string;
    total_seat?: string;
    type: string;

    airline: string;
    from?: string;
    to?: string;
    departure: string;
    arrival: string;
    price: number;
    seats_available: string;
    departure_city?: string;
    arrival_city?: string;
    departure_location_id?: string;
    arrival_location_id?: string;
    arrival_time: string;
    departure_time: string;
    cancelNotes?: string;
    activeflight: string;
}

type Location = {
    id: number;
    name: string;
    code: string;
    city: string;
    country: string;
};

type Notification = {
    message: string;
    type: "success" | "error";
};

export type ListeDetails = {
    id?: string;
};
type ListeDetailsModalProps = {
    data?: ListeDetails;
};

const FlightTableCharter = () => {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showModalPassager, setShowModalPassager] = useState(false);
    const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedDeparture, setSelectedDeparture] = useState("");
    const [selectedCharter, setSelectedCharter] = useState("");
    const [selectedDestination, setSelectedDestination] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [liste, setListe] = useState<undefined>();
    const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [showModalCancel, setShowModalCancel] = useState(false);

    const [cancelFlight, setCancelFlight] = useState<Flight | null>(null);
    const [resCheduleFlight, setRescheduleFlight] = useState<Flight | null>(null);
    const [showModalReschedule, setShowModalReschedule] = useState(false);

    // Champs filtres
    const [flightNumb, setFlightNumb] = useState("");
    const [tailNumber, setTailNumber] = useState("");
    const [dateDeparture, setDateDeparture] = useState("");

    const generateFlightNumber = () => {
        const prefix = "TR";

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const datePart = `${yyyy}${mm}${dd}`;

        const key = `flight_seq_${datePart}`;
        const last = Number(localStorage.getItem(key) || "0") + 1;

        localStorage.setItem(key, String(last));

        const sequence = String(last).padStart(4, "0");

        return `${prefix}-${datePart}-${sequence}`;
    };

    const [flightNumber, setFlightNumber] = useState("");

    const handleGenerate = () => {
        setFlightNumber(generateFlightNumber());
    };

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    const handleDropdownClick = (flightId: number, event: React.MouseEvent) => {
        event.stopPropagation(); // Empêche la propagation du clic

        const button = event.currentTarget as HTMLButtonElement;
        const rect = button.getBoundingClientRect();

        // Calculer la position du menu
        const menuWidth = 192; // Largeur approximative du menu (48 * 4)
        const menuHeight = 180; // Hauteur approximative du menu

        let left = rect.right - menuWidth;
        let top = rect.bottom + 5; // 5px de marge

        // Ajuster si le menu dépasse à droite
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 10;
        }

        // Ajuster si le menu dépasse en bas
        if (top + menuHeight > window.innerHeight) {
            top = rect.top - menuHeight - 5; // Afficher au-dessus
        }

        // Ajuster si le menu dépasse en haut
        if (top < 0) {
            top = 10;
        }

        setDropdownPosition({ top, left });
        setOpenDropdown(openDropdown === flightId ? null : flightId);
    };

    const { user, loading: authLoading, isAdmin, hasPermission, permissions } = useAuth();

    // Vérifier plusieurs permissions
    const canAddNewFlight = isAdmin || hasPermission("addFlights");
    const canEditFlight = isAdmin || hasPermission("editFlights");
    const manifestPdf = isAdmin || hasPermission("manifestPdf");
    const deleteFlights = isAdmin || hasPermission("deleteFlights");

    const listePassagers = isAdmin || hasPermission("listePassagers");
    const createdTicket = isAdmin || hasPermission("createdTicket");

    // 🔹 Pagination
    // const [currentPage, setCurrentPage] = useState(1);
    // const itemsPerPage = 10;
    // const indexOfLastItem = currentPage * itemsPerPage;
    // const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    // const currentFlights = flights.slice(indexOfFirstItem, indexOfLastItem);
    // const totalPages = Math.ceil(flights.length / itemsPerPage);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    // Remplacer la ligne 69 (ou autour) où vous utilisez slice()
    const currentBookings = stats && stats.recentBookings ? stats.recentBookings.slice(indexOfFirstRow, indexOfLastRow) : [];

    // Et pour totalPages
    const totalPages = stats && stats.recentBookings ? Math.ceil(stats.recentBookings.length / rowsPerPage) : 1;

    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
    const [open, setOpen] = useState(false);

    const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const [passengers, setPassengers] = useState<any[]>([]);
    const [loadingPassengers, setLoadingPassengers] = useState(false);

    const fetchPassengers = async (flightId: number) => {
        setLoadingPassengers(true);
        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/flights/${flightId}/passengers`);
            const data = await res.json();
            setPassengers(data);
        } catch (err) {
            console.error("Erreur fetch passagers:", err);
        } finally {
            setLoadingPassengers(false);
        }
    };

    const generatePassengerPDF = async (flightId: number) => {
        if (!flightId) {
            toast.error("Aucun vol sélectionné");
            return;
        }

        try {
            const response = await fetch(`https://steve-airways.onrender.com/api/generate/${flightId}/passengers-list`);
            if (!response.ok) throw new Error("Erreur serveur");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Passenger-List-${flightId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success("PDF téléchargé avec succès");
        } catch (err) {
            console.error("Erreur lors du téléchargement:", err);
            toast.error("Erreur lors du téléchargement du PDF");
        }
    };

    // Fermer le dropdown si clic/touch extérieur de l'élément ouvert
    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (openDropdown === null) return;

            const el = dropdownRefs.current[openDropdown];
            if (!el) {
                setOpenDropdown(null);
                return;
            }

            if (!el.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [openDropdown]);

    // Fetch flights
    const fetchFlights = async () => {
        try {
            setLoading(true);
            const res = await fetch("https://steve-airways.onrender.com/api/flighttablecharter");
            const data = await res.json();
            setStats(data);
        } catch {
            setError("Erreur lors du chargement des vols");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);

            const url = new URL("https://steve-airways.onrender.com/api/flight-charter-search");
            if (flightNumb) url.searchParams.append("flightNumb", flightNumb);
            if (tailNumber) url.searchParams.append("tailNumber", tailNumber);
            if (dateDeparture) url.searchParams.append("dateDeparture", dateDeparture);

            const res = await fetch(url.toString());
            const data = await res.json();

            setStats({ recentBookings: data.bookings });
            setCurrentPage(1);
        } catch (err) {
            alert("Erreur lors de la recherche");
        } finally {
            setLoading(false);
        }
    };

    // API EXPORT EXCEL
    const downloadExcel = () => {
        let url =
            "https://steve-airways.onrender.com/api/flight-charter-export?" +
            `flightNumb=${flightNumb}&tailNumber=${tailNumber}&dateDeparture=${dateDeparture}`;

        window.open(url, "_blank");
    };

    const refreshFlights = () => {
        fetchFlights();
    };
    useEffect(() => {
        fetchFlights();
    }, []);

    // Charger les locations au montage
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoadingLocations(true);
                const res = await fetch("https://steve-airways.onrender.com/api/locations");
                const data = await res.json();
                setLocations(data);
            } catch (err) {
                console.error("Erreur lors du chargement des locations:", err);
            } finally {
                setLoadingLocations(false);
            }
        };

        fetchLocations();
    }, []);

    // Fonction pour extraire le code d'aéroport depuis la string (ex: "Port-au-Prince (PAP)" -> "PAP")
    const extractAirportCode = (locationString: string): string => {
        if (!locationString) return "";
        const match = locationString.match(/\(([^)]+)\)/);
        return match ? match[1] : locationString;
    };

    // Fonction pour trouver l'ID de location par code
    const findLocationIdByCode = (code: string): string => {
        if (!code) return "";
        const location = locations.find((loc) => loc.code === code);
        return location ? location.id.toString() : "";
    };

    // MySQL DATETIME -> format input datetime-local
    const formatDateForInput = (dateInput?: string | Date) => {
        if (!dateInput) return "";

        let d: Date;
        if (typeof dateInput === "string") {
            d = parse(dateInput, "yyyy-MM-dd HH:mm:ss", new Date());
        } else {
            d = dateInput;
        }

        const zonedDate = toZonedTime(d, "America/Port-au-Prince");

        const year = zonedDate.getFullYear();
        const month = String(zonedDate.getMonth() + 1).padStart(2, "0");
        const day = String(zonedDate.getDate()).padStart(2, "0");
        const hours = String(zonedDate.getHours()).padStart(2, "0");
        const minutes = String(zonedDate.getMinutes()).padStart(2, "0");

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const toggleDropdown = (index: number) => {
        setOpenDropdown(openDropdown === index ? null : index);
    };

    const showNotification = (message: string, type: "success" | "error") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleEditClick = (flight: Flight) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        console.log("Flight à éditer:", flight);

        const departureCode = extractAirportCode(flight.from || "");
        const destinationCode = extractAirportCode(flight.to || "");
        const departureId = findLocationIdByCode(departureCode);
        const destinationId = findLocationIdByCode(destinationCode);

        console.log("Départ code:", departureCode, "ID:", departureId);
        console.log("Destination code:", destinationCode, "ID:", destinationId);

        setEditingFlight(flight);
        setSelectedDeparture(departureId);
        setSelectedDestination(destinationId);
        setSelectedCharter(flight.typecharter);
        setShowModal(true);
    };

    const handleCancelClick = (flight: Flight) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        console.log("Flight à éditer:", flight);

        // Extraire les codes d'aéroport depuis les champs from/to
        const departureCode = extractAirportCode(flight.from || "");
        const destinationCode = extractAirportCode(flight.to || "");

        // Convertir les codes en IDs
        const departureId = findLocationIdByCode(departureCode);
        const destinationId = findLocationIdByCode(destinationCode);

        console.log("Départ code:", departureCode, "ID:", departureId);
        console.log("Destination code:", destinationCode, "ID:", destinationId);

        setCancelFlight(flight);
        setSelectedDeparture(departureId);
        setSelectedDestination(destinationId);
        setShowModalCancel(true);
    };

    const handleInfoCancel = (field: keyof Flight, value: string) => {
        if (!cancelFlight) return;
        setCancelFlight({
            ...cancelFlight,
            [field]: value,
        });
    };
    const handleCancelFlight = async () => {
        if (!cancelFlight) return;
        setLoadingPassengers(true);

        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/cancelFlight/${cancelFlight.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cancelNotes: cancelFlight.cancelNotes,
                    flightNumber: cancelFlight.flight_number,
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${res.status}`);
            }

            console.log("✅ Flight cancelled successfully:", responseData);

            // Update your local state to reflect the cancellation
            // Example:
            // setFlights(prevFlights =>
            //   prevFlights.map(flight =>
            //     flight.id === cancelFlight.id
            //       ? { ...flight, activeflight: 'desactive' }
            //       : flight
            //   )
            // );

            alert("Flight successfully cancelled!");

            // Close modal or redirect if needed
            setCancelFlight(null);
            setShowModalCancel(false);
        } catch (err: any) {
            console.error("❌ Failed to cancel flight", err);
            alert(err.message || "Impossible d'annuler le vol. Veuillez réessayer.");
        } finally {
            setLoadingPassengers(false);
        }
    };

    const handleRescheduleClick = (flight: Flight) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        console.log("Flight à éditer:", flight);

        // Extraire les codes d'aéroport depuis les champs from/to
        const departureCode = extractAirportCode(flight.from || "");
        const destinationCode = extractAirportCode(flight.to || "");

        // Convertir les codes en IDs
        const departureId = findLocationIdByCode(departureCode);
        const destinationId = findLocationIdByCode(destinationCode);

        console.log("Départ code:", departureCode, "ID:", departureId);
        console.log("Destination code:", destinationCode, "ID:", destinationId);

        setRescheduleFlight(flight);
        setSelectedDeparture(departureId);
        setSelectedDestination(destinationId);
        setShowModalReschedule(true);
    };

    const handleInfoReschedule = (field: keyof Flight, value: string) => {
        if (!resCheduleFlight) return;
        setRescheduleFlight({
            ...resCheduleFlight,
            [field]: value,
        });
    };

    const handleUpdateRescheduleFlight = async (flightId: number, flightDataReschedule: any) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch(`https://steve-airways.onrender.com/api/updaterescheduleflight/${flightId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(flightDataReschedule),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Erreur ${res.status}: ${errorText}`);
            }

            const data = await res.json();

            // Rafraîchir les données après modification
            await fetchFlights();

            setRescheduleFlight(null);
            setShowModalReschedule(false);

            toast.success(`Reschedule update successful`, {
                style: {
                    background: "#28a745",
                    color: "#fff",
                    border: "1px solid #1e7e34",
                },
                iconTheme: { primary: "#fff", secondary: "#1e7e34" },
            });
        } catch (err: any) {
            console.error("❌ Erreur complète:", err);
            showNotification(err.message || "Erreur inconnue lors de la modification", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddFlight = async (flightData: any) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch("https://steve-airways.onrender.com/api/addflighttable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(flightData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erreur ajout vol");
            }

            await fetchFlights();
            setShowModal(false);

            toast.success(`Vol ajouté avec succès`, {
                style: {
                    background: "#28a745",
                    color: "#fff",
                    border: "1px solid #1e7e34",
                },
                iconTheme: { primary: "#fff", secondary: "#1e7e34" },
            });
        } catch (err: any) {
            showNotification(err.message || "Erreur inconnue", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateFlight = async (flightId: number, updatedData: any) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`https://steve-airways.onrender.com/api/updateflight/${flightId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedData),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Erreur ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            await fetchFlights();
            setEditingFlight(null);
            setShowModal(false);

            toast.success(`Vol modifié avec succès`, {
                style: {
                    background: "#28a745",
                    color: "#fff",
                    border: "1px solid #1e7e34",
                },
                iconTheme: { primary: "#fff", secondary: "#1e7e34" },
            });
        } catch (err: any) {
            console.error("❌ Erreur complète:", err);
            showNotification(err.message || "Erreur inconnue lors de la modification", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const deleteFlight = async (flightId: number) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/deleteflights/${flightId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur suppression");
            setFlights((prev) => prev.filter((f) => f.id !== flightId));
            await fetchFlights();

            toast.success(`Vol supprimé`, {
                style: {
                    background: "#28a745",
                    color: "#fff",
                    border: "1px solid #1e7e34",
                },
                iconTheme: { primary: "#fff", secondary: "#1e7e34" },
            });
        } catch (err: any) {
            showNotification(err.message || "Erreur inconnue", "error");
        }
    };

    const timeZone = "America/Port-au-Prince";

    const formatDateForDisplay = (dateInput?: string | Date) => {
        if (!dateInput) return "—";

        try {
            let d: Date;
            if (typeof dateInput === "string") {
                d = parse(dateInput, "yyyy-MM-dd HH:mm:ss", new Date());
            } else {
                d = dateInput;
            }

            const zonedDate = toZonedTime(d, timeZone);
            return format(zonedDate, "dd/MM/yyyy HH:mm");
        } catch (err) {
            console.error("Erreur conversion date:", err, dateInput);
            return "—";
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {notification && (
                <div
                    className={`fixed right-4 top-4 z-50 table-cell rounded text-center text-white ${
                        notification.type === "success" ? "bg-green-500" : "bg-red-500"
                    }`}
                >
                    {notification.message}
                </div>
            )}

            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold">All Flight Charter</h1>

                {/* Bouton Add new flight seulement pour les admins */}
                {canAddNewFlight && (
                    <button
                        onClick={() => {
                            setEditingFlight(null);
                            setSelectedDeparture("");
                            setSelectedCharter("");
                            setSelectedDestination("");
                            setShowModal(true);
                            handleGenerate();
                        }}
                        className="rounded bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-white hover:from-amber-600 hover:to-amber-500 hover:text-black"
                    >
                        Add new flight
                    </button>
                )}
            </div>

            {/* Filtres */}

            <div className="mb-9 mt-16 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Flight number</label>
                    <input
                        type="text"
                        placeholder="Flight number"
                        onChange={(e) => setFlightNumb(e.target.value)}
                        className="rounded border px-4 py-2 text-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Tail Number</label>
                    <input
                        type="text"
                        onChange={(e) => setTailNumber(e.target.value)}
                        placeholder="Tail Number"
                        className="rounded border px-4 py-2 text-sm"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Date</label>
                    <input
                        type="date"
                        onChange={(e) => setDateDeparture(e.target.value)}
                        className="rounded border px-4 py-2 text-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-7 font-medium text-gray-700"></label>
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-4 pb-1 pt-2 text-white hover:from-amber-600 hover:to-amber-500 hover:text-black"
                    >
                        Search Flights
                    </button>
                </div>
                {manifestPdf && (
                    <button
                        type="button"
                        onClick={downloadExcel}
                        className="w-24 rounded-md border-2 border-slate-50 bg-slate-200 px-4 py-2 text-slate-700 hover:bg-amber-600 hover:text-slate-50"
                    >
                        PDF
                    </button>
                )}
            </div>

            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
                </div>
            )}

            <div className="card overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <div className="card-body p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="table min-w-full">
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <span>Flight number</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            <span>Flight type</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                                                />
                                            </svg>
                                            <span>Tail Number</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
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
                                            <span>Departure</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>Destination</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>Departure time</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>Arrival time</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>Price</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                            <span>Seats</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                                />
                                            </svg>
                                            <span>Action</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {currentBookings.map((flight) => (
                                    <tr
                                        key={flight.id}
                                        className={`border-b hover:bg-gray-50 ${flight.activeflight === "desactive" ? "text-red-500" : ""}`}
                                    >
                                        <td className="table-cell text-center">{flight.flight_number}</td>
                                        <td className="table-cell text-center">{flight.typecharter === "plane" ? "Avion" : "Hélicoptère"}</td>
                                        <td className="table-cell text-center">{flight.airline}</td>
                                        <td className="table-cell text-center">{flight.from}</td>
                                        <td className="table-cell text-center">{flight.to}</td>
                                        <td className="table-cell text-center">{formatDateForDisplay(flight.departure)}</td>
                                        <td className="table-cell text-center">{formatDateForDisplay(flight.arrival)}</td>
                                        <td className="table-cell text-center">${flight.price}</td>
                                        <td className="table-cell text-center">{flight.seats_available}</td>
                                        <td className="relative table-cell px-4 py-2 text-center">
                                            <div
                                                className="relative text-left"
                                                ref={(el) => {
                                                    dropdownRefs.current[flight.id] = el;
                                                }}
                                            >
                                                <button
                                                    className="inline-flex w-full justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 p-2 px-4 py-2 hover:from-amber-600 hover:to-amber-500"
                                                    onClick={(e) => handleDropdownClick(flight.id, e)}
                                                >
                                                    <MoreVertical className="h-5 w-5 text-white hover:text-black" />
                                                </button>

                                                {openDropdown === flight.id && (
                                                    <div
                                                        className="fixed z-[9999] w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
                                                        style={{
                                                            top: `${dropdownPosition.top}px`,
                                                            left: `${dropdownPosition.left}px`,
                                                            position: "fixed", // Assurez-vous que c'est fixed
                                                        }}
                                                    >
                                                        <div className="py-1">
                                                            {canEditFlight && (
                                                                <>
                                                                    <button
                                                                        className="flex w-full gap-2 px-4 py-2 text-left text-amber-500 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            handleEditClick(flight);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-5 w-5 text-amber-500" /> Edit
                                                                    </button>
                                                                </>
                                                            )}

                                                            <button
                                                                className="flex w-full gap-2 px-4 py-2 text-left text-sky-700 hover:bg-gray-100"
                                                                onClick={() => {
                                                                    handleRescheduleClick(flight);

                                                                    setOpenDropdown(null);
                                                                }}
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="20"
                                                                    height="20"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    stroke-width="2"
                                                                    stroke-linecap="round"
                                                                    stroke-linejoin="round"
                                                                    class="lucide lucide-clipboard-clock-icon lucide-clipboard-clock"
                                                                >
                                                                    <path d="M16 14v2.2l1.6 1" />
                                                                    <path d="M16 4h2a2 2 0 0 1 2 2v.832" />
                                                                    <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2" />
                                                                    <circle
                                                                        cx="16"
                                                                        cy="16"
                                                                        r="6"
                                                                    />
                                                                    <rect
                                                                        x="8"
                                                                        y="2"
                                                                        width="8"
                                                                        height="4"
                                                                        rx="1"
                                                                    />
                                                                </svg>
                                                                Reschedule
                                                            </button>

                                                            {createdTicket && (
                                                                <>
                                                                    <button
                                                                        className="flex w-full gap-2 px-4 py-2 text-left text-green-500 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            setSelectedFlight(flight);
                                                                            setOpen(true);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <Ticket className="h-5 w-5 text-green-500" /> Create Ticket
                                                                    </button>
                                                                </>
                                                            )}
                                                            {listePassagers && (
                                                                <>
                                                                    <button
                                                                        className="flex w-full gap-2 px-4 py-2 text-left text-lime-600 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            fetchPassengers(flight.id);
                                                                            setSelectedFlightId(flight.id);
                                                                            setShowModalPassager(true);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <PersonStanding className="h-7 w-7 text-lime-600" /> Passengers
                                                                    </button>
                                                                </>
                                                            )}

                                                            <button
                                                                className="flex w-full gap-2 px-4 py-2 text-left text-blue-900 hover:bg-gray-100"
                                                                onClick={() => {
                                                                    handleCancelClick(flight);

                                                                    setOpenDropdown(null);
                                                                }}
                                                            >
                                                                <NoFlightIcon /> Cancel the Flight
                                                            </button>

                                                            {deleteFlights && (
                                                                <>
                                                                    <button
                                                                        className="flex w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            deleteFlight(flight.id);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-5 w-5 text-red-500" /> Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* PAGINATION */}
                    {currentBookings.length > 0 && (
                        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronLeftIcon className="h-4 w-4" />
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                                                        currentPage === pageNum
                                                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                                                            : "text-gray-600 hover:bg-gray-100"
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <BookingCreatedModalCharter
                open={open}
                onClose={() => setOpen(false)}
                flight={selectedFlight!}
                onTicketCreated={refreshFlights}
            />

            {/* Modal Add/Edit - Seulement accessible aux admins */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50">
                        {/* Backdrop avec flou - identique aux autres popups */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-black/70 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowModal(false);
                                setEditingFlight(null);
                                setSelectedDeparture("");
                                setSelectedCharter("");
                                setSelectedDestination("");
                            }}
                        />

                        {/* Contenu du modal */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="absolute inset-0 mx-auto my-6 flex items-center justify-center p-4 sm:my-12"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl shadow-slate-900/30 ring-1 ring-white/50">
                                {/* En-tête avec gradient émeraude pour charter */}
                                <div className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-8 pb-6 pt-8">
                                    <div className="absolute -bottom-1 left-0 right-0 h-4 bg-gradient-to-t from-white/20 to-transparent" />

                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                                {editingFlight ? (
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
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                ) : (
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
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">
                                                    {editingFlight ? "Update Charter Flight" : "Create Charter Flight"}
                                                </h2>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="rounded-full bg-white/20 px-3 py-1">
                                                        <span className="text-sm font-semibold text-white">
                                                            {editingFlight ? "Edit Mode" : "New Charter"}
                                                        </span>
                                                    </div>
                                                    {editingFlight && (
                                                        <span className="text-sm text-white/90">• Flight {editingFlight.flight_number}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bouton fermer identique */}
                                        <button
                                            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 active:scale-95"
                                            aria-label="Close"
                                            onClick={() => {
                                                setShowModal(false);
                                                setEditingFlight(null);
                                                setSelectedDeparture("");
                                                setSelectedCharter("");
                                                setSelectedDestination("");
                                            }}
                                        >
                                            <X className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
                                            <span className="absolute -inset-1 rounded-full bg-white/10 transition-all group-hover:bg-white/20" />
                                        </button>
                                    </div>
                                </div>

                                {/* Formulaire */}
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setSubmitting(true);
                                        const formData = new FormData(e.currentTarget);

                                        const flightData = {
                                            flight_number: formData.get("flight_number") as string,
                                            typecharter: formData.get("typecharter") as string,
                                            charter: formData.get("charter") as string,
                                            airline: formData.get("airline") as string,
                                            departure_location_id: selectedDeparture,
                                            arrival_location_id: selectedDestination,
                                            departure_time: formData.get("departure_time") as string,
                                            arrival_time: formData.get("arrival_time") as string,
                                            price: Number(formData.get("price")),
                                            seats_available: Number(formData.get("seats_available")),
                                        };

                                        console.log("Données à envoyer:", flightData);

                                        try {
                                            if (editingFlight) {
                                                await handleUpdateFlight(editingFlight.id, flightData);
                                            } else {
                                                await handleAddFlight(flightData);
                                            }
                                        } catch (err) {
                                            console.error("Erreur dans le formulaire:", err);
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                    className="max-h-[70vh] overflow-auto p-8"
                                >
                                    {/* Section type de charter */}
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
                                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                />
                                            </svg>
                                            Charter Information
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Type de charter */}
                                            <div className="group">
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
                                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                                        />
                                                    </svg>
                                                    Charter Type
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedCharter}
                                                        name="typecharter"
                                                        onChange={(e) => setSelectedCharter(e.target.value)}
                                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
                                                    >
                                                        <option value="plane">✈️ Plane Charter</option>
                                                        <option value="helicopter">🚁 Helicopter Charter</option>
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
                                                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    name="charter"
                                                    placeholder="Numéro de vol"
                                                    className="hidden"
                                                    value="charter"
                                                    required
                                                />
                                            </div>

                                            {/* Numéro de vol */}
                                            <div className="group">
                                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                    <svg
                                                        className="h-4 w-4 text-violet-500"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                                        />
                                                    </svg>
                                                    Flight Number
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="flight_number"
                                                        placeholder="e.g., TA1234"
                                                        defaultValue={editingFlight?.flight_number || flightNumber}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-violet-400 to-violet-500 p-1">
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
                                                                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section informations de vol */}
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
                                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                />
                                            </svg>
                                            Flight Details
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Numéro de queue */}
                                            <div className="group">
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
                                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                        />
                                                    </svg>
                                                    Tail Number / Registration
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="airline"
                                                        placeholder="e.g., N123AB"
                                                        defaultValue={editingFlight?.airline || ""}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
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
                                                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nombre de sièges */}
                                            <div className="group">
                                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                    <svg
                                                        className="h-4 w-4 text-purple-500"
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
                                                    Number of Seats
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="seats_available"
                                                        placeholder="e.g., 8"
                                                        defaultValue={editingFlight?.seats_available}
                                                        min="1"
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 p-1">
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
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section itinéraire */}
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
                                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                                />
                                            </svg>
                                            Route Information
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Départ */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                                    <span className="inline-flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                                        Departure Airport
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <div className="flex w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30">
                                                        <MapPinIcon className="absolute left-4 h-5 w-5 text-red-500" />
                                                        <select
                                                            value={selectedDeparture}
                                                            onChange={(e) => setSelectedDeparture(e.target.value)}
                                                            className="w-full bg-transparent outline-none disabled:text-slate-400"
                                                            required
                                                            disabled={loadingLocations}
                                                        >
                                                            <option
                                                                value=""
                                                                disabled
                                                            >
                                                                Select departure airport
                                                            </option>
                                                            {!loadingLocations &&
                                                                locations
                                                                    .filter((loc) => String(loc.id) !== selectedDestination)
                                                                    .map((loc) => (
                                                                        <option
                                                                            key={loc.id}
                                                                            value={loc.id}
                                                                        >
                                                                            {loc.city} ({loc.code}) - {loc.country}
                                                                        </option>
                                                                    ))}
                                                        </select>
                                                        {loadingLocations && (
                                                            <div className="absolute right-3">
                                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Destination */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                                    <span className="inline-flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                                        Destination Airport
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <div className="flex w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30">
                                                        <MapPinIcon className="absolute left-4 h-5 w-5 text-green-500" />
                                                        <select
                                                            value={selectedDestination}
                                                            onChange={(e) => setSelectedDestination(e.target.value)}
                                                            className="w-full bg-transparent outline-none disabled:text-slate-400"
                                                            required
                                                            disabled={loadingLocations}
                                                        >
                                                            <option
                                                                value=""
                                                                disabled
                                                            >
                                                                Select destination airport
                                                            </option>
                                                            {!loadingLocations &&
                                                                locations
                                                                    .filter((loc) => String(loc.id) !== selectedDeparture)
                                                                    .map((loc) => (
                                                                        <option
                                                                            key={loc.id}
                                                                            value={loc.id}
                                                                        >
                                                                            {loc.city} ({loc.code}) - {loc.country}
                                                                        </option>
                                                                    ))}
                                                        </select>
                                                        {loadingLocations && (
                                                            <div className="absolute right-3">
                                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section horaires et tarification */}
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
                                            Schedule & Pricing
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Date de départ */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Departure Date & Time</label>
                                                <div className="relative">
                                                    <input
                                                        type="datetime-local"
                                                        name="departure_time"
                                                        defaultValue={formatDateForInput(editingFlight?.departure || "")}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
                                                    />
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
                                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Date d'arrivée */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Arrival Date & Time</label>
                                                <div className="relative">
                                                    <input
                                                        type="datetime-local"
                                                        name="arrival_time"
                                                        defaultValue={formatDateForInput(editingFlight?.arrival || "")}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
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
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Prix */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Charter Price</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="price"
                                                        placeholder="Price ($)"
                                                        defaultValue={editingFlight?.price}
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                        required
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
                                                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bouton de soumission */}
                                    <div className="pt-6">
                                        <div className="relative">
                                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 opacity-50 blur-sm" />
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="relative w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                <span className="flex items-center justify-center gap-3">
                                                    {submitting ? (
                                                        <>
                                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                            {editingFlight ? "Updating Charter..." : "Creating Charter..."}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {editingFlight ? (
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
                                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                    />
                                                                </svg>
                                                            ) : (
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
                                                                        d="M12 4v16m8-8H4"
                                                                    />
                                                                </svg>
                                                            )}
                                                            {editingFlight ? "Update Charter Flight" : "Create Charter Flight"}
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Note informative */}
                                        <div className="mt-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <svg
                                                    className="mt-0.5 h-5 w-5 text-emerald-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                <div>
                                                    <p className="text-sm text-emerald-700">
                                                        <span className="font-semibold">Note:</span> Charter flights are private bookings. All times
                                                        are in local timezone. The arrival time must be after the departure time. Seat availability is
                                                        for the entire charter capacity.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal list passager - Seulement accessible aux admins */}

            <AnimatePresence>
                {showModalPassager && (
                    <div className="fixed inset-0 z-50">
                        {/* Backdrop avec flou - identique aux autres popups */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-black/70 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModalPassager(false)}
                        />

                        {/* Contenu du modal - plus large pour la table */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="absolute inset-0 mx-auto my-6 flex items-center justify-center p-4 sm:my-12"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl shadow-slate-900/30 ring-1 ring-white/50">
                                {/* En-tête avec gradient bleu pour passagers */}
                                <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 pb-6 pt-8">
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
                                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">Passenger List</h2>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <div className="rounded-full bg-white/20 px-4 py-1.5">
                                                        <span className="text-sm font-semibold text-white">
                                                            {passengers.length} Passenger{passengers.length !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                    {selectedFlightId && <span className="text-sm text-white/90">• Flight #{selectedFlightId}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bouton fermer identique */}
                                        <button
                                            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 active:scale-95"
                                            aria-label="Close"
                                            onClick={() => setShowModalPassager(false)}
                                        >
                                            <X className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
                                            <span className="absolute -inset-1 rounded-full bg-white/10 transition-all group-hover:bg-white/20" />
                                        </button>
                                    </div>
                                </div>

                                {/* Contenu principal avec scroll */}
                                <div className="max-h-[70vh] overflow-hidden">
                                    {loadingPassengers ? (
                                        <div className="flex h-64 items-center justify-center">
                                            <div className="text-center">
                                                <div className="relative mx-auto mb-4">
                                                    <div className="h-16 w-16 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-500"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <svg
                                                            className="h-6 w-6 text-blue-500"
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
                                                    </div>
                                                </div>
                                                <p className="text-lg font-medium text-slate-700">Loading passenger data...</p>
                                                <p className="mt-1 text-sm text-slate-500">Please wait while we fetch the information</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {/* Table des passagers */}
                                            <div className="overflow-auto">
                                                <table className="w-full">
                                                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-white shadow-sm">
                                                        <tr>
                                                            <th className="px-8 py-4 text-left">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                                                                        First Name
                                                                    </span>
                                                                </div>
                                                            </th>
                                                            <th className="px-8 py-4 text-left">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                                                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                                                                        Last Name
                                                                    </span>
                                                                </div>
                                                            </th>
                                                            <th className="px-8 py-4 text-left">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                                                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                                                                        Email Address
                                                                    </span>
                                                                </div>
                                                            </th>
                                                            <th className="px-8 py-4 text-left">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                                                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                                                                        Phone
                                                                    </span>
                                                                </div>
                                                            </th>
                                                            <th className="px-8 py-4 text-left">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                                                                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                                                                        Booking Date
                                                                    </span>
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {passengers.length > 0 ? (
                                                            passengers.map((p, index) => (
                                                                <tr
                                                                    key={p.id}
                                                                    className="group transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                                                                >
                                                                    <td className="px-8 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-semibold text-blue-700">
                                                                                {p.first_name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <span className="font-medium text-slate-800">{p.first_name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-4">
                                                                        <span className="font-medium text-slate-800">{p.last_name}</span>
                                                                    </td>
                                                                    <td className="px-8 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <svg
                                                                                className="h-4 w-4 text-slate-400"
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
                                                                            <span className="text-slate-700">{p.email}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <svg
                                                                                className="h-4 w-4 text-slate-400"
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
                                                                            <span
                                                                                className={
                                                                                    p.phone ? "font-medium text-slate-800" : "italic text-slate-400"
                                                                                }
                                                                            >
                                                                                {p.phone || "Not provided"}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-1.5">
                                                                                <span className="text-sm font-medium text-purple-700">
                                                                                    {format(parseISO(p.booking_date), "EEE, dd MMM yyyy")}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td
                                                                    colSpan={5}
                                                                    className="px-8 py-16 text-center"
                                                                >
                                                                    <div className="mx-auto max-w-md">
                                                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-slate-100 to-slate-200">
                                                                            <svg
                                                                                className="h-8 w-8 text-slate-400"
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
                                                                        </div>
                                                                        <h3 className="mb-2 text-lg font-semibold text-slate-700">
                                                                            No passengers found
                                                                        </h3>
                                                                        <p className="text-slate-500">
                                                                            There are no passengers booked for this flight yet.
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Bouton de téléchargement */}
                                            <div className="sticky bottom-0 border-t border-slate-200 bg-gradient-to-t from-white to-slate-50 px-8 py-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2">
                                                            <div className="flex items-center gap-2">
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
                                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                    />
                                                                </svg>
                                                                <span className="text-sm font-medium text-slate-700">
                                                                    {passengers.length} passenger{passengers.length !== 1 ? "s" : ""} total
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {passengers.length > 0 && (
                                                            <div className="text-sm text-slate-500">
                                                                Last booking:{" "}
                                                                {passengers.length > 0
                                                                    ? format(parseISO(passengers[0].booking_date), "dd MMM yyyy")
                                                                    : "N/A"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="relative">
                                                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50 blur-sm" />
                                                        <button
                                                            onClick={() => {
                                                                if (selectedFlightId) {
                                                                    generatePassengerPDF(selectedFlightId);
                                                                } else {
                                                                    toast.error("Please select a flight first");
                                                                }
                                                            }}
                                                            disabled={!selectedFlightId || passengers.length === 0}
                                                            className="relative flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
                                                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                />
                                                            </svg>
                                                            Download Passenger List (PDF)
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Note informative */}
                                                {passengers.length > 0 && (
                                                    <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                                                        <div className="flex items-start gap-3">
                                                            <svg
                                                                className="mt-0.5 h-5 w-5 text-blue-500"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            <div>
                                                                <p className="text-sm text-blue-700">
                                                                    <span className="font-semibold">Note:</span> The PDF will include all passenger
                                                                    details with booking information.
                                                                    {passengers.some((p) => !p.phone) &&
                                                                        " Some passengers may not have provided phone numbers."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* cancel Flight */}

            <AnimatePresence>
                {showModalCancel && (
                    <div className="fixed inset-0 z-50">
                        {/* Backdrop avec flou - identique au premier popup */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-black/70 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModalCancel(false)}
                        />

                        {/* Contenu du modal */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="absolute inset-0 mx-auto my-6 flex items-center justify-center p-4 sm:my-12"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl shadow-slate-900/30 ring-1 ring-white/50">
                                {/* En-tête avec gradient rouge pour annulation */}
                                <div className="relative bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 px-8 pb-6 pt-8">
                                    <div className="absolute -bottom-1 left-0 right-0 h-4 bg-gradient-to-t from-white/20 to-transparent" />

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                                    <svg
                                                        className="h-6 w-6 text-white"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                                        />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-bold text-white">Cancel Flight</h2>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="rounded-full bg-white/20 px-3 py-1">
                                                            <span className="text-sm font-semibold text-white">{cancelFlight?.flight_number}</span>
                                                        </div>
                                                        <span className="text-sm text-white/90">• Irreversible action</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bouton fermer identique */}
                                        <button
                                            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 active:scale-95"
                                            aria-label="Close"
                                            onClick={() => setShowModalCancel(false)}
                                        >
                                            <X className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
                                            <span className="absolute -inset-1 rounded-full bg-white/10 transition-all group-hover:bg-white/20" />
                                        </button>
                                    </div>
                                </div>

                                {/* Contenu principal */}
                                <div className="max-h-[70vh] overflow-auto p-8">
                                    {/* Avertissement important */}
                                    <div className="mb-6 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-rose-50 p-5">
                                        <div className="flex gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-rose-500">
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
                                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-red-700">Important Notice</h3>
                                                <p className="mt-1 text-sm text-red-600">
                                                    This action cannot be undone. All passengers will be notified and refunds will be processed
                                                    according to our cancellation policy.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Informations sur le vol */}
                                    <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-lg ring-1 ring-slate-200/50">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Route</p>
                                                <p className="text-lg font-bold text-slate-800">
                                                    {cancelFlight?.from} → {cancelFlight?.to}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Scheduled Departure</p>
                                                <p className="text-lg font-semibold text-slate-800">
                                                    {cancelFlight?.departure ? new Date(cancelFlight.departure).toLocaleString() : "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formulaire de raison */}
                                    <div className="mb-6">
                                        <div className="mb-4">
                                            <label className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400">
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
                                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                                        />
                                                    </svg>
                                                </div>
                                                Reason for cancellation
                                            </label>
                                            <p className="mb-4 text-sm text-slate-600">
                                                Please provide a detailed explanation for the cancellation. This information will be shared with
                                                affected passengers.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <textarea
                                                value={cancelFlight?.cancelNotes || ""}
                                                onChange={(e) => handleInfoCancel("cancelNotes", e.target.value)}
                                                placeholder="Describe the reason for cancellation in detail (weather conditions, technical issues, operational constraints, etc.)..."
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 pl-12 text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                                                rows={6}
                                            />
                                            <div className="absolute left-4 top-4">
                                                <div className="h-6 w-6 text-slate-400">
                                                    <svg
                                                        className="h-6 w-6"
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
                                                </div>
                                            </div>

                                            {/* Compteur de caractères */}
                                            <div className="mt-2 flex justify-end">
                                                <span
                                                    className={`text-sm ${(cancelFlight?.cancelNotes || "").length > 500 ? "text-red-500" : "text-slate-500"}`}
                                                >
                                                    {(cancelFlight?.cancelNotes || "").length}/500 characters
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bouton d'action */}
                                    <div className="pt-6">
                                        <div className="relative">
                                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 opacity-50 blur-sm" />
                                            <button
                                                onClick={handleCancelFlight}
                                                disabled={loadingPassengers || !cancelFlight?.cancelNotes?.trim()}
                                                className="relative w-full rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                <span className="flex items-center justify-center gap-3">
                                                    {loadingPassengers ? (
                                                        <>
                                                            <svg
                                                                className="h-5 w-5 animate-spin"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <circle
                                                                    className="opacity-25"
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                />
                                                                <path
                                                                    className="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                                />
                                                            </svg>
                                                            Processing cancellation...
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
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                            Confirm Flight Cancellation
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Note additionnelle */}
                                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <svg
                                                    className="mt-0.5 h-5 w-5 text-slate-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                <div>
                                                    <p className="text-sm text-slate-600">
                                                        <span className="font-semibold">Note:</span> A cancellation confirmation email will be sent to
                                                        all passengers with refund instructions. This action is logged in the system audit trail.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* reschedule Flight */}

            <AnimatePresence>
                {showModalReschedule && (
                    <div className="fixed inset-0 z-50">
                        {/* Backdrop avec flou */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-black/70 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModalReschedule(false)}
                        />

                        {/* Contenu du modal */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="absolute inset-0 mx-auto my-6 flex items-center justify-center p-4 sm:my-12"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 shadow-2xl shadow-slate-900/30 ring-1 ring-white/50">
                                {/* En-tête avec gradient */}
                                <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-8 pb-6 pt-8">
                                    <div className="absolute -bottom-1 left-0 right-0 h-4 bg-gradient-to-t from-white/20 to-transparent" />

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Reschedule Flight</h2>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="rounded-full bg-white/20 px-3 py-1">
                                                    <span className="text-sm font-semibold text-white">{resCheduleFlight?.flight_number}</span>
                                                </div>
                                                <span className="text-sm text-white/90">• Update departure & arrival times</span>
                                            </div>
                                        </div>

                                        {/* Bouton fermer amélioré */}
                                        <button
                                            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 active:scale-95"
                                            aria-label="Close"
                                            onClick={() => setShowModalReschedule(false)}
                                        >
                                            <X className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
                                            <span className="absolute -inset-1 rounded-full bg-white/10 transition-all group-hover:bg-white/20" />
                                        </button>
                                    </div>
                                </div>

                                {/* Contenu principal */}
                                <div className="max-h-[70vh] overflow-auto p-8">
                                    {/* Carte d'itinéraire */}
                                    <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-lg ring-1 ring-slate-200/50">
                                        <div className="relative">
                                            {/* Ligne de connexion */}

                                            <div className="flex items-center justify-between">
                                                <div className="text-center">
                                                    <div className="mb-2">
                                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg">
                                                            <span className="text-lg font-bold text-white">✈️</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500">From</p>
                                                        <p className="text-lg font-bold text-slate-800">{resCheduleFlight?.from}</p>
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400">
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
                                                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <div className="mb-2">
                                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg">
                                                            <span className="text-lg font-bold text-white">🛬</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500">To</p>
                                                        <p className="text-lg font-bold text-slate-800">{resCheduleFlight?.to}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formulaire */}
                                    <div className="space-y-6">
                                        <form
                                            onSubmit={async (e) => {
                                                e.preventDefault();
                                                setSubmitting(true);
                                                const formData = new FormData(e.currentTarget);

                                                const flightDataReschedule = {
                                                    departure_time: formData.get("departure_time") as string,
                                                    arrival_time: formData.get("arrival_time") as string,
                                                };

                                                console.log("Données à envoyer:", flightDataReschedule);

                                                try {
                                                    await handleUpdateRescheduleFlight(resCheduleFlight.id, flightDataReschedule);
                                                } catch (err) {
                                                    console.error("Erreur dans le formulaire:", err);
                                                } finally {
                                                    setSubmitting(false);
                                                }
                                            }}
                                            className="max-h-[70vh] overflow-auto p-8"
                                        >
                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                {/* Champ Départ */}
                                                <div className="group">
                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                                        <span className="inline-flex items-center gap-2">
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
                                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            Departure Date & Time
                                                        </span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="datetime-local"
                                                            name="departure_time"
                                                            defaultValue={formatDateForInput(resCheduleFlight?.departure || "")}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                                            required
                                                        />
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 p-1">
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

                                                {/* Champ Arrivée */}
                                                <div className="group">
                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                                        <span className="inline-flex items-center gap-2">
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
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                            Arrival Date & Time
                                                        </span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="datetime-local"
                                                            name="arrival_time"
                                                            defaultValue={formatDateForInput(resCheduleFlight?.arrival || "")}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-slate-700 shadow-sm transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                                            required
                                                        />
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 p-1">
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
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bouton d'action */}
                                            <div className="pt-6">
                                                <div className="relative">
                                                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-50 blur-sm" />
                                                    <button
                                                        disabled={loadingPassengers}
                                                        className="relative w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                                    >
                                                        <span className="flex items-center justify-center gap-3">
                                                            {loadingPassengers ? (
                                                                <>
                                                                    <svg
                                                                        className="h-5 w-5 animate-spin"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            className="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4"
                                                                        />
                                                                        <path
                                                                            className="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                                        />
                                                                    </svg>
                                                                    Processing...
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
                                                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                                        />
                                                                    </svg>
                                                                    Confirm Reschedule
                                                                </>
                                                            )}
                                                        </span>
                                                    </button>
                                                </div>

                                                {/* Note informative */}
                                                <p className="mt-4 text-center text-sm text-slate-500">
                                                    Changes will be applied immediately. Passengers will receive notifications.
                                                </p>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlightTableCharter;
