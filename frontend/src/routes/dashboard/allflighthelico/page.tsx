import { ChevronDown, MapPinIcon, Pencil, TicketsPlane, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Flight {
    id: number;
    flight_number: string;
    type: string;
    air_line: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    price: number;
    seats_available: string;
    departure_city?: string;
    arrival_city?: string;
}
type Location = {
    id: number;
    name: string;
    code: string;
    city: string;
    country?: string;
};

const FlightTable = () => {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedDeparture, setSelectedDeparture] = useState("");
    const [selectedDestination, setSelectedDestination] = useState("");

    // State pour les erreurs de validation
    const [errors, setErrors] = useState({
        departure: "",
        destination: "",
        date: "",
        departure2: "",
        destination2: "",
        date2: "",
        returnDate: "",
    });

    useEffect(() => {
        const fetchFlights = async () => {
            try {
                console.log("Début de la récupération des vols...");
                const response = await fetch("https://steve-airways-production.up.railway.app/api/flighttablehelico");

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.message || `Erreur HTTP: ${response.status}`);
                }

                const data = await response.json();
                console.log("Données reçues:", data);
                setFlights(data);
                setError(null);
            } catch (err) {
                console.error("Erreur complète:", err);
                setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue");
            } finally {
                setLoading(false);
            }
        };

        fetchFlights();
    }, []);

    useEffect(() => {
        fetch("https://steve-airways-production.up.railway.app/api/locations")
            .then((res) => res.json())
            .then((data) => {
                setLocations(data);
            });
    }, []);

    const toggleDropdown = (index: number) => {
        setOpenDropdown(openDropdown === index ? null : index);
    };

    const handleAddFlight = async (flightData: any) => {
        try {
            const response = await fetch("https://steve-airways-production.up.railway.app/api/addflighttable", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(flightData),
            });

            // Vérifier le Content-Type avant de parser
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(`Réponse inattendue: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de l'ajout du vol");
            }

            // Rechargement des données
            const updatedResponse = await fetch("https://steve-airways-production.up.railway.app/api/flighttablehelico"); // Changé le endpoint
            if (!updatedResponse.ok) {
                throw new Error("Erreur lors du chargement des vols");
            }

            const updatedData = await updatedResponse.json();
            setFlights(updatedData);
            setShowModal(false);
        } catch (error) {
            if (error instanceof Error) {
                console.error("Erreur:", error);
                alert(error.message);
            } else {
                console.error("Erreur inconnue:", error);
                alert("Une erreur inconnue est survenue");
            }
        }
    };
    const deleteFlight = async (flightId: number) => {
        try {
            const response = await fetch(`https://steve-airways-production.up.railway.app/api/deleteflights/${flightId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Échec de la suppression");
            }

            // Mise à jour optimiste de l'UI
            setFlights((prev) => prev.filter((f) => f.id !== flightId));
            alert(data.message);
        } catch (error) {
            console.error("Erreur:", error);
            alert(error instanceof Error ? error.message : "Erreur inconnue");
        }
    };

    if (loading) return <div className="p-6">Chargement en cours...</div>;
    if (error) return <div className="p-6 text-red-500">Erreur: {error}</div>;

    return (
        <div className="relative min-h-screen bg-gray-100 p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold">All Flight Helico</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Add new flight
                </button>
            </div>

            {/* Controls */}
            {/* Controls repositionnés */}
            <div className="mb-4 flex items-start justify-between">
                {/* Bulk action à gauche */}
                {/* <div className="flex items-center space-x-2">
                    <select className="rounded border border-gray-300 px-2 py-1">
                        <option>Bulk Actions</option>
                    </select>
                    <button className="rounded bg-teal-600 px-3 py-1 text-white">Apply</button>
                </div> */}

                {/* Barre de recherche à droite */}
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        placeholder="Search by name"
                        className="w-60 rounded border border-gray-300 px-2 py-1"
                    />
                    <button className="rounded bg-blue-500 px-4 py-1 text-white">Search</button>
                </div>
            </div>

            {/* Tableau des vols */}
            <div className="overflow-x-auto rounded bg-white shadow">
                <table className="min-w-full text-left text-sm">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="px-4 py-2">
                                <input type="checkbox" />
                            </th>
                            <th className="px-4 py-2">Numéro de vol</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Compagnie</th>
                            <th className="px-4 py-2">Départ de</th>
                            <th className="px-4 py-2">Destination</th>
                            <th className="px-4 py-2">Heure de départ</th>
                            <th className="px-4 py-2">Heure d'arrivée</th>
                            <th className="px-4 py-2">Prix ($)</th>
                            <th className="px-4 py-2">Sièges disponibles</th>
                            <th className="px-4 py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flights.map((flight, index) => (
                            <tr
                                key={flight.id}
                                className="relative border-b hover:bg-gray-50"
                            >
                                <td className="px-4 py-2">
                                    <input type="checkbox" />
                                </td>
                                <td className="px-4 py-2">{flight.flight_number}</td>
                                <td className="px-4 py-2">{flight.type === "plane" ? "Avion" : "Hélicoptère"}</td>
                                <td className="px-4 py-2">{flight.air_line}</td>
                                <td className="px-4 py-2">
                                    {flight.from}
                                    {flight.departure_city && <div className="text-xs text-gray-500">{flight.departure_city}</div>}
                                </td>
                                <td className="px-4 py-2">
                                    {flight.to}
                                    {flight.arrival_city && <div className="text-xs text-gray-500">{flight.arrival_city}</div>}
                                </td>
                                <td className="px-4 py-2">{flight.departure}</td>
                                <td className="px-4 py-2">{flight.arrival}</td>
                                <td className="px-4 py-2">${flight.price}</td>
                                <td className="px-4 py-2">{flight.seats_available}</td>
                                <td className="relative px-4 py-2">
                                    <button
                                        onClick={() => toggleDropdown(index)}
                                        className="flex rounded bg-blue-600 px-3 py-1 text-white"
                                    >
                                        ▤<ChevronDown className="ml-1 h-4 w-4" />
                                    </button>
                                    {openDropdown === index && (
                                        <div className="absolute right-0 z-10 mt-2 w-40 rounded border bg-white shadow-md">
                                            <button className="flex w-full gap-2 px-4 py-2 text-left text-blue-500 hover:bg-gray-100">
                                                <Pencil className="ml-1 h-4 w-4 text-blue-500" />
                                                Modifier
                                            </button>
                                            <button className="flex w-full gap-2 px-4 py-2 text-left text-blue-500 hover:bg-gray-100">
                                                <TicketsPlane className="ml-1 h-4 w-4 text-blue-500" />
                                                Billet de vol
                                            </button>
                                            <button
                                                onClick={() => deleteFlight(flight.id)}
                                                className="flex w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                                            >
                                                <Trash2 className="ml-1 h-4 w-4 text-red-500" />
                                                delete
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="p-4 text-right text-sm text-gray-500">{flights.length} éléments trouvés</p>
            </div>

            {/* Modal pour ajouter un vol */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-xl rounded-lg bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Ajouter un nouveau vol</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-xl text-gray-500 hover:text-black"
                            >
                                &times;
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const flightData = {
                                    flight_number: formData.get("flight_number") || null,
                                    type: formData.get("type") || null,
                                    air_line: formData.get("air_line") || null,
                                    departure_location_id: formData.get("departure_location_id") || null,
                                    arrival_location_id: formData.get("arrival_location_id") || null,
                                    departure_time: formData.get("departure_time") || null,
                                    arrival_time: formData.get("arrival_time") || null,
                                    price: formData.get("price") || null,
                                    seats_available: formData.get("seats_available") || null,
                                };
                                await handleAddFlight(flightData);
                            }}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                name="flight_number"
                                placeholder="Numéro de vol"
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />
                            <input
                                type="text"
                                name="type"
                                placeholder="Numéro de vol"
                                className="w-full rounded-full border px-3 py-2"
                                value="helicopter"
                                required
                                hidden
                            />
                            {/* <select
                                name="type"
                                className="w-full rounded-full border px-3 py-2"
                                required
                            >
                                <option value="">Sélectionnez le type</option>
                                <option value="plane">Avion</option>
                                <option value="helicopter">Hélicoptère</option>
                            </select> */}
                            <input
                                type="text"
                                name="air_line"
                                placeholder="Compagnie aérienne"
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />

                            <div className="flex items-center rounded-full border p-2">
                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                <select
                                    value={selectedDeparture}
                                    name="departure_location_id"
                                    onChange={(e) => {
                                        setSelectedDeparture(e.target.value);
                                        setErrors({ ...errors, departure: "" });
                                    }}
                                    id="from"
                                    className="w-full bg-transparent outline-none"
                                    defaultValue=""
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Select Departure
                                    </option>
                                    {locations.map((loc) => (
                                        <option
                                            key={loc.id}
                                            value={loc.id}
                                        >
                                            {loc.city} ({loc.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center rounded-full border p-2">
                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                <select
                                    value={selectedDestination}
                                    name="arrival_location_id"
                                    onChange={(e) => {
                                        setSelectedDestination(e.target.value);
                                        setErrors({ ...errors, destination: "" });
                                    }}
                                    id="to"
                                    className="w-full bg-transparent outline-none"
                                    defaultValue=""
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Select Destination
                                    </option>
                                    {locations.map((loc) => (
                                        <option
                                            key={loc.id}
                                            value={loc.id}
                                        >
                                            {loc.city} ({loc.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="datetime-local"
                                name="departure_time"
                                placeholder="Départ"
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />
                            <input
                                type="datetime-local"
                                name="arrival_time"
                                placeholder="Arrivée"
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                name="price"
                                placeholder="Prix ($)"
                                className="w-full rounded-full border px-3 py-2"
                                step="0.01"
                                required
                            />
                            <input
                                type="number"
                                name="seats_available"
                                placeholder="Nombre de sièges"
                                className="w-full rounded-full border px-3 py-2"
                                required
                            />
                            <button
                                type="submit"
                                className="rounded bg-blue-600 px-4 py-2 text-white"
                            >
                                Enregistrer
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlightTable;
