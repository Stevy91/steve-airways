import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, PlaneIcon, PlaneTakeoff, PlaneLanding, AlertCircle } from "lucide-react";
import { Icon } from "@iconify/react";
import { addDays, isSameDay, parseISO, format, isBefore,  } from "date-fns";
import DateCarousel from "../../components/DateCarousel";
import FlightCard from "../../components/FlightCard";
import FlightDetail from "../../components/FlightDetail";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { HeroSection } from "../../layouts/HeroSection";
import CalendarModal from "../../components/Calendarmodal";
import { HeroSectionSearch } from "../../layouts/HeroSectionSearch";
import SessionTimeout from "../../components/SessionTimeout";
import { toZonedTime } from "date-fns-tz";

type FlightType = "plane" | "helicopter";

interface Flight {
    id: number;
    from: string;
    to: string;
    date: string;
    departure_time: string;
    arrival_time: string;
    time: string;
    price: number;
    type: FlightType | string;
    seat: string | number;
    noflight: string;
    
}

interface Location {
    id: number;
    name: string;
    code: string;
    city: string;
    country: string;
}

interface FlightSelectionState {
    allFlights: Flight[];
    filteredFlights: Flight[];
    returnFlights: Flight[];
    locations: Location[];
    loading: boolean;
    error: string | null;
}

interface BookingState {
    outbound?: Flight;
    return?: Flight;
    showOutboundSelection: boolean;
    showReturnSelection: boolean;
}

