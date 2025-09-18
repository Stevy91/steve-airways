import { PlaneTakeoff, PlaneLanding, Clock4, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

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
    seat: string | number;
    noflight: string;
};

type FlightDetailProps = {
    flight: Flight;
    onBookNow: (flight: Flight) => void;
    passengers: {
        adult: number;
        child: number;
        infant: number;
    };
    isReturnFlight?: boolean;
};

export default function FlightDetail({ flight, onBookNow, passengers, isReturnFlight = false }: FlightDetailProps) {
    const { t } = useTranslation();
    const hasSeats = Number(flight.seat) > 0;

    

    const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");

    const handleBooking = () => {
        const totalPassengers = passengers.adult + passengers.child + passengers.infant;
        const availableSeats = Number(flight.seat);

        if (availableSeats < totalPassengers) {
            toast.error(`${t("Cannot book: only")} ${availableSeats} ${t("seat(s) available for")} ${totalPassengers} ${t("passenger(s)")}.`, {
                style: {
                        background: "#fee2e2",
                        color: "#991b1b",
                        border:"1px solid #f87171",
                        
                    },
                    iconTheme: {
                        primary: "#fff",
                        secondary: "#dc2626",
                    },
            });

            return;
        }
        onBookNow(flight);
    };

    return (
        <div className="mt-4 w-full rounded-lg border border-gray-300 bg-white p-4 shadow">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-blue-900">
                    {flight.from} → {flight.to}
                </h3>
                <span className="text-xl font-bold text-blue-900">${flight.price}</span>
            </div>

            <p className="mb-2 text-sm text-gray-600">
                Trogon Airways – {t("Flight")} {flight.noflight}
            </p>

            <div className="mb-4 space-y-2 text-sm text-gray-800">
                <div className="flex items-center space-x-4">
                    <PlaneTakeoff className="h-5 w-5 text-blue-900" />
                    <strong className="pr-4">{t("Departs")}:</strong> {flight.from}
                </div>

                <div className="flex items-center space-x-4">
                    <PlaneLanding className="h-5 w-5 text-blue-900" />
                    <strong className="pr-4">{t("Arrives")}:</strong> {flight.to}
                </div>

                <div className="flex items-center space-x-4">
                    <Clock4 className="h-5 w-5 text-blue-900" />
                    <span>
                        {formatDate(flight.date)} – {flight.time}
                    </span>
                </div>

                <div className="flex items-center space-x-4">
                    <Users className="h-5 w-5 text-blue-900" />
                    <span>{hasSeats ? `${flight.seat} seat${Number(flight.seat) !== 1 ? "s" : ""} available` : "No seats available"}</span>
                </div>

                <div className="flex items-center">
                    {hasSeats ? (
                        <button
                            onClick={handleBooking}
                            className="w-full rounded bg-red-900 py-2 font-semibold text-white hover:bg-red-700"
                        >
                            {isReturnFlight ? "Confirm Return Flight" : t("Book Now")}
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full cursor-not-allowed rounded bg-gray-400 py-2 font-semibold text-white"
                        >
                            {t("No seats available")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
