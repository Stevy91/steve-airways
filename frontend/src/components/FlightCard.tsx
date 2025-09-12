import { Plane, Sofa } from "lucide-react";
import { Icon } from "@iconify/react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

// src/types/flight.ts
export interface UIFlight {
  id: string | number;
  date: string;
  from: string;
  to: string;
  price: number;
  airline?: string;
  seatsAvailable?: number;
  seat:string | number;
  departure_time: string;
  type: string;
  arrival_time:string;
  // ajoute ici toutes les autres propriétés dont tu as besoin
}


type FlightCardProps = {
    flight: UIFlight;
    isOpen: boolean;
    onToggle: () => void;
};
export default function FlightCard({ flight, onToggle }: FlightCardProps) {
          const { t, i18n } = useTranslation();
    const hasSeats = flight.seat !== "0"; // Vérifie si des places sont disponibles


    

    return (
        <div className="mb-4 flex flex-col rounded-lg border border-blue-900 px-6 py-4 transition-all hover:shadow-md md:flex-row md:items-center">
            {/* Contenu du vol */}
            <div
                className="flex w-full cursor-pointer items-center justify-between"
                onClick={onToggle}
            >
                {/* De */}
                <div className="text-left">
                    <h3 className="font-bold">{flight.from}</h3>
                    <p className="text-sm text-gray-600">{format(parseISO(flight.date), "EEE MMM d")}</p>
                    <p className="text-sm text-gray-600">{flight.departure_time}</p>
                </div>

                {/* Ligne avec icône */}
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

                {/* À */}
                <div className="text-right">
                    <h3 className="font-bold">{flight.to}</h3>
                    <p className="text-sm text-gray-600">{format(parseISO(flight.date), "EEE MMM d")}</p>
                    <p className="text-sm text-gray-600">{flight.arrival_time}</p>
                </div>
            </div>

            {/* Bouton */}
            <div className="ml-4 mt-4 w-full md:mt-0 md:w-auto">
                {hasSeats ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="w-full rounded-lg bg-blue-300 px-4 py-2 text-center text-blue-900 transition hover:bg-blue-100 md:w-40"
                    >
                        <div className="text-sm">{t("starting from")}</div>
                        <div className="text-xl font-bold">${flight.price}</div>
                    </button>
                ) : (
                    <button className="w-full rounded-lg bg-red-60 px-4 py-2 text-center text-red-900 transition hover:bg-red-700 md:w-40">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div>
                                <Sofa className="mx-auto h-5 w-5 text-red-900" />
                            </div>
                            <div className="text-sm">{t("No seat")}</div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
