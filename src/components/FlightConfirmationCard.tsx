import { Plane } from "lucide-react";
import { Icon } from "@iconify/react";
import { format, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
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
    card: UIFlight;
};
export default function FlightConfirmationCard({ card }: FlightCardProps) {
    const [searchParams] = useSearchParams();

    const adultsParam = searchParams.get("adults");
    const childrenParam = searchParams.get("children");
    const infantsParam = searchParams.get("infants");
    const tripTypeParam = searchParams.get("trip_type");

    return (
        <div className="relative flex items-center justify-between rounded-lg border p-4 shadow-sm">
            {/* Left bar */}
            <div className="absolute bottom-0 left-0 top-0 w-2 rounded-l-lg bg-blue-600"></div>

            {/* Left section */}
            <div className="pl-4 text-left">
                <div className="text-lg font-bold">{card.from}</div>
                <div className="text-sm text-gray-500">{format(parseISO(card.date), "EEE MMM d")}</div>
                <div className="text-sm font-semibold">{card.departure_time}</div>
            </div>

            {/* Center line */}
            <div className="relative mx-6 flex-1">
                <div className="absolute top-1/2 z-0 h-px w-full bg-blue-400"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                    <div className="text-center text-xs text-gray-700">
                        <div className="mb-1 text-xs font-medium">Duration: 1hours</div>
                        {card.type === "plane" ? (
                            <Plane className="h-5 w-5 text-blue-600" />
                        ) : (
                            <Icon
                                icon="mdi:helicopter"
                                className="h-5 w-5 text-blue-600"
                            />
                        )}
                        <div className="mt-1 text-xs font-semibold text-black">
                            2 passengers &nbsp;|&nbsp; {adultsParam} Adult &nbsp;|&nbsp; {childrenParam} Child &nbsp;|&nbsp {infantsParam} Child;
                            {tripTypeParam}
                        </div>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                </div>
            </div>

            {/* Right section */}
            <div className="pr-4 text-right">
                <div className="text-sm font-semibold text-gray-400">
                    Total price <span className="text-lg font-bold text-red-600">${card.price}</span>
                </div>
                <div className="text-lg font-bold">{card.to}</div>
                <div className="text-sm text-gray-500">{format(parseISO(card.date), "EEE MMM d")}</div>
                <div className="text-sm font-semibold">{card.arrival_time}</div>
                <button className="mt-1 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
                    Change
                    <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L6 11.172V14h2.828l8.586-8.586a2 2 0 000-2.828zM5 18a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
