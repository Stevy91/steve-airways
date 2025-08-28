import { PlaneTakeoff, PlaneLanding, Clock4, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

type Flight = {
    id: number;
    from: string;
    to: string;
    date: string;
    departure_time: string;
    arrival_time: string;
    time: string;
    price: number;
    type: string;
    seat: string;
    noflight: string;
};

type FlightDetailProps = {
    flight: Flight;
    onBookNow: (flight: Flight) => void;
    isReturnFlight?: boolean;
};

export default function FlightDetail({ flight, onBookNow, isReturnFlight = false }: FlightDetailProps) {
    const hasSeats = flight.seat !== "0"; // Vérifie si des places sont disponibles
const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");
    return (
        <div className="mt-4 w-full rounded-lg border border-gray-300 bg-white p-4 shadow">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-blue-600">
                    {flight.from} → {flight.to}
                </h3>
                <span className="text-xl font-bold text-red-600">${flight.price}</span>
            </div>

            <p className="mb-2 text-sm text-gray-600">Trogon Airways – Flight {flight.noflight}</p>

            <div className="mb-4 space-y-2 text-sm text-gray-800">
                <div className="flex items-center space-x-4">
                    <PlaneTakeoff className="h-5 w-5 text-blue-600" />
                    <strong className="pr-4">Departs:</strong> {flight.from}
                </div>

                <div className="flex items-center space-x-4">
                    <PlaneLanding className="h-5 w-5 text-blue-600" />
                    <strong className="pr-4">Arrives:</strong> {flight.to}
                </div>

                <div className="flex items-center space-x-4">
                    <Clock4 className="h-5 w-5 text-blue-600" />
                    <span>
                        {formatDate(flight.date)} – {flight.time}
                    </span>
                </div>

                <div className="flex items-center space-x-4">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>{flight.seat === "0" ? "No seats available" : `${flight.seat} seat${flight.seat !== "1" ? "s" : ""} available`}</span>
                </div>

                <div className="flex items-center">
                    {hasSeats ? (
                        <button
                            onClick={() => onBookNow(flight)}
                            className="w-full rounded bg-blue-500 py-2 font-semibold text-white hover:bg-blue-600"
                        >
                            {isReturnFlight ? "Confirm Return Flight" : "Book Now"}
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full cursor-not-allowed rounded bg-gray-400 py-2 font-semibold text-white"
                        >
                            No seats available
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
