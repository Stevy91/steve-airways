import { ChevronDown, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, MoreVertical, Pencil, PersonStanding, Ticket, Trash2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { useAuth } from "../../../hooks/useAuth";
import BookingDetailsModal, { BookingDetails } from "../../../components/BookingDetailsModal";
import BookingCreatedModal from "../../../components/BookingCreatedModdal";
import toast from "react-hot-toast";
import { format, parse, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { AnimatePresence, motion } from "framer-motion";

interface Flight {
    id: number;
    flight_number?: string;
    flightNumber?: string;
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

const FlightTable = () => {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showModalPassager, setShowModalPassager] = useState(false);
    const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedDeparture, setSelectedDeparture] = useState("");
    const [selectedDestination, setSelectedDestination] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<BookingDetails | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);

    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
    const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const [passengers, setPassengers] = useState<any[]>([]);
    const [loadingPassengers, setLoadingPassengers] = useState(false);
    const [stats, setStats] = useState<any>(null);

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

    // Fermer le dropdown si clic/touch extérieur de l'élément ouvert
    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (openDropdown === null) return; // rien d'ouvert => pas besoin de vérifier

            const el = dropdownRefs.current[openDropdown];
            if (!el) {
                setOpenDropdown(null);
                return;
            }

            // si le clic / touch est en dehors de l'élément, fermer
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


    const { user, loading: authLoading, isAdmin, hasPermission, permissions } = useAuth();

    // Vérifier plusieurs permissions
    const canAddNewFlight = isAdmin || hasPermission("addFlights");
    const canEditFlight = isAdmin || hasPermission("editFlights");
    const manifestPdf = isAdmin || hasPermission("manifestPdf");
    const deleteFlights = isAdmin || hasPermission("deleteFlights");

    const listePassagers = isAdmin || hasPermission("listePassagers");
    const imprimerTicket = isAdmin || hasPermission("imprimerTicket");
    const createdTicket = isAdmin || hasPermission("createdTicket");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    // Remplacer la ligne 69 (ou autour) où vous utilisez slice()
    const currentBookings = stats && stats.recentBookings ? stats.recentBookings.slice(indexOfFirstRow, indexOfLastRow) : [];

    // Et pour totalPages
    const totalPages = stats && stats.recentBookings ? Math.ceil(stats.recentBookings.length / rowsPerPage) : 1;

    const [menuOpen, setMenuOpen] = useState(false);
    // Fetch flights
    const fetchFlights = async () => {
        try {
            setLoading(true);
            const res = await fetch("https://steve-airways.onrender.com/api/flighttableplane");
            const data = await res.json();
            setStats(data);
        } catch {
            setError("Erreur lors du chargement des vols");
        } finally {
            setLoading(false);
        }
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
            // Si la date vient de la DB (format 'YYYY-MM-DD HH:mm:ss')
            d = parse(dateInput, "yyyy-MM-dd HH:mm:ss", new Date());
        } else {
            d = dateInput;
        }

        // Convertir en timezone Haïti
        const zonedDate = toZonedTime(d, "America/Port-au-Prince");

        // YYYY-MM-DDTHH:MM
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

        // Extraire les codes d'aéroport depuis les champs from/to
        const departureCode = extractAirportCode(flight.from || "");
        const destinationCode = extractAirportCode(flight.to || "");

        // Convertir les codes en IDs
        const departureId = findLocationIdByCode(departureCode);
        const destinationId = findLocationIdByCode(destinationCode);

        console.log("Départ code:", departureCode, "ID:", departureId);
        console.log("Destination code:", destinationCode, "ID:", destinationId);

        setEditingFlight(flight);
        setSelectedDeparture(departureId);
        setSelectedDestination(destinationId);
        setShowModal(true);
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

            // Rafraîchir les données après ajout
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

            // Rafraîchir les données après modification
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

    const handleSearch = async () => {
        try {
            setLoading(true);

            const url = new URL("https://steve-airways.onrender.com/api/flight-plane-search");
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
            "https://steve-airways.onrender.com/api/flight-plane-export?" +
            `flightNumb=${flightNumb}&tailNumber=${tailNumber}&dateDeparture=${dateDeparture}`;

        window.open(url, "_blank");
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
    const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");
    return (
        <div className="p-6">
            {notification && (
                <div
                    className={`fixed right-4 top-4 z-50 rounded px-4 py-2 text-white ${
                        notification.type === "success" ? "bg-green-500" : "bg-red-500"
                    }`}
                >
                    {notification.message}
                </div>
            )}

            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold">All Flight Airplane</h1>

                {/* Bouton Add new flight seulement pour les admins */}
                {canAddNewFlight && (
                    <button
                        onClick={() => {
                            setEditingFlight(null);
                            setSelectedDeparture("");
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
                                        className="border-b hover:bg-gray-50"
                                    >
                                        <td className="table-cell text-center">{flight.flight_number}</td>
                                        <td className="table-cell text-center">{flight.type === "plane" ? "Avion" : "Hélicoptère"}</td>
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
                                                                        <Pencil className="h-4 w-4 text-amber-500" /> Edit
                                                                    </button>
                                                                </>
                                                            )}
                                                            {deleteFlights && (
                                                                <>
                                                                    <button
                                                                        className="flex w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            deleteFlight(flight.id);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-red-500" /> Delete
                                                                    </button>
                                                                </>
                                                            )}
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
                                                                        <Ticket className="h-4 w-4 text-green-500" /> Create Ticket
                                                                    </button>
                                                                </>
                                                            )}
                                                            {listePassagers && (
                                                                <>
                                                                    <button
                                                                        className="flex w-full gap-2 px-4 py-2 text-left text-yellow-500 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            fetchPassengers(flight.id);
                                                                            setSelectedFlightId(flight.id);
                                                                            setShowModalPassager(true);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <PersonStanding className="h-6 w-6 text-yellow-500" /> Passengers
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

            <BookingCreatedModal
                open={open}
                onClose={() => setOpen(false)}
                flight={selectedFlight!}
                onTicketCreated={refreshFlights}
            />

            {/* Modal Add/Edit */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50">
                        <motion.div
                            className="absolute inset-0 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowModal(false);
                                setEditingFlight(null);
                                setSelectedDeparture("");
                                setSelectedDestination("");
                            }}
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
                                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Close"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingFlight(null);
                                        setSelectedDeparture("");
                                        setSelectedDestination("");
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="px-6 pt-6">
                                    <h2 className="text-xl font-semibold text-slate-800">{editingFlight ? "Update the flight" : "Add a flight"}</h2>
                                </div>

                                <div className="my-4 h-px w-full bg-slate-100" />

                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setSubmitting(true);
                                        const formData = new FormData(e.currentTarget);

                                        const flightData = {
                                            flight_number: formData.get("flight_number") as string,
                                            type: "plane",
                                            airline: formData.get("airline") as string,
                                            departure_location_id: selectedDeparture,
                                            arrival_location_id: selectedDestination,
                                            departure_time: formData.get("departure_time") as string,
                                            arrival_time: formData.get("arrival_time") as string,
                                            price: Number(formData.get("price")), // Convertir en number
                                            seats_available: Number(formData.get("seats_available")), // Convertir en number
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
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2">
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Flight number
                                            </label>
                                            <input
                                                type="text"
                                                name="flight_number"
                                                placeholder="Flight number"
                                                defaultValue={editingFlight?.flight_number || flightNumber}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                        </div>

                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Tail Number
                                            </label>

                                            <input
                                                type="text"
                                                name="airline"
                                                placeholder="Tail Number"
                                                defaultValue={editingFlight?.airline || ""}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Select the departure
                                            </label>
                                            <div className="relative flex w-full items-center rounded-md border border-gray-300 p-2 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    value={selectedDeparture}
                                                    onChange={(e) => setSelectedDeparture(e.target.value)}
                                                    className="w-full bg-transparent outline-none disabled:text-gray-400"
                                                    required
                                                    disabled={loadingLocations} // Désactive pendant chargement
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        Select the departure
                                                    </option>
                                                    {!loadingLocations &&
                                                        locations
                                                            .filter((loc) => String(loc.id) !== selectedDestination)
                                                            .map((loc) => (
                                                                <option
                                                                    key={loc.id}
                                                                    value={loc.id}
                                                                >
                                                                    {loc.city} ({loc.code})
                                                                </option>
                                                            ))}
                                                </select>

                                                {loadingLocations && (
                                                    <div className="absolute right-3">
                                                        <svg
                                                            className="h-5 w-5 animate-spin text-gray-500"
                                                            xmlns="http://www.w3.org/2000/svg"
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
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                            ></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Select destination
                                            </label>
                                            <div className="relative flex w-full items-center rounded-md border border-gray-300 p-2 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    value={selectedDestination}
                                                    onChange={(e) => setSelectedDestination(e.target.value)}
                                                    className="w-full bg-transparent outline-none disabled:text-gray-400"
                                                    required
                                                    disabled={loadingLocations} // Désactive pendant chargement
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        Select destination
                                                    </option>
                                                    {!loadingLocations &&
                                                        locations
                                                            .filter((loc) => String(loc.id) !== selectedDeparture)
                                                            .map((loc) => (
                                                                <option
                                                                    key={loc.id}
                                                                    value={loc.id}
                                                                >
                                                                    {loc.city} ({loc.code})
                                                                </option>
                                                            ))}
                                                </select>

                                                {loadingLocations && (
                                                    <div className="absolute right-3">
                                                        <svg
                                                            className="h-5 w-5 animate-spin text-gray-500"
                                                            xmlns="http://www.w3.org/2000/svg"
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
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                            ></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Departure date
                                            </label>
                                            <input
                                                type="datetime-local"
                                                name="departure_time"
                                                defaultValue={formatDateForInput(editingFlight?.departure || "")}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Arrival date
                                            </label>
                                            <input
                                                type="datetime-local"
                                                name="arrival_time"
                                                defaultValue={formatDateForInput(editingFlight?.arrival || "")}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Price
                                            </label>
                                            <input
                                                type="number"
                                                name="price"
                                                placeholder="Price ($)"
                                                defaultValue={editingFlight?.price}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Number of seats
                                            </label>
                                            <input
                                                type="number"
                                                name="seats_available"
                                                placeholder="Number of seats"
                                                defaultValue={editingFlight?.seats_available}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <button
                                                type="submit"
                                                className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 py-3 align-middle font-semibold text-white transition-colors hover:from-amber-600 hover:to-amber-500 hover:text-black disabled:bg-gray-400"
                                                disabled={submitting}
                                            >
                                                {submitting && (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 hover:text-black"></div>
                                                )}

                                                {editingFlight ? (submitting ? "Updating..." : "Update") : submitting ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal list passager*/}
            {/* Modal list passager - Seulement accessible aux admins */}

            <AnimatePresence>
                {showModalPassager && (
                    <div className="fixed inset-0 z-50">
                        <motion.div
                            className="absolute inset-0 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowModalPassager(false);
                            }}
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="absolute inset-0 mx-auto my-6 flex max-w-6xl items-start justify-center p-4 sm:my-12"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        >
                            <div className="relative max-h-[90vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                                <button
                                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Close"
                                    onClick={() => {
                                        setShowModalPassager(false);
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="px-6 pt-6">
                                    <h2 className="text-xl font-semibold text-slate-800"> Number of passengers ({passengers.length})</h2>
                                </div>

                                <div className="my-4 h-px w-full bg-slate-100" />
                                {loadingPassengers ? (
                                    <div className="flex items-center justify-center py-6">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
                                    </div>
                                ) : (
                                    <div className="max-h-[60vh] overflow-auto">
                                        {" "}
                                        {/* Ajout d'un conteneur scrollable */}
                                        <table className="table w-full">
                                            {" "}
                                            {/* Ajout de w-full */}
                                            <thead className="sticky top-0 bg-white">
                                                {" "}
                                                {/* Header fixe */}
                                                <tr>
                                                    <th className="table-head px-6 py-4 text-left">FirstName</th> {/* Plus de padding */}
                                                    <th className="table-head px-6 py-4 text-left">LastName</th>
                                                    <th className="table-head px-6 py-4 text-left">Email Address</th>
                                                    <th className="table-head px-6 py-4 text-left">Phone</th> {/* Nouvelle colonne */}
                                                    <th className="table-head px-6 py-4 text-left">Booking Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="table-body">
                                                {passengers.length > 0 ? (
                                                    passengers.map((p) => (
                                                        <tr
                                                            key={p.id}
                                                            className="border-b hover:bg-gray-50"
                                                        >
                                                            <td className="table-cell px-6 py-4">{p.first_name}</td>
                                                            <td className="table-cell px-6 py-4">{p.last_name}</td>
                                                            <td className="table-cell px-6 py-4">{p.email}</td>
                                                            <td className="table-cell px-6 py-4">{p.phone || "No Number"}</td>{" "}
                                                            {/* Nouvelle colonne */}
                                                            <td className="table-cell px-6 py-4">
                                                                {format(parseISO(p.booking_date), "EEE, dd MMM yyyy")}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="py-8 text-center text-gray-500"
                                                        >
                                                            No passenger found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        <div className="md:col-span-3">
                                            <div className="flex items-center justify-center py-6">
                                                <button
                                                    onClick={() => {
                                                        if (selectedFlightId) {
                                                            generatePassengerPDF(selectedFlightId);
                                                        } else {
                                                            toast.error("Aucun vol sélectionné");
                                                        }
                                                    }}
                                                    className="w-60 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-semibold text-white hover:from-amber-600 hover:to-amber-500 hover:text-black"
                                                    disabled={!selectedFlightId}
                                                >
                                                    {loadingPassengers ? "Chargement..." : "Download the passenger list"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlightTable;
