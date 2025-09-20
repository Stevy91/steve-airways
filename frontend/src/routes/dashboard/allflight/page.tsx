import { ChevronDown, MapPinIcon, MoreVertical, Pencil, Ticket, Trash2, X } from "lucide-react";
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
    flight_number: string;
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
    const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedDeparture, setSelectedDeparture] = useState("");
    const [selectedDestination, setSelectedDestination] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<BookingDetails | undefined>(undefined);
    const [open, setOpen] = useState(false);

    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
    const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

    useAuth();

    // 🔹 Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // nombre de vols par page

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentFlights = flights.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(flights.length / itemsPerPage);
    const [menuOpen, setMenuOpen] = useState(false);
    // Fetch flights
    const fetchFlights = async () => {
        try {
            setLoading(true);
            const res = await fetch("https://steve-airways.onrender.com/api/flighttableplane");
            const data = await res.json();
            setFlights(data);
        } catch {
            setError("Erreur lors du chargement des vols");
        } finally {
            setLoading(false);
        }
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
        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/deleteflights/${flightId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur suppression");
            setFlights((prev) => prev.filter((f) => f.id !== flightId));
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

                <button
                    onClick={() => {
                        setEditingFlight(null);
                        setSelectedDeparture("");
                        setSelectedDestination("");
                        setShowModal(true);
                    }}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Add new flight
                </button>
            </div>
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
            )}

            <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                <div className="card-body overflow-visible p-0">
                    <div className="relative w-full flex-shrink-0 overflow-visible rounded-none [scrollbar-width:_thin]">
                        <table className="table">
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head text-center">Numéro de vol</th>
                                    <th className="table-head text-center">Type</th>
                                    <th className="table-head text-center">Compagnie</th>
                                    <th className="table-head text-center">Départ</th>
                                    <th className="table-head text-center">Destination</th>
                                    <th className="table-head text-center">Départ heure</th>
                                    <th className="table-head text-center">Arrivée heure</th>
                                    <th className="table-head text-center">Prix</th>
                                    <th className="table-head text-center">Sièges</th>
                                    <th className="table-head text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {currentFlights.map((flight, index) => (
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
                                                    className="inline-flex w-full justify-center gap-2 rounded-lg p-2 px-4 py-2 text-center text-blue-500 hover:bg-amber-500"
                                                    onClick={() => setOpenDropdown(openDropdown === flight.id ? null : flight.id)}
                                                >
                                                    <MoreVertical className="h-5 w-5 text-gray-700" />
                                                </button>

                                                {openDropdown === flight.id && (
                                                    <div className="absolute right-0 z-[9999] mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                                                        <div className="py-1">
                                                            <button
                                                                className="flex w-full gap-2 px-4 py-2 text-left text-blue-500 hover:bg-gray-100"
                                                                onClick={() => {
                                                                    handleEditClick(flight);
                                                                    setOpenDropdown(null);
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4 text-blue-500" /> Edit
                                                            </button>
                                                            <button
                                                                className="flex w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                                                                onClick={() => {
                                                                    deleteFlight(flight.id);
                                                                    setOpenDropdown(null);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" /> Delete
                                                            </button>
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
                </div>
                {/* 🔹 Pagination */}
                <div className="mt-4 flex justify-center gap-2">
                    <span>
                        Page {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded bg-blue-700 px-3 py-1 text-sm text-gray-50 hover:bg-orange-400 disabled:bg-gray-200"
                    >
                        Previous
                    </button>

                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded bg-blue-700 px-3 py-1 text-sm text-gray-50 hover:bg-orange-400 disabled:bg-gray-200"
                    >
                        Next
                    </button>
                </div>
            </div>

            <BookingCreatedModal
                open={open}
                onClose={() => setOpen(false)}
                flight={selectedFlight!}
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
                                                defaultValue={editingFlight?.flight_number || ""}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                                required
                                            />
                                        </div>

                                        <div className="flex flex-col">
                                            <label
                                                htmlFor="firstName"
                                                className="mb-1 font-medium text-gray-700"
                                            >
                                                Airline
                                            </label>

                                            <input
                                                type="text"
                                                name="airline"
                                                placeholder="Airline"
                                                defaultValue={editingFlight?.airline || ""}
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                                            <div className="relative flex w-full items-center rounded-md border border-gray-300 p-2 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
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
                                            <div className="relative flex w-full items-center rounded-md border border-gray-300 p-2 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
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
                                                 className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                                                 className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                                                className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                                                 className="w-full rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                             <button
                                                type="submit"
                                                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-3 align-middle font-semibold text-white transition-colors hover:bg-blue-700"
                                                disabled={submitting}
                                            >
                                                {submitting && (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-white"></div>
                                                )}
                                                {editingFlight ? "Update" : "Save"}
                                            </button>
                                        </div>
                                        </div>
                                    </form>
                               
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlightTable;
