import { ChevronDown, MapPinIcon, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import Notifications from "../../../components/Notifications";

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

    // 🔹 Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // nombre de vols par page

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentFlights = flights.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(flights.length / itemsPerPage);

    // Fetch flights
    const fetchFlights = async () => {
        try {
            setLoading(true);
            const res = await fetch("https://steve-airways-production.up.railway.app/api/flighttableplane");
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
                const res = await fetch("https://steve-airways-production.up.railway.app/api/locations");
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

    // Fonction pour formater la date pour datetime-local
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return "";
        try {
            // Convertir le format "DD/MM/YYYY HH:MM" en "YYYY-MM-DDTHH:MM"
            const [datePart, timePart] = dateString.split(" ");
            const [day, month, year] = datePart.split("/");
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`;
        } catch {
            return "";
        }
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
            const res = await fetch("https://steve-airways-production.up.railway.app/api/addflighttable", {
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
            showNotification("Vol ajouté avec succès", "success");
        } catch (err: any) {
            showNotification(err.message || "Erreur inconnue", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateFlight = async (flightId: number, updatedData: any) => {
        try {
            setSubmitting(true);
            const res = await fetch(`https://steve-airways-production.up.railway.app/api/updateflight/${flightId}`, {
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
            showNotification("Vol modifié avec succès", "success");
        } catch (err: any) {
            console.error("❌ Erreur complète:", err);
            showNotification(err.message || "Erreur inconnue lors de la modification", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const deleteFlight = async (flightId: number) => {
        try {
            const res = await fetch(`https://steve-airways-production.up.railway.app/api/deleteflights/${flightId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur suppression");
            setFlights((prev) => prev.filter((f) => f.id !== flightId));
            showNotification("Vol supprimé", "success");
        } catch (err: any) {
            showNotification(err.message || "Erreur inconnue", "error");
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
                <div className="card-body overflow-auto p-0">
                    <div className="relative w-full flex-shrink-0 overflow-auto rounded-none [scrollbar-width:_thin]">
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
                                        <td className="table-cell text-center">{flight.departure}</td>
                                        <td className="table-cell text-center">{flight.arrival}</td>
                                        <td className="table-cell text-center">${flight.price}</td>
                                        <td className="table-cell text-center">{flight.seats_available}</td>
                                        <td className="relative px-4 py-2 table-cell text-center">
                                            <button
                                                className="flex w-full gap-2 px-4 py-2 text-left text-blue-500 hover:bg-gray-100"
                                                onClick={() => handleEditClick(flight)}
                                            >
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </button>
                                            <button
                                                className="flex w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                                                onClick={() => deleteFlight(flight.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </button>
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
                        className="rounded bg-blue-700 px-3 py-1 text-sm hover:bg-orange-400 disabled:bg-gray-200 text-gray-50"
                    >
                        Previous
                    </button>

                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded bg-blue-700 px-3 py-1 text-sm hover:bg-orange-400 disabled:bg-gray-200 text-gray-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Modal Add/Edit */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-xl rounded-lg bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">{editingFlight ? "Modifier le vol" : "Ajouter un vol"}</h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingFlight(null);
                                    setSelectedDeparture("");
                                    setSelectedDestination("");
                                }}
                                className="text-xl text-gray-500 hover:text-black"
                            >
                                &times;
                            </button>
                        </div>

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
                            <input
                                type="text"
                                name="flight_number"
                                placeholder="Numéro de vol"
                                defaultValue={editingFlight?.flight_number || ""}
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />
                            <input
                                type="text"
                                name="airline"
                                placeholder="Compagnie aérienne"
                                defaultValue={editingFlight?.airline || ""}
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />

                            <div className="relative flex items-center rounded-full border p-2">
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
                                        Sélectionner le départ
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

                            <div className="relative flex items-center rounded-full border p-2">
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
                                        Sélectionner le départ
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

                            <input
                                type="datetime-local"
                                name="departure_time"
                                defaultValue={formatDateForInput(editingFlight?.departure || "")}
                                className="w-full rounded-full border px-3 py-2"
                                required
                                
                            />

                            <input
                                type="datetime-local"
                                name="arrival_time"
                                defaultValue={formatDateForInput(editingFlight?.arrival || "")}
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />

                            <input
                                type="number"
                                name="price"
                                placeholder="Prix ($)"
                                defaultValue={editingFlight?.price}
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                name="seats_available"
                                placeholder="Nombre de sièges"
                                defaultValue={editingFlight?.seats_available}
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />

                            <button
                                type="submit"
                                className="relative flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white"
                                disabled={submitting}
                            >
                                {submitting && (
                                    <div className="absolute left-3 h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-white"></div>
                                )}
                                {editingFlight ? "Modifier" : "Enregistrer"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlightTable;
