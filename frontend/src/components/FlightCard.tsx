import { Plane, Sofa, XCircle } from "lucide-react";
import { Icon } from "@iconify/react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

export interface UIFlight {
    id: string | number;
    date: string; // exemple: "2025-09-13"
    departure_time: string; // exemple: "15:15"
    arrival_time: string;
    from: string;
    to: string;
    price: number;
    airline?: string;
    seatsAvailable?: number;
    seat: string | number;
    type: string;
}

type FlightCardProps = {
    flight: UIFlight;
    isOpen: boolean;
    onToggle: () => void;
};

export default function FlightCard({ flight, onToggle }: FlightCardProps) {
    const { t } = useTranslation();

    const hasSeats = flight.seat !== "0";

    // 🔹 Vérification si le vol est passé


    const flightDateTime = new Date(`${flight.date}T${flight.departure_time}:00`);
const isFlightClosed = flightDateTime.getTime() < new Date().getTime();


    return (
        <div className="mb-4 flex flex-col rounded-lg border border-blue-900 px-6 py-4 transition-all hover:shadow-md md:flex-row md:items-center">
            <div
                className="flex w-full cursor-pointer items-center justify-between mr-2"
                onClick={onToggle}
            >
                <div className="text-left">
                    <h3 className="font-bold">{flight.from}</h3>
                    <p className="text-sm text-gray-600">{format(parseISO(flight.date), "EEE, dd MMM")}</p>
                    <p className="text-sm text-gray-600">{flight.departure_time}</p>
                </div>

                <div className="relative mx-6 h-5 flex-1">
                    <div className="absolute left-0 top-1/2 w-full border-t-2 border-blue-900"></div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                        {flight.type === "plane" ? (
                            <Plane className="h-5 w-5 text-blue-900" />
                        ) : (
                            <Icon
                                icon="mdi:helicopter"
                                className="h-5 w-5 text-blue-900"
                            />
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <h3 className="font-bold">{flight.to}</h3>
                    <p className="text-sm text-gray-600">{format(parseISO(flight.date), "EEE, dd MMM")}</p>
                    <p className="text-sm text-gray-600">{flight.arrival_time}</p>
                </div>
            </div>

            {/* Bouton */}
            <div className="mt-4 w-full md:mt-0 md:w-auto">
                {isFlightClosed ? (
                    <button className="w-full rounded-lg bg-yellow-300 px-4 py-2 text-center text-red-900 transition md:w-40">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div>
                                <XCircle className="h-6 w-6 font-bold text-red-900" />
                            </div>
                            <div className="text-md font-bold text-red-900">{t("Flight closed")}</div>
                        </div>
                    </button>
                ) : hasSeats ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="w-full rounded-lg bg-blue-300 px-4 py-2 text-center text-blue-900 transition hover:bg-blue-100 md:w-40"
                    >
                        <div className="text-sm font-bold">{t("Starting from")}</div>
                        <div className="text-xl font-bold">${flight.price}</div>
                    </button>
                ) : (
                    <button className="w-full rounded-lg bg-red-100 px-4 py-2 text-center text-red-900 transition md:w-40">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div>
                                <Sofa className="mx-auto h-5 w-5 font-bold text-red-900" />
                            </div>
                            <div className="text-sm font-bold">{t("No seat")}</div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
