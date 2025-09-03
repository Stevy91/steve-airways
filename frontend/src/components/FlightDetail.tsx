import { PlaneTakeoff, PlaneLanding, Clock4, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import toast from 'react-hot-toast';

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
    selectedPassengers: number; // nombre de passagers choisis
    isReturnFlight?: boolean;
};

export default function FlightDetail({ flight, onBookNow, selectedPassengers, isReturnFlight = false }: FlightDetailProps) {
    const { t } = useTranslation();

    const availableSeats = Number(flight.seat); // convertir en nombre
    const hasSeats = availableSeats > 0;

    const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");

   const handleBooking = () => {
    const passengers = Number(selectedPassengers) || 1; // assure qu'on a un nombre
    const availableSeats = Number(flight.seat); // convertir le nombre de sièges disponible en number

    if (availableSeats >= passengers) {
        onBookNow(flight);
       
    } else {
        toast.error(`Impossible de steve : seulement ${availableSeats} siège(s) disponible(s) pour ${passengers} passager(s).`);
    }
};
    

    return (
        <div className="mt-4 w-full rounded-lg border border-gray-300 bg-white p-4 shadow">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-blue-600">
                    {flight.from} → {flight.to}
                </h3>
                <span className="text-xl font-bold text-red-600">${flight.price}</span>
            </div>

            <p className="mb-2 text-sm text-gray-600">
                Trogon Airways – {t("Flight")} {flight.noflight}
            </p>

            <div className="mb-4 space-y-2 text-sm text-gray-800">
                <div className="flex items-center space-x-4">
                    <PlaneTakeoff className="h-5 w-5 text-blue-600" />
                    <strong className="pr-4">{t("Departs")}:</strong> {flight.from}
                </div>

                <div className="flex items-center space-x-4">
                    <PlaneLanding className="h-5 w-5 text-blue-600" />
                    <strong className="pr-4">{t("Arrives")}:</strong> {flight.to}
                </div>

                <div className="flex items-center space-x-4">
                    <Clock4 className="h-5 w-5 text-blue-600" />
                    <span>
                        {formatDate(flight.date)} – {flight.time}
                    </span>
                </div>

                <div className="flex items-center space-x-4">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>{availableSeats === 0 ? "No seats available" : `${availableSeats} seat${availableSeats !== 1 ? "s" : ""} available`}</span>
                </div>

                <div className="flex items-center">
                    <button
                        onClick={handleBooking}
                        className={`w-full rounded py-2 font-semibold text-white ${
                            Number(flight.seat) > 0 ? "bg-blue-500 hover:bg-blue-600" : "cursor-not-allowed bg-gray-400"
                        }`}
                        disabled={Number(flight.seat) === 0}
                    >
                        {Number(flight.seat) === 0 ? t("No seats available") : isReturnFlight ? "Confirm Return Flight" : t("Book Now")}
                    </button>
                </div>
            </div>
        </div>
    );
}