const Stepper = ({ currentStep }: { currentStep: number }) => {
    const { t, i18n } = useTranslation();
    return (
        <div className="relative mb-10 px-6">
        
            <div className="absolute left-[14%] right-[14%] top-2 z-10 hidden h-0.5 bg-blue-900 md:block" />
            <div className="relative z-10 flex items-center justify-between">
                {[t("Flight"), t("Passenger"), t("Pay"), "Confirmation"].map((step, idx) => {
                    const isCompleted = idx < currentStep;
                    const isActive = idx === currentStep;

                    return (
                        <div
                            key={idx}
                            className="flex w-1/4 flex-col items-center text-center text-sm"
                        >
                            <div
                                className={`relative z-10 mb-2 h-4 w-4 rounded-full border-2 ${
                                    isActive
                                        ? "border-blue-900 bg-red-900"
                                        : isCompleted
                                          ? "border-blue-900 bg-blue-900"
                                          : "border-blue-900 bg-slate-50"
                                }`}
                            >
                                {isCompleted && (
                                    <svg
                                        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span
                                className={`whitespace-nowrap ${
                                    isActive ? "font-bold text-blue-900" : isCompleted ? "text-blue-900" : "text-blue-900"
                                }`}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RouteHeader = ({ from, to, locations, prefix = "Vol" }: { from: string | null; to: string | null; locations: Location[]; prefix?: string }) => {
    // const getLocation = (code: string | null) => {
    //     const location = locations.find((loc) => loc.code === code);
    //     return location ? `${location.city} (${location.code})` : "Inconnu";
    // };

    const getLocation = (code: string | null) => {
        if (!Array.isArray(locations)) return "Inconnu";
        const location = locations.find((loc) => loc.code === code);
        return location ? `${location.city} (${location.code})` : "Inconnu";
    };

    return (
        <div className="mb-2 flex px-4 text-sm font-semibold text-gray-700">
            <h3 className="font-bold text-blue-900">{prefix}</h3> : {getLocation(from)} → {getLocation(to)}
        </div>
    );
};

// const mapFlight = (flight: any, locations: Location[]): Flight => {
//     // const depLoc = locations.find((l) => l.id === flight.departure_location_id);
//     // const arrLoc = locations.find((l) => l.id === flight.arrival_location_id);

//     const depLoc = Array.isArray(locations) ? locations.find((l) => l.id === flight.departure_location_id) : null;
//     const arrLoc = Array.isArray(locations) ? locations.find((l) => l.id === flight.arrival_location_id) : null;

//     const date = new Date(flight.departure_time);
//     const isoDate = date.toISOString().split("T")[0];

//     const extractTime = (isoString?: string) => {
//         if (!isoString) return "—";
//         const timePart = isoString.split("T")[1]; // "15:14:00.000Z"
//         if (!timePart) return "—";
//         return timePart.slice(0, 5); // "15:14"
//     };

//     // utilisation
//     const departureTime = extractTime(flight.departure_time);
//     const arrivalTime = extractTime(flight.arrival_time);

//     return {
//         id: flight.id,
//         from: depLoc ? `${depLoc.city} (${depLoc.code})` : "Inconnu",
//         to: arrLoc ? `${arrLoc.city} (${arrLoc.code})` : "Inconnu",
//         date: isoDate,
//         departure_time: departureTime,
//         arrival_time: arrivalTime,
//         time: `${departureTime} - ${arrivalTime}`,
//         type: flight.type,
//         price: Number(flight.price),
//         seat: flight.seats_available.toString(),
//         noflight: flight.flight_number,
//     };
// };



// const formatDate = (isoString: string) => {
//   return isoString.split("T")[0]; // yyyy-MM-dd
// };

// const formatTime = (isoString: string) => {
//   const timePart = isoString.split("T")[1]; // "18:41:00.000Z" ou "18:41:00"
//   if (!timePart) return "—";
//   return timePart.slice(0, 5); // "18:41"
// };


// const mapFlight = (flight: any, locations: Location[]): Flight => {
//         const depLoc = locations.find((l) => l.id === flight.departure_location_id);
//     const arrLoc = locations.find((l) => l.id === flight.arrival_location_id);
    
// //   const depLoc = Array.isArray(locations) ? locations.find((l) => l.id === flight.departure_location_id) : null;
// //   const arrLoc = Array.isArray(locations) ? locations.find((l) => l.id === flight.arrival_location_id) : null;

// return {
//   id: flight.id,
//   from: depLoc ? `${depLoc.city} (${depLoc.code})` : "Inconnu",
//   to: arrLoc ? `${arrLoc.city} (${arrLoc.code})` : "Inconnu",
//   date: formatDate(flight.departure_time),
//   departure_time: formatTime(flight.departure_time),
//   arrival_time: formatTime(flight.arrival_time),
//   time: `${formatTime(flight.departure_time)} - ${formatTime(flight.arrival_time)}`, // ✅ pas de décalage
//   type: flight.type,
//   price: Number(flight.price),
//   seat: flight.seats_available.toString(),
//   noflight: flight.flight_number,
// };

// }





const timeZone = "America/Port-au-Prince";

const convertToHaitiTime = (isoString: string): Date => {
  const date = parseISO(isoString);
  return toZonedTime(date, timeZone);
};

const formatDate = (isoString: string) => format(convertToHaitiTime(isoString), "yyyy-MM-dd");
const formatTime = (isoString: string) => format(convertToHaitiTime(isoString), "HH:mm");

const mapFlight = (flight: any, locations: Location[]): Flight => {
  const depLoc = locations.find((l) => l.id === flight.departure_location_id);
  const arrLoc = locations.find((l) => l.id === flight.arrival_location_id);

  return {
    id: flight.id,
    from: depLoc ? `${depLoc.city} (${depLoc.code})` : "Inconnu",
    to: arrLoc ? `${arrLoc.city} (${arrLoc.code})` : "Inconnu",
    date: formatDate(flight.departure_time),
    departure_time: formatTime(flight.departure_time),
    arrival_time: formatTime(flight.arrival_time),
    time: `${formatTime(flight.departure_time)} - ${formatTime(flight.arrival_time)}`,
    type: flight.type,
    price: Number(flight.price),
    seat: flight.seats_available.toString(),
    noflight: flight.flight_number,
  };
};



export default function FlightSelection() {
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [currentStep] = useState(0);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [selectedReturnDateIndex, setSelectedReturnDateIndex] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [startReturnIndex, setStartReturnIndex] = useState(0);
    const [isOpen, setIsOpen] = useState<number | null>(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const { t, i18n } = useTranslation();
    const [loadingOutbound, setLoadingOutbound] = useState(false);
    const [loadingReturn, setLoadingReturn] = useState(false);
    const [showCalendars, setShowCalendars] = useState(false);

    const [state, setState] = useState<FlightSelectionState>({
        allFlights: [],
        filteredFlights: [],
        returnFlights: [],
        locations: [],
        loading: true,
        error: null,
    });
    const fetchFlightData = async (params: URLSearchParams, signal?: AbortSignal) => {
        try {
            const [locationsRes, flightAllRes, filteredFlightsRes] = await Promise.all([
                fetch(`https://steve-airways.onrender.com/api/locations`, { signal }),
                fetch(`https://steve-airways.onrender.com/api/flightall`, { signal }),
                fetch(`https://steve-airways.onrender.com/api/flights?${params.toString()}`, { signal }),
            ]);

            // if (!locationsRes.ok || !flightAllRes.ok || !filteredFlightsRes.ok) {
            //     navigate(`/${currentLang}/`); // ← redirection vers la page d’accueil
            // }

            const [locations, allFlights, filteredFlightsData] = await Promise.all([
                locationsRes.json(),
                flightAllRes.json(),
                filteredFlightsRes.json(),
            ]);

            let filteredFlights = [];
            if (Array.isArray(filteredFlightsData)) {
                filteredFlights = filteredFlightsData;
            } else if (filteredFlightsData && filteredFlightsData.outbound) {
                filteredFlights = filteredFlightsData.outbound;
            }

            let returnFlights = [];
            if (params.get("trip_type") === "roundtrip" && params.get("return_date")) {
                const returnParams = new URLSearchParams(params);
                returnParams.set("from", params.get("to") || "");
                returnParams.set("to", params.get("from") || "");
                returnParams.set("date", params.get("return_date") || "");

                const returnFlightsRes = await fetch(`https://steve-airways.onrender.com/api/flights?${returnParams.toString()}`, {
                    signal,
                });
                if (returnFlightsRes.ok) {
                    const returnData = await returnFlightsRes.json();
                    returnFlights = Array.isArray(returnData) ? returnData : returnData.outbound || [];
                }
            }

            return [locations, allFlights, filteredFlights, returnFlights];
        } catch (error) {
            throw error;
        }
    };
    const [booking, setBooking] = useState<BookingState>({
        showOutboundSelection: true,
        showReturnSelection: true,
    });

    // Extract URL parameters
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const dateParam = searchParams.get("date");
    const returnDateParam = searchParams.get("return_date");
    const adultsParam = searchParams.get("adults");
    const childrenParam = searchParams.get("children");
    const infantsParam = searchParams.get("infants");
    const tripTypeParam = searchParams.get("trip_type");
    const tabTypeParam = searchParams.get("tab");

    const [passengers, setPassengers] = useState({
        adult: parseInt(adultsParam || "1"),
        child: parseInt(childrenParam || "0"),
        infant: parseInt(infantsParam || "0"),
    });

    // Variables dérivées
    const from = fromParam || "";
    const to = toParam || "";
    const date1 = dateParam || "";

    const [selectedTabTrip, setSelectedTabTrip] = useState(tripTypeParam === "roundtrip" ? "roundtrip" : "oneway");
    const [selectedTab, setSelectedTab] = useState<FlightType>(tabTypeParam === "helicopter" ? "helicopter" : "plane");

    const visibleCount = useMemo(() => {
        if (windowWidth < 640) return 3;
        if (windowWidth < 1024) return 5;
        return 7;
    }, [windowWidth]);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setPassengers({
            adult: parseInt(adultsParam || "1"),
            child: parseInt(childrenParam || "0"),
            infant: parseInt(infantsParam || "0"),
        });
        setSelectedTabTrip(tripTypeParam === "roundtrip" ? "roundtrip" : "oneway");
        setSelectedTab(tabTypeParam === "helicopter" ? "helicopter" : "plane");
    }, [adultsParam, childrenParam, infantsParam, tripTypeParam, tabTypeParam]);

    useEffect(() => {
        const controller = new AbortController();

        const loadData = async () => {
            try {
                setLoadingOutbound(true);
                if (tripTypeParam === "roundtrip") {
                    setLoadingReturn(true);
                }

                const [locations, allFlights, filteredFlights, returnFlights] = await fetchFlightData(searchParams, controller.signal);

                setState({
                    allFlights: allFlights.map((f: any) => mapFlight(f, locations)),
                    filteredFlights: filteredFlights.map((f: any) => mapFlight(f, locations)),
                    returnFlights: returnFlights.map((f: any) => mapFlight(f, locations)),
                    locations,
                    loading: false,
                    error: null,
                });
            } catch (error) {
                if (!controller.signal.aborted) {
                    setState((prev) => ({
                        ...prev,
                        loading: false,
                        error: error instanceof Error ? error.message : "Erreur inconnue",
                    }));
                }
            } finally {
                setLoadingOutbound(false);
                setLoadingReturn(false);
            }
        };

        loadData();
        return () => controller.abort();
    }, [searchParams, tripTypeParam]);

    const allDates = useMemo(() => {
        if (!state.allFlights.length) return [];

        const datesArray = Array.from({ length: 31 }).map((_, i) => {
            const date = addDays(new Date(), i);
            const isoDate = date.toISOString().split("T")[0];

            const matchingFlights = state.allFlights.filter(
                (f) => f.from.includes(fromParam || "") && f.to.includes(toParam || "") && f.type === selectedTab, // Filtrer par type de vol
            );

            const dayFlights = matchingFlights.filter((f) => f.date === isoDate);

            return {
                date,
                price: dayFlights.length ? Math.min(...dayFlights.map((f) => f.price)) : null,
                hasFlight: dayFlights.length > 0,
                hasAnyFlight: state.allFlights.some(
                    (f) => f.date === isoDate && f.type === selectedTab, // Filtrer par type de vol
                ),
            };
        });

        return datesArray;
    }, [state.allFlights, fromParam, toParam, selectedTab]); // Ajouter selectedTab aux dépendances

    const allReturnDates = useMemo(() => {
        if (!state.allFlights.length || !toParam || !fromParam) return [];

        const datesArray = Array.from({ length: 31 }).map((_, i) => {
            const date = addDays(new Date(), i);
            const isoDate = date.toISOString().split("T")[0];

            const matchingFlights = state.allFlights.filter(
                (f) => f.from.includes(toParam) && f.to.includes(fromParam) && f.type === selectedTab, // Filtrer par type de vol
            );

            const dayFlights = matchingFlights.filter((f) => f.date === isoDate);

            return {
                date,
                price: dayFlights.length ? Math.min(...dayFlights.map((f) => f.price)) : null,
                hasFlight: dayFlights.length > 0,
                hasAnyFlight: state.allFlights.some(
                    (f) => f.date === isoDate && f.type === selectedTab, // Filtrer par type de vol
                ),
            };
        });

        return datesArray;
    }, [state.allFlights, fromParam, toParam, selectedTab]); // Ajouter selectedTab aux dépendances

    const filteredFlights = useMemo(() => {
        if (!state.filteredFlights.length) return [];

        const selectedDate = allDates[selectedDateIndex]?.date;
        if (!selectedDate) return [];

        const isoDate = selectedDate.toISOString().split("T")[0];

        return state.filteredFlights.filter((f) => f.date === isoDate && f.from.includes(fromParam || "") && f.to.includes(toParam || ""));
    }, [state.filteredFlights, allDates, selectedDateIndex, fromParam, toParam]);

    const filteredReturnFlights = useMemo(() => {
        if (!state.returnFlights.length) return [];

        const selectedDate = allReturnDates[selectedReturnDateIndex]?.date;
        if (!selectedDate) return [];

        const isoDate = selectedDate.toISOString().split("T")[0];

        return state.returnFlights.filter((f) => f.date === isoDate && f.from.includes(toParam || "") && f.to.includes(fromParam || ""));
    }, [state.returnFlights, allReturnDates, selectedReturnDateIndex, fromParam, toParam]);

    useEffect(() => {
        if (!dateParam || !allDates.length) return;

        const index = allDates.findIndex((d) => isSameDay(d.date, parseISO(dateParam)));

        if (index !== -1) {
            setSelectedDateIndex(index);
            const newStartIndex = Math.max(0, Math.min(index - Math.floor(visibleCount / 2), allDates.length - visibleCount));
            setStartIndex(newStartIndex);
        }
    }, [dateParam, allDates, visibleCount]);

    useEffect(() => {
        if (!returnDateParam || !allReturnDates.length || selectedTabTrip !== "roundtrip") return;

        const index = allReturnDates.findIndex((d) => isSameDay(d.date, parseISO(returnDateParam)));

        if (index !== -1) {
            setSelectedReturnDateIndex(index);
            const newStartIndex = Math.max(0, Math.min(index - Math.floor(visibleCount / 2), allReturnDates.length - visibleCount));
            setStartReturnIndex(newStartIndex);
        }
    }, [returnDateParam, allReturnDates, selectedTabTrip, visibleCount]);

    const handleDateSelect = useCallback(
        (index: number) => {
            setSelectedDateIndex(index);
            setIsOpen(null);

            const newStartIndex = Math.max(0, Math.min(index - Math.floor(visibleCount / 2), allDates.length - visibleCount));
            setStartIndex(newStartIndex);

            const selectedDate = allDates[index]?.date;
            if (!selectedDate) return;

            const formattedDate = format(selectedDate, "yyyy-MM-dd");
            const params = new URLSearchParams(searchParams);
            params.set("date", formattedDate);
            navigate(`/${currentLang}/flights?${params.toString()}`);
        },
        [allDates, visibleCount, searchParams, navigate],
    );

    const handleReturnDateSelect = useCallback(
        (index: number) => {
            setSelectedReturnDateIndex(index);
            setIsOpen(null);

            const newStartIndex = Math.max(0, Math.min(index - Math.floor(visibleCount / 2), allReturnDates.length - visibleCount));
            setStartReturnIndex(newStartIndex);

            const selectedDate = allReturnDates[index]?.date;
            if (!selectedDate) return;

            const formattedDate = format(selectedDate, "yyyy-MM-dd");
            const params = new URLSearchParams(searchParams);
            params.set("return_date", formattedDate);
            navigate(`/${currentLang}/flights?${params.toString()}`);
        },
        [allReturnDates, visibleCount, searchParams, navigate],
    );

    const handlePrevClick = useCallback(() => {
        setStartIndex((prev) => {
            const newIndex = prev - visibleCount;
            if (newIndex < 0) return 0;

            const newSelectedIndex = Math.min(newIndex + Math.floor(visibleCount / 2), allDates.length - 1);
            setSelectedDateIndex(newSelectedIndex);

            const selectedDate = allDates[newSelectedIndex]?.date;
            if (selectedDate) {
                const formattedDate = format(selectedDate, "yyyy-MM-dd");
                const params = new URLSearchParams(searchParams);
                params.set("date", formattedDate);
                navigate(`/${currentLang}/flights?${params.toString()}`);
            }

            return newIndex;
        });
    }, [visibleCount, allDates, searchParams, navigate]);

    const handleNextClick = useCallback(() => {
        setStartIndex((prev) => {
            const newIndex = prev + visibleCount;
            const maxIndex = Math.max(0, allDates.length - visibleCount);
            if (newIndex > maxIndex) return prev;

            const newSelectedIndex = Math.min(newIndex + Math.floor(visibleCount / 2), allDates.length - 1);
            setSelectedDateIndex(newSelectedIndex);

            const selectedDate = allDates[newSelectedIndex]?.date;
            if (selectedDate) {
                const formattedDate = format(selectedDate, "yyyy-MM-dd");
                const params = new URLSearchParams(searchParams);
                params.set("date", formattedDate);
                navigate(`/${currentLang}/flights?${params.toString()}`);
            }

            return newIndex;
        });
    }, [visibleCount, allDates, searchParams, navigate]);

    const handleReturnPrevClick = useCallback(() => {
        setStartReturnIndex((prev) => {
            const newIndex = prev - visibleCount;
            if (newIndex < 0) return 0;

            const newSelectedIndex = Math.min(newIndex + Math.floor(visibleCount / 2), allReturnDates.length - 1);
            setSelectedReturnDateIndex(newSelectedIndex);

            const selectedDate = allReturnDates[newSelectedIndex]?.date;
            if (selectedDate) {
                const formattedDate = format(selectedDate, "yyyy-MM-dd");
                const params = new URLSearchParams(searchParams);
                params.set("return_date", formattedDate);
                navigate(`/${currentLang}/flights?${params.toString()}`);
            }

            return newIndex;
        });
    }, [visibleCount, allReturnDates, searchParams, navigate]);

    const handleReturnNextClick = useCallback(() => {
        setStartReturnIndex((prev) => {
            const newIndex = prev + visibleCount;
            const maxIndex = Math.max(0, allReturnDates.length - visibleCount);
            if (newIndex > maxIndex) return prev;

            const newSelectedIndex = Math.min(newIndex + Math.floor(visibleCount / 2), allReturnDates.length - 1);
            setSelectedReturnDateIndex(newSelectedIndex);

            const selectedDate = allReturnDates[newSelectedIndex]?.date;
            if (selectedDate) {
                const formattedDate = format(selectedDate, "yyyy-MM-dd");
                const params = new URLSearchParams(searchParams);
                params.set("return_date", formattedDate);
                navigate(`/${currentLang}/flights?${params.toString()}`);
            }

            return newIndex;
        });
    }, [visibleCount, allReturnDates, searchParams, navigate]);

    const calculateTotalPrice = (flight: Flight) => {
        const adultPrice = flight.price * passengers.adult;
        // const childPrice = flight.price * passengers.child * 0.75;
        // const infantPrice = flight.price * passengers.infant * 0.1;
        const childPrice = flight.price * passengers.child;
        const infantPrice = flight.price * passengers.infant;
        return Math.round(adultPrice + childPrice + infantPrice);
    };

    const handleBookNow = (flight: Flight, isReturnFlight: boolean = false) => {
        const flightWithTotalPrice = {
            ...flight,
            totalPrice: calculateTotalPrice(flight),
        };

        if (isReturnFlight) {
            setBooking({
                ...booking,
                return: flightWithTotalPrice,
                showReturnSelection: false,
            });
        } else {
            setBooking({
                outbound: flightWithTotalPrice,
                showOutboundSelection: false,
                return: undefined,
                showReturnSelection: selectedTabTrip === "roundtrip",
            });
        }
    };

    const handleChangeFlight = (isReturn: boolean) => {
        if (isReturn) {
            setBooking({
                ...booking,
                return: undefined,
                showReturnSelection: true,
            });
        } else {
            setBooking({
                outbound: undefined,
                showOutboundSelection: true,
                return: undefined,
                showReturnSelection: false,
            });
        }
    };

    const renderBookingConfirmation = (flight: Flight, isReturn?: boolean) => {
        const totalPassengers = passengers.adult + passengers.child + passengers.infant;
        const getCityName = (code: string | null) => {
            const location = state.locations.find((loc) => loc.code === code);
            return location ? location.city : code || "Inconnu";
        };

        const from = isReturn ? toParam : fromParam;
        const to = isReturn ? fromParam : toParam;
        const fromCity = getCityName(from);
        const toCity = getCityName(to);
        const totalPrice = calculateTotalPrice(flight);

        return (
            <div className="relative flex items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="absolute bottom-0 left-0 top-0 w-2 rounded-l-lg bg-blue-900"></div>

                <div className="mr-8 pl-4 text-left">
                    <div className="text-lg font-bold">
                        {fromCity} ({from})
                    </div>
                    <div className="text-sm text-gray-900">{format(parseISO(flight.date), "EEE MMM d")}</div>
                    <div className="text-sm font-semibold">{flight.departure_time}</div>
                </div>

                <div className="relative flex-1">
                    <div className="flex items-center justify-between">
                        <div className="flex-shrink-0">
                            {flight.type === "plane" ? (
                                <PlaneTakeoff className="h-5 w-5 text-blue-900" />
                            ) : (
                                <Icon
                                    icon="mdi:helicopter"
                                    className="h-5 w-5 text-blue-900"
                                />
                            )}
                        </div>

                        <div className="relative mx-2 flex-1">
                            <div className="absolute left-3 right-3 top-1/2 z-0 border-t-2 border-blue-900"></div>
                        </div>

                        <div className="flex-shrink-0">
                            {flight.type === "plane" ? (
                                <PlaneLanding className="h-5 w-5 text-blue-900" />
                            ) : (
                                <Icon
                                    icon="mdi:helicopter"
                                    className="h-5 w-5 text-blue-900"
                                />
                            )}
                        </div>
                    </div>

                    <div className="text-center text-xs font-semibold text-black">
                        {passengers.adult} Adult{passengers.adult > 1 ? "s" : ""}
                        {passengers.child > 0 && ` | ${passengers.child} Child${passengers.child > 1 ? "ren" : ""}`}
                        {passengers.infant > 0 && ` | ${passengers.infant} Infant${passengers.infant > 1 ? "s" : ""}`}
                    </div>
                </div>

                <div className="ml-8 pr-4 text-right">
                    <div className="text-sm font-semibold text-gray-400">
                        {totalPassengers} Passenger{totalPassengers > 1 ? "s" : ""} • Total Price:{" "}
                        <span className="text-lg font-bold text-red-600">${totalPrice}</span>
                    </div>
                    <div className="text-lg font-bold">
                        {toCity} ({to})
                    </div>
                    <div className="text-sm text-gray-900">{format(parseISO(flight.date), "EEE MMM d")}</div>
                    <div className="text-sm font-semibold">{flight.arrival_time}</div>
                    <button
                        onClick={() => handleChangeFlight(!!isReturn)}
                        className="mt-1 flex items-center gap-1 text-sm font-semibold text-blue-900 hover:underline"
                    >
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
    };

    if (state.error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eeeeef]">
                <ErrorAlert
                    message={state.error}
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    if (state.loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eeeeef]">
                <Spinner size="lg" />
                <p className="ml-4 text-lg text-blue-900">{t("Loading...")}</p>
            </div>
        );
    } else {
        return (
            <>
           {/* SessionTimeout */}
                 {/* <SessionTimeout /> */}
                <HeroSectionSearch />
                <div
                    className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                    style={{ backgroundImage: "url(/plane-bg.jpg)" }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-30"></div>

                    <div className="px-4 pt-24">
                        {/* <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Let's Explore the World Together!")}</h1>
                    <p className="text-xl">{t("We fly to connect people.")}</p> */}
                    </div>
                </div>

                <div className="mx-auto h-full max-w-7xl px-4 py-12 font-sans">
                    <div className="relative z-10 mt-[-100px] w-full rounded bg-white p-6 shadow-lg">
                        <Stepper currentStep={currentStep} />
                        <div className="flex text-center">
                            <h2 className="mb-4 px-4 text-2xl font-bold">{t("Choose Flights")}</h2>
                            <button
                                className="mb-4 items-center justify-center rounded-lg border border-blue-900 pl-2 pr-2 text-center"
                                onClick={() => setShowCalendars(true)}
                            >
                                <CalendarDays className="ml-7 h-5 w-5 text-blue-900" />
                                <span className="font-bold text-blue-900">{t("Calendar")}</span>
                            </button>
                        </div>

                        {/* Modal des calendriers */}
                        {showCalendars && (
                            <CalendarModal
                                allDates={allDates}
                                allReturnDates={allReturnDates}
                                selectedDateIndex={selectedDateIndex}
                                selectedReturnDateIndex={selectedReturnDateIndex}
                                handleDateSelect={handleDateSelect}
                                handleReturnDateSelect={handleReturnDateSelect}
                                fromParam={fromParam}
                                toParam={toParam}
                                selectedTabTrip={selectedTabTrip}
                                onClose={() => setShowCalendars(false)}
                                searchParams={searchParams}
                                navigate={navigate}
                                currentLang={currentLang}
                            />
                        )}

                        {/* Outbound Flight Section */}
                        <RouteHeader
                            from={fromParam}
                            to={toParam}
                            locations={state.locations}
                            prefix={t("Depart Flight")}
                        />
                        {booking.showOutboundSelection ? (
                            <>
                                <div className="mb-6 mt-8 flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2">
                                    <button
                                        className="p-2 disabled:opacity-30"
                                        onClick={handlePrevClick}
                                        disabled={startIndex === 0}
                                        aria-label="Dates précédentes"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-blue-900" />
                                    </button>

                                    <DateCarousel
                                        allDates={allDates}
                                        selectedDateIndex={selectedDateIndex}
                                        setSelectedDateIndex={handleDateSelect}
                                        startIndex={startIndex}
                                        visibleCount={visibleCount}
                                        from={from}
                                        to={to}
                                        date={date1}
                                        passengers={passengers}
                                        tripType={selectedTabTrip}
                                        tabType={selectedTab}
                                        label="Vol Aller"
                                        isReturnDateCarousel={false}
                                        returnDate={returnDateParam || undefined}
                                    />

                                    <button
                                        className="p-2 disabled:opacity-30"
                                        onClick={handleNextClick}
                                        disabled={startIndex + visibleCount >= allDates.length}
                                        aria-label="Dates suivantes"
                                    >
                                        <ChevronRight className="h-5 w-5 text-blue-900" />
                                    </button>
                                </div>

                                {loadingOutbound ? (
                                    <div className="flex h-40 items-center justify-center">
                                        <Spinner size="md" />
                                        <p className="ml-3 text-blue-900">{t("Loading flights...")}</p>
                                    </div>
                                ) : filteredFlights.length > 0 ? (
                                    <div className="mb-[80px] space-y-4">
                                        {filteredFlights.map((flight) => (
                                            <div key={`${flight.id}-${flight.date}`}>
                                                <FlightCard
                                                    flight={flight}
                                                    isOpen={isOpen === flight.id}
                                                    onToggle={() => setIsOpen(isOpen === flight.id ? null : flight.id)}
                                                />
                                                {isOpen === flight.id && (
                                                    <FlightDetail
                                                        flight={flight}
                                                        onBookNow={(f) => handleBookNow(f, false)}
                                                        passengers={passengers}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<PlaneIcon className="h-12 w-12 text-gray-400" />}
                                        title={t("No flights available")}
                                        description={t("No flight matches your criteria for this date.")}
                                    />
                                )}
                            </>
                        ) : (
                            booking.outbound && renderBookingConfirmation(booking.outbound, false)
                        )}

                        {/* Return Flight Section */}
                        {selectedTabTrip === "roundtrip" && (
                            <>
                                <RouteHeader
                                    from={toParam}
                                    to={fromParam}
                                    locations={state.locations}
                                    prefix={t("Return Flight")}
                                />

                                {booking.showReturnSelection ? (
                                    <>
                                        <div className="mb-6 mt-8 flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2">
                                            <button
                                                className="p-2 disabled:opacity-30"
                                                onClick={handleReturnPrevClick}
                                                disabled={startReturnIndex === 0}
                                                aria-label="Dates précédentes retour"
                                            >
                                                <ChevronLeft className="h-5 w-5 text-blue-900" />
                                            </button>

                                            <DateCarousel
                                                allDates={allReturnDates}
                                                selectedDateIndex={selectedReturnDateIndex}
                                                setSelectedDateIndex={handleReturnDateSelect}
                                                startIndex={startReturnIndex}
                                                visibleCount={visibleCount}
                                                from={to}
                                                to={from}
                                                date={date1}
                                                passengers={passengers}
                                                tripType={selectedTabTrip}
                                                tabType={selectedTab}
                                                label="Vol Retour"
                                                isReturnDateCarousel={true}
                                                returnDate={returnDateParam || undefined}
                                                flightType={selectedTab} // Ajoutez cette ligne
                                            />

                                            <button
                                                className="p-2 disabled:opacity-30"
                                                onClick={handleReturnNextClick}
                                                disabled={startReturnIndex + visibleCount >= allReturnDates.length}
                                                aria-label="Dates suivantes retour"
                                            >
                                                <ChevronRight className="h-5 w-5 text-blue-900" />
                                            </button>
                                        </div>

                                        {loadingReturn ? (
                                            <div className="flex h-40 items-center justify-center">
                                                <Spinner size="md" />
                                                <p className="ml-3 text-blue-900">{t("Loading flights...")}</p>
                                            </div>
                                        ) : filteredReturnFlights.length > 0 ? (
                                            <div className="space-y-4">
                                                {filteredReturnFlights.map((flight) => (
                                                    <div key={`return-${flight.id}-${flight.date}`}>
                                                        <FlightCard
                                                            flight={flight}
                                                            isOpen={isOpen === flight.id}
                                                            onToggle={() => setIsOpen(isOpen === flight.id ? null : flight.id)}
                                                        />
                                                        {isOpen === flight.id && (
                                                            <FlightDetail
                                                                flight={flight}
                                                                onBookNow={(f) => handleBookNow(f, true)}
                                                                isReturnFlight
                                                                passengers={passengers}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState
                                                icon={<PlaneIcon className="h-12 w-12 text-gray-400" />}
                                                title={t("No flights available")}
                                                description={t("No flight matches your criteria for this return date.")}
                                            />
                                        )}
                                    </>
                                ) : (
                                    booking.return && renderBookingConfirmation(booking.return, true)
                                )}
                            </>
                        )}

                        {/* Continue Button */}
                        {/* Continue Button */}
                        {booking.outbound &&
                            !booking.showOutboundSelection &&
                            (selectedTabTrip === "oneway" || (selectedTabTrip === "roundtrip" && booking.return && !booking.showReturnSelection)) && (
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => {
                                            const fromLocation = state.locations.find((loc) => loc.code === fromParam);
                                            const toLocation = state.locations.find((loc) => loc.code === toParam);

                                            // Préparation des données de réservation avec les IDs des vols
                                            const bookingData = {
                                                outbound: {
                                                    ...booking.outbound!,
                                                    flightId: booking.outbound!.id, // ID du vol aller
                                                },
                                                return: booking.return
                                                    ? {
                                                          ...booking.return,
                                                          flightId: booking.return.id, // ID du vol retour
                                                      }
                                                    : undefined,
                                                passengers: {
                                                    adults: passengers.adult,
                                                    children: passengers.child,
                                                    infants: passengers.infant,
                                                },
                                                tripType: selectedTabTrip,
                                                tabType: selectedTab,
                                                from: fromParam,
                                                to: toParam,
                                                fromCity: fromLocation?.city || fromParam,
                                                toCity: toLocation?.city || toParam,
                                                departureDate: dateParam,
                                                returnDate: returnDateParam,
                                                totalPrice:
                                                    calculateTotalPrice(booking.outbound!) +
                                                    (booking.return ? calculateTotalPrice(booking.return) : 0),
                                            };

                                            // Navigation vers la page des passagers avec les données de réservation
                                            navigate(`/${currentLang}/passenger`, {
                                                state: bookingData,
                                            });
                                        }}
                                        className="mt-6 w-48 rounded-md bg-red-900 py-3 font-semibold text-white hover:bg-red-700"
                                    >
                                        {t("Continue to Passenger")}
                                    </button>
                                </div>
                            )}
                    </div>
                </div>
            </>
        );
    }
}
function utcToZonedTime(isoString: string, timeZone: string) {
    throw new Error("Function not implemented.");
}

