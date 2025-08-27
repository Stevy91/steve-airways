import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, PlaneIcon, PlaneTakeoff, PlaneLanding} from "lucide-react";
import { Icon } from "@iconify/react";
import { addDays, isSameDay, parseISO, format } from "date-fns";
import DateCarousel from "../../components/DateCarousel";
import FlightCard from "../../components/FlightCard";
import FlightDetail from "../../components/FlightDetail";
import { useSearchParams, useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";


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
    seat: string;
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
    return (
        <div className="relative mb-10 px-6">
            <div className="absolute left-[14%] right-[14%] top-2 z-0 h-0.5 bg-blue-500" />
            <div className="relative z-10 flex items-center justify-between">
                {["Flight", "Passenger", "Pay", "Confirmation"].map((step, idx) => {
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
                                        ? "border-blue-500 bg-red-500"
                                        : isCompleted
                                          ? "border-blue-500 bg-blue-500"
                                          : "border-blue-500 bg-slate-50"
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
                                    isActive ? "font-bold text-blue-500" : isCompleted ? "text-blue-500" : "text-blue-500"
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
    const getLocation = (code: string | null) => {
        const location = locations.find((loc) => loc.code === code);
        return location ? `${location.city} (${location.code})` : "Inconnu";
    };

    return (
        <div className="mb-2 flex px-4 text-sm font-semibold text-gray-700">
            <h3 className="font-bold text-blue-700">{prefix}</h3> : {getLocation(from)} → {getLocation(to)}
        </div>
    );
};

const mapFlight = (flight: any, locations: Location[]): Flight => {
    const departure = new Date(flight.departure_time);
    const arrival = new Date(flight.arrival_time);
    const depLoc = locations.find((l) => l.id === flight.departure_location_id);
    const arrLoc = locations.find((l) => l.id === flight.arrival_location_id);

    const date = new Date(flight.departure_time);
    const isoDate = date.toISOString().split("T")[0];

    const departureTime = departure.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const arrivalTime = arrival.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return {
        id: flight.id,
        from: depLoc ? `${depLoc.city} (${depLoc.code})` : "Inconnu",
        to: arrLoc ? `${arrLoc.city} (${arrLoc.code})` : "Inconnu",
        date: isoDate,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        time: `${departureTime} - ${arrivalTime}`,
        type: flight.type,
        price: Number(flight.price),
        seat: flight.seats_available.toString(),
        noflight: flight.flight_number,
    };
};

const fetchFlightData = async (params: URLSearchParams, signal?: AbortSignal) => {
    try {
        const [locationsRes, flightAllRes, filteredFlightsRes] = await Promise.all([
            fetch(`http://localhost:3005/locations`, { signal }),
            fetch(`http://localhost:3005/flightall`, { signal }),
            fetch(`http://localhost:3005/flights?${params.toString()}`, { signal }),
        ]);

        if (!locationsRes.ok || !flightAllRes.ok || !filteredFlightsRes.ok) {
            throw new Error("Erreur lors du chargement des données");
        }

        const [locations, allFlights, filteredFlightsData] = await Promise.all([locationsRes.json(), flightAllRes.json(), filteredFlightsRes.json()]);

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

            const returnFlightsRes = await fetch(`http://localhost:3005/flights?${returnParams.toString()}`, { signal });
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

export default function FlightSelection() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [currentStep] = useState(0);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [selectedReturnDateIndex, setSelectedReturnDateIndex] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [startReturnIndex, setStartReturnIndex] = useState(0);
    const [isOpen, setIsOpen] = useState<number | null>(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [state, setState] = useState<FlightSelectionState>({
        allFlights: [],
        filteredFlights: [],
        returnFlights: [],
        locations: [],
        loading: true,
        error: null,
    });
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
                const [locations, allFlights, filteredFlights, returnFlights] = await fetchFlightData(searchParams, controller.signal);

                const safeFilteredFlights = Array.isArray(filteredFlights) ? filteredFlights : [];
                const safeReturnFlights = Array.isArray(returnFlights) ? returnFlights : [];

                setState({
                    allFlights: allFlights.map((f: any) => mapFlight(f, locations)),
                    filteredFlights: safeFilteredFlights.map((f: any) => mapFlight(f, locations)),
                    returnFlights: safeReturnFlights.map((f: any) => mapFlight(f, locations)),
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
            }
        };

        loadData();

        return () => controller.abort();
    }, [searchParams]);

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
            navigate(`/flights?${params.toString()}`);
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
            navigate(`/flights?${params.toString()}`);
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
                navigate(`/flights?${params.toString()}`);
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
                navigate(`/flights?${params.toString()}`);
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
                navigate(`/flights?${params.toString()}`);
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
                navigate(`/flights?${params.toString()}`);
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
                <div className="absolute bottom-0 left-0 top-0 w-2 rounded-l-lg bg-blue-600"></div>

                <div className="mr-8 pl-4 text-left">
                    <div className="text-lg font-bold">
                        {fromCity} ({from})
                    </div>
                    <div className="text-sm text-gray-500">{format(parseISO(flight.date), "EEE MMM d")}</div>
                    <div className="text-sm font-semibold">{flight.departure_time}</div>
                </div>

                <div className="relative flex-1">
                    <div className="flex items-center justify-between">
                        <div className="flex-shrink-0">
                            {flight.type === "plane" ? (
                                <PlaneTakeoff className="h-5 w-5 text-blue-600" />
                            ) : (
                                <Icon
                                    icon="mdi:helicopter"
                                    className="h-5 w-5 text-blue-600"
                                />
                            )}
                        </div>

                        <div className="relative mx-2 flex-1">
                            <div className="absolute left-3 right-3 top-1/2 z-0 border-t-2 border-blue-600"></div>
                        </div>

                        <div className="flex-shrink-0">
                            {flight.type === "plane" ? (
                                <PlaneLanding className="h-5 w-5 text-blue-600" />
                            ) : (
                                <Icon
                                    icon="mdi:helicopter"
                                    className="h-5 w-5 text-blue-600"
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
                    <div className="text-sm text-gray-500">{format(parseISO(flight.date), "EEE MMM d")}</div>
                    <div className="text-sm font-semibold">{flight.arrival_time}</div>
                    <button
                        onClick={() => handleChangeFlight(!!isReturn)}
                        className="mt-1 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
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

    if (state.loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eeeeef]">
                <Spinner size="lg" />
                <p className="ml-4 text-lg">Chargement des vols en cours...</p>
            </div>
        );
    }

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

    return (
        <div className="h-full bg-[#eeeeef] font-sans">
            <div className="relative z-10 mt-[-100px] w-full rounded bg-white p-6 shadow-lg">
                <Stepper currentStep={currentStep} />
                <div className="flex text-center">
                    <h2 className="mb-4 px-4 text-2xl font-bold">Choose Flights</h2>
                    <button className="mb-4 items-center justify-center rounded-lg border border-blue-700 pl-2 pr-2 text-center">
                        <CalendarDays className="ml-7 h-5 w-5 text-blue-700" />
                        <span className="font-bold text-blue-700">Calendar</span>
                    </button>
                </div>

                {/* Outbound Flight Section */}
                <RouteHeader
                    from={fromParam}
                    to={toParam}
                    locations={state.locations}
                    prefix="Depart Flight"
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
                                <ChevronLeft className="h-5 w-5 text-blue-700" />
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
                                <ChevronRight className="h-5 w-5 text-blue-700" />
                            </button>
                        </div>

                        {filteredFlights.length > 0 ? (
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
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={<PlaneIcon className="h-12 w-12 text-gray-400" />}
                                title="Aucun vol disponible"
                                description="Aucun vol ne correspond à vos critères pour cette date."
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
                            prefix="Return Flight"
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
                                        <ChevronLeft className="h-5 w-5 text-blue-700" />
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
                                        <ChevronRight className="h-5 w-5 text-blue-700" />
                                    </button>
                                </div>

                                {filteredReturnFlights.length > 0 ? (
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
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<PlaneIcon className="h-12 w-12 text-gray-400" />}
                                        title="Aucun vol de retour disponible"
                                        description="Aucun vol ne correspond à vos critères pour cette date de retour."
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
                                            calculateTotalPrice(booking.outbound!) + (booking.return ? calculateTotalPrice(booking.return) : 0),
                                    };

                                    // Navigation vers la page des passagers avec les données de réservation
                                    navigate("/passenger", {
                                        state: bookingData,
                                    });
                                }}
                                className="mt-6 w-48 rounded-full bg-red-500 py-3 font-semibold text-white hover:bg-red-600"
                            >
                                Continue to Passenger
                            </button>
                        </div>
                    )}
            </div>
        </div>
    );
}
