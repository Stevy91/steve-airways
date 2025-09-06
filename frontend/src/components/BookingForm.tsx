"use client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {parse, format } from "date-fns";
import { UserIcon, PlaneIcon, CalendarIcon, MapPinIcon, ChevronDown } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import { Icon } from "@iconify/react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Location = {
    id: number;
    name: string;
    code: string;
    city: string;
    country?: string;
};
interface BookingFormProps {
    onSearch: (flights: any[]) => void;
}

export default function BookingForm({ onSearch }: BookingFormProps) {
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang

    const navigate = useNavigate();
    const params = new URLSearchParams();
    const [selectedTab, setSelectedTab] = useState("plane");
    const [selectedTabTrip, setSelectedTabTrip] = useState("onway");
    const [passengerDropdownOpen, setPassengerDropdownOpen] = useState(false);
    const [passengers, setPassengers] = useState({ adult: 1, child: 0, infant: 0 });

    const [locations, setLocations] = useState<Location[]>([]);

    const [selectedDeparture, setSelectedDeparture] = useState("");
    const [selectedDestination, setSelectedDestination] = useState("");
    const [selectedDate, setSelectedDate] = useState<string>("");

    const { t, i18n } = useTranslation();
    const [selectedDeparture2, setSelectedDeparture2] = useState("");
    const [selectedDestination2, setSelectedDestination2] = useState("");
    const [selectedDate2, setSelectedDate2] = useState("");
    const [selectedDateReturn, setSelectedDateReturn] = useState("");
    const [loadingLocations, setLoadingLocations] = useState(true);

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
    /* helper : transforme "yyyy-MM-dd" -> Date locale (00:00 local) */
const parseLocalDate = (isoDayString?: string | null) => {
  if (!isoDayString) return null;
  // normalise "2025-09-06", ou "2025-09-06T00:00:00", etc.
  const day = isoDayString.split("T")[0]; 
  return parse(day, "yyyy-MM-dd", new Date()); // crée Date en local
};

    const getFilteredDestinations = () => {
        const departureCode = selectedTabTrip === "onway" ? selectedDeparture : selectedDeparture2;
        return locations.filter((location) => location.code !== departureCode);
    };

    useEffect(() => {
        if (selectedTabTrip === "onway") {
            if (selectedDeparture && selectedDestination === selectedDeparture) {
                setSelectedDestination("");
            }
        } else {
            if (selectedDeparture2 && selectedDestination2 === selectedDeparture2) {
                setSelectedDestination2("");
            }
        }
    }, [selectedDeparture, selectedDeparture2, selectedDestination, selectedDestination2, selectedTabTrip]);

    const validateFields = () => {
        let isValid = true;
        const newErrors = {
            departure: "",
            destination: "",
            date: "",
            departure2: "",
            destination2: "",
            date2: "",
            returnDate: "",
        };

        if (selectedTabTrip === "onway") {
            if (!selectedDeparture) {
                newErrors.departure = t("Please select a departure");
                isValid = false;
            }
            if (!selectedDestination) {
                newErrors.destination = t("Please select a destination");
                isValid = false;
            }
            if (!selectedDate) {
                newErrors.date = t("Please select a date");
                isValid = false;
            }
        } else {
            if (!selectedDeparture2) {
                newErrors.departure2 = t("Please select a departure");
                isValid = false;
            }
            if (!selectedDestination2) {
                newErrors.destination2 = t("Please select a destination");
                isValid = false;
            }
            if (!selectedDate2) {
                newErrors.date2 = t("Please select a departure date");
                isValid = false;
            }
            if (!selectedDateReturn) {
                newErrors.returnDate = t("Please select a return date");
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSearch = async () => {
        try {
            if (!validateFields()) {
                return;
            }

            const departure = selectedTabTrip === "onway" ? selectedDeparture : selectedDeparture2;
            const destination = selectedTabTrip === "onway" ? selectedDestination : selectedDestination2;
            const date = selectedTabTrip === "onway" ? selectedDate : selectedDate2;

            const params = new URLSearchParams();
            params.append("from", departure);
            params.append("to", destination);
            params.append("date", date);
            params.append("tab", selectedTab);

            params.append("adults", passengers.adult.toString());
            params.append("children", passengers.child.toString());
            params.append("infants", passengers.infant.toString());

            params.append("trip_type", selectedTabTrip === "roundtrip" ? "roundtrip" : "oneway");

            if (selectedTabTrip === "roundtrip" && selectedDateReturn) {
                params.append("return_date", selectedDateReturn);
            }

            const response = await fetch(`https://steve-airways-production.up.railway.app/api/flights?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || `Erreur API: ${response.statusText}`);
            }

            const flights = await response.json();
            onSearch(flights);

            navigate(`/${currentLang}/flights?${params.toString()}`, {
                state: {
                    flights,
                    searchParams: {
                        passengers,
                        tripType: selectedTabTrip,
                        tabType: selectedTab,
                        departure,
                        destination,
                        date,
                        ...(selectedTabTrip === "roundtrip" && {
                            returnDate: selectedDateReturn,
                        }),
                    },
                },
            });
        } catch (error) {
            alert(`Erreur: 's'`);
        }
    };

    // Charger les locations au montage
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoadingLocations(true);
                const res = await fetch(`https://steve-airways-production.up.railway.app/api/locations`);
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

    const updatePassengerPlane = (type: string, delta: number) => {
        setPassengers((prev) => {
            const currentValue = prev[type as keyof typeof prev];
            let newValue = currentValue + delta;

            if (type === "adult") {
                newValue = Math.max(1, Math.min(newValue, 12));
            } else if (type === "child") {
                newValue = Math.max(0, Math.min(newValue, 12));
            } else if (type === "infant") {
                newValue = Math.max(0, Math.min(newValue, 2));
            }

            if (type === "adult" && newValue < 1) return prev;

            return { ...prev, [type]: newValue };
        });
    };

    const updatePassengerHelico = (type: string, delta: number) => {
        setPassengers((prev) => {
            const currentValue = prev[type as keyof typeof prev];
            let newValue = currentValue + delta;

            if (type === "adult") {
                newValue = Math.max(1, Math.min(newValue, 6));
            } else if (type === "child") {
                newValue = Math.max(0, Math.min(newValue, 6));
            } else if (type === "infant") {
                newValue = Math.max(0, Math.min(newValue, 1));
            }

            if (type === "adult" && newValue < 1) return prev;

            return { ...prev, [type]: newValue };
        });
    };

    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setPassengerDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative -mt-32 mb-10 px-4 md:px-10">
            <div className="relative mx-auto max-w-6xl rounded-bl-3xl rounded-br-3xl rounded-tr-3xl bg-blue-400 bg-opacity-40 p-4 shadow-xl">
                <div className="absolute left-0 top-[-40px] z-[40] flex w-fit space-x-2 bg-blue-400 bg-opacity-40 shadow-md">
                    <button
                        onClick={() => setSelectedTab("plane")}
                        className={`flex cursor-pointer items-center px-4 py-2 font-medium text-white hover:cursor-pointer focus:outline-none ${
                            selectedTab === "plane" ? "bg-red-600 bg-opacity-70" : ""
                        }`}
                        type="button"
                    >
                        <PlaneIcon className="mr-2 h-4 w-4" /> {t("Air Plane")}
                    </button>
                    <button
                        onClick={() => setSelectedTab("helicopter")}
                        className={`flex cursor-pointer items-center px-4 py-2 font-medium text-white hover:cursor-pointer focus:outline-none ${
                            selectedTab === "helicopter" ? "bg-red-600 bg-opacity-70" : ""
                        }`}
                        type="button"
                    >
                        <Icon
                            icon="mdi:helicopter"
                            className="mr-2 h-4 w-4"
                        />
                        {t("Helicopter")}
                    </button>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-xl md:p-10">
                    {selectedTab === "plane" ? (
                        <>
                            <form
                                className="relative"
                                onSubmit={(e) => e.preventDefault()}
                            >
                                <div className="sm:md-6 absolute z-[40] flex flex-wrap items-center justify-between gap-4">
                                    <div className="mt-[-250px] flex w-fit space-x-2 rounded-full bg-gray-200 p-1 md:mt-[-130px]">
                                        <button
                                            onClick={() => setSelectedTabTrip("onway")}
                                            className={`flex cursor-pointer items-center rounded-full px-4 py-2 font-medium ${
                                                selectedTabTrip === "onway" ? "bg-white font-extrabold text-blue-500" : ""
                                            }`}
                                            type="button"
                                        >
                                            {t("One way")}
                                        </button>
                                        <button
                                            onClick={() => setSelectedTabTrip("roundtrip")}
                                            className={`flex cursor-pointer items-center rounded-full px-4 py-2 font-medium ${
                                                selectedTabTrip === "roundtrip" ? "bg-white font-extrabold text-blue-500" : ""
                                            }`}
                                            type="button"
                                        >
                                            {t("Round Trip")}
                                        </button>
                                    </div>
                                    <div className="mt-[-150px] flex cursor-pointer items-center rounded-full bg-gray-200 px-4 py-2 font-bold text-blue-800 md:mt-[-130px]">
                                        <div
                                            className="relative"
                                            ref={dropdownRef}
                                        >
                                            <div
                                                className="flex cursor-pointer items-center py-2"
                                                onClick={() => setPassengerDropdownOpen(!passengerDropdownOpen)}
                                            >
                                                <UserIcon className="mr-2 h-4 w-4 text-blue-500" />
                                                <span className="text-sm text-blue-500">
                                                    {passengers.adult + passengers.child + passengers.infant} {t("Traveler")}
                                                    {passengers.adult + passengers.child + passengers.infant > 1 ? "s" : ""}
                                                </span>
                                                <ChevronDown className="ml-2 h-4 w-4 text-blue-500" />
                                            </div>
                                            {passengerDropdownOpen && (
                                                <div className="absolute z-50 mt-2 w-64 rounded-lg bg-white p-4 shadow-lg">
                                                    {["adult", "child", "infant"].map((type) => (
                                                        <div
                                                            key={type}
                                                            className="mb-3 flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <div className="font-medium capitalize">
                                                                    {type} {type === "adult" ? "(12+ max)" : type === "child" ? "(0-12)" : "(0-2)"}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {type === "adult" ? t("Required") : t("Optional")}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    className={`rounded px-2 py-1 text-lg ${
                                                                        passengers[type as keyof typeof passengers] <= (type === "adult" ? 1 : 0)
                                                                            ? "bg-gray-100 text-gray-400"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                    type="button"
                                                                    onClick={() => updatePassengerPlane(type, -1)}
                                                                    disabled={
                                                                        passengers[type as keyof typeof passengers] <= (type === "adult" ? 1 : 0)
                                                                    }
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-4 text-center">{passengers[type as keyof typeof passengers]}</span>
                                                                <button
                                                                    className={`rounded px-2 py-1 text-lg ${
                                                                        passengers[type as keyof typeof passengers] >=
                                                                        (type === "adult" ? 12 : type === "child" ? 12 : 2)
                                                                            ? "bg-gray-100 text-gray-400"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                    type="button"
                                                                    onClick={() => updatePassengerPlane(type, 1)}
                                                                    disabled={
                                                                        passengers[type as keyof typeof passengers] >=
                                                                        (type === "adult" ? 12 : type === "child" ? 12 : 2)
                                                                    }
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedTabTrip === "onway" ? (
                                    <div className="mb-6 mt-40 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-20 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("From")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    value={selectedDeparture}
                                                    onChange={(e) => {
                                                        setSelectedDeparture(e.target.value);
                                                        setErrors({ ...errors, departure: "" });
                                                    }}
                                                    id="from"
                                                    className="w-full bg-transparent outline-none"
                                                    disabled={loadingLocations} // Désactive pendant chargement
                                                    defaultValue=""
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        {t("Select Departure")}
                                                    </option>
                                                    {!loadingLocations &&
                                                        locations.map((loc) => (
                                                            <option
                                                                key={loc.id}
                                                                value={loc.code}
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
                                            {errors.departure && <p className="mt-1 text-xs text-red-500">{errors.departure}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("To")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    value={selectedDestination}
                                                    onChange={(e) => {
                                                        setSelectedDestination(e.target.value);
                                                        setErrors({ ...errors, destination: "" });
                                                    }}
                                                    id="to"
                                                    className="w-full bg-transparent outline-none"
                                                    disabled={loadingLocations} // Désactive pendant chargement
                                                    defaultValue=""
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        {t("Select Destination")}
                                                    </option>
                                                    {!loadingLocations &&
                                                        getFilteredDestinations().map((loc) => (
                                                            <option
                                                                key={loc.id}
                                                                value={loc.code}
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
                                            {errors.destination && <p className="mt-1 text-xs text-red-500">{errors.destination}</p>}
                                        </div>
                                        <div className="relative">
                                            <label className="mb-1 block font-medium text-gray-600">Date</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />

                                              
                                                <DatePicker
                                                    selected={selectedDate ? parseLocalDate(selectedDate) : null}
                                                    onChange={(date: Date | null) => {
                                                        // format en 'yyyy-MM-dd' en utilisant la date locale (PAS toISOString)
                                                        setSelectedDate(date ? format(date, "yyyy-MM-dd") : "");
                                                    }}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM do, yyyy"
                                                    className="w-full bg-transparent outline-none"
                                                    placeholderText={format(new Date(), "MMMM do, yyyy")}
                                                    id="date"
                                                    autoComplete="off"
                                                />
                                            </div>

                                            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 mt-40 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-20 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("From")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    id="from"
                                                    value={selectedDeparture2}
                                                    onChange={(e) => {
                                                        setSelectedDeparture2(e.target.value);
                                                        setErrors({ ...errors, departure2: "" });
                                                    }}
                                                    className="w-full bg-transparent outline-none"
                                                    disabled={loadingLocations} // Désactive pendant chargement
                                                    defaultValue=""
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        {t("Select Departure")}
                                                    </option>
                                                    {!loadingLocations &&
                                                        locations.map((loc) => (
                                                            <option
                                                                key={loc.id}
                                                                value={loc.code}
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
                                            {errors.departure2 && <p className="mt-1 text-xs text-red-500">{errors.departure2}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("To")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    id="to"
                                                    value={selectedDestination2}
                                                    onChange={(e) => {
                                                        setSelectedDestination2(e.target.value);
                                                        setErrors({ ...errors, destination2: "" });
                                                    }}
                                                    className="w-full bg-transparent outline-none"
                                                    disabled={loadingLocations} // Désactive pendant chargement
                                                    defaultValue=""
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        {t("Select Destination")}
                                                    </option>
                                                    {!loadingLocations &&
                                                        getFilteredDestinations().map((loc) => (
                                                            <option
                                                                key={loc.id}
                                                                value={loc.code}
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
                                            {errors.destination2 && <p className="mt-1 text-xs text-red-500">{errors.destination2}</p>}
                                        </div>
                                        <div className="relative">
                                            <label className="mb-1 block font-medium text-gray-600">{t("Departure Date")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />

                                               
                                                <DatePicker
                                                    selected={selectedDate2 ? parseLocalDate(selectedDate2) : null}
                                                    onChange={(date: Date | null) => {
                                                        // format en 'yyyy-MM-dd' en utilisant la date locale (PAS toISOString)
                                                        setSelectedDate2(date ? format(date, "yyyy-MM-dd") : "");
                                                    }}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM do, yyyy"
                                                    className="w-full bg-transparent outline-none"
                                                    placeholderText={format(new Date(), "MMMM do, yyyy")}
                                                    id="departure-date"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            {errors.date2 && <p className="mt-1 text-xs text-red-500">{errors.date2}</p>}
                                        </div>
                                        <div className="relative">
                                            <label className="mb-1 block font-medium text-gray-600">{t("Return Date")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />

                                              

                                                <DatePicker
                                                    selected={selectedDateReturn ? parseLocalDate(selectedDateReturn) : null}
                                                    onChange={(date: Date | null) => {
                                                        // format en 'yyyy-MM-dd' en utilisant la date locale (PAS toISOString)
                                                        setSelectedDateReturn(date ? format(date, "yyyy-MM-dd") : "");
                                                    }}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM do, yyyy"
                                                    className="w-full bg-transparent outline-none"
                                                    placeholderText={format(new Date(), "MMMM do, yyyy")}
                                                    id="return-date"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            {errors.returnDate && <p className="mt-1 text-xs text-red-500">{errors.returnDate}</p>}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSearch}
                                    type="submit"
                                    className="mt-6 w-48 rounded-full bg-red-500 py-3 font-semibold text-white hover:bg-red-600"
                                >
                                    {t("Search Flight")}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <form
                                className="relative"
                                onSubmit={(e) => e.preventDefault()}
                            >
                                <div className="sm:md-6 absolute z-[40] flex flex-wrap items-center justify-between gap-4">
                                    <div className="mt-[-250px] flex w-fit space-x-2 rounded-full bg-gray-200 p-1 md:mt-[-130px]">
                                        <button
                                            onClick={() => setSelectedTabTrip("onway")}
                                            className={`flex cursor-pointer items-center rounded-full px-4 py-2 font-medium ${
                                                selectedTabTrip === "onway" ? "bg-white font-extrabold text-blue-500" : ""
                                            }`}
                                            type="button"
                                        >
                                            {t("One way")}
                                        </button>
                                        <button
                                            onClick={() => setSelectedTabTrip("roundtrip")}
                                            className={`flex cursor-pointer items-center rounded-full px-4 py-2 font-medium ${
                                                selectedTabTrip === "roundtrip" ? "bg-white font-extrabold text-blue-500" : ""
                                            }`}
                                            type="button"
                                        >
                                            {t("Round Trip")}
                                        </button>
                                    </div>
                                    <div className="mt-[-150px] flex cursor-pointer items-center rounded-full bg-gray-200 px-4 py-2 font-bold text-blue-800 md:mt-[-130px]">
                                        <div
                                            className="relative"
                                            ref={dropdownRef}
                                        >
                                            <div
                                                className="flex cursor-pointer items-center py-2"
                                                onClick={() => setPassengerDropdownOpen(!passengerDropdownOpen)}
                                            >
                                                <UserIcon className="mr-2 h-4 w-4 text-blue-500" />
                                                <span className="text-sm text-blue-500">
                                                    {passengers.adult + passengers.child + passengers.infant} {t("Traveler")}
                                                    {passengers.adult + passengers.child + passengers.infant > 1 ? "s" : ""}
                                                </span>
                                                <ChevronDown className="ml-2 h-4 w-4 text-blue-500" />
                                            </div>
                                            {passengerDropdownOpen && (
                                                <div className="absolute z-50 mt-2 w-64 rounded-lg bg-white p-4 shadow-lg">
                                                    {["adult", "child", "infant"].map((type) => (
                                                        <div
                                                            key={type}
                                                            className="mb-3 flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <div className="font-medium capitalize">
                                                                    {type} {type === "adult" ? "(6+ max)" : type === "child" ? "(0-6)" : "(0-2)"}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {type === "adult" ? t("Required") : t("Optional")}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    className={`rounded px-2 py-1 text-lg ${
                                                                        passengers[type as keyof typeof passengers] <= (type === "adult" ? 1 : 0)
                                                                            ? "bg-gray-100 text-gray-400"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                    type="button"
                                                                    onClick={() => updatePassengerPlane(type, -1)}
                                                                    disabled={
                                                                        passengers[type as keyof typeof passengers] <= (type === "adult" ? 1 : 0)
                                                                    }
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-4 text-center">{passengers[type as keyof typeof passengers]}</span>
                                                                <button
                                                                    className={`rounded px-2 py-1 text-lg ${
                                                                        passengers[type as keyof typeof passengers] >=
                                                                        (type === "adult" ? 6 : type === "child" ? 6 : 2)
                                                                            ? "bg-gray-100 text-gray-400"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                    type="button"
                                                                    onClick={() => updatePassengerPlane(type, 1)}
                                                                    disabled={
                                                                        passengers[type as keyof typeof passengers] >=
                                                                        (type === "adult" ? 6 : type === "child" ? 6 : 2)
                                                                    }
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedTabTrip === "onway" ? (
                                    <div className="mb-6 mt-40 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-20 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("From")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    value={selectedDeparture}
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
                                                        {t("Select Departure")}
                                                    </option>
                                                    {locations.map((loc) => (
                                                        <option
                                                            key={loc.id}
                                                            value={loc.code}
                                                        >
                                                            {loc.city} ({loc.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.departure && <p className="mt-1 text-xs text-red-500">{errors.departure}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("To")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    value={selectedDestination}
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
                                                        {t("Select Destination")}
                                                    </option>
                                                    {getFilteredDestinations().map((loc) => (
                                                        <option
                                                            key={loc.id}
                                                            value={loc.code}
                                                        >
                                                            {loc.city} ({loc.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.destination && <p className="mt-1 text-xs text-red-500">{errors.destination}</p>}
                                        </div>
                                        <div className="relative">
                                            <label className="mb-1 block font-medium text-gray-600">Date</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />


                                                 <DatePicker
                                                    selected={selectedDate ? parseLocalDate(selectedDate) : null}
                                                    onChange={(date: Date | null) => {
                                                        // format en 'yyyy-MM-dd' en utilisant la date locale (PAS toISOString)
                                                        setSelectedDate(date ? format(date, "yyyy-MM-dd") : "");
                                                    }}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM do, yyyy"
                                                    className="w-full bg-transparent outline-none"
                                                    placeholderText={format(new Date(), "MMMM do, yyyy")}
                                                    id="date"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 mt-40 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-20 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("From")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    id="from"
                                                    value={selectedDeparture2}
                                                    onChange={(e) => {
                                                        setSelectedDeparture2(e.target.value);
                                                        setErrors({ ...errors, departure2: "" });
                                                    }}
                                                    className="w-full bg-transparent outline-none"
                                                    defaultValue=""
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        {t("Select Departure")}
                                                    </option>
                                                    {locations.map((loc) => (
                                                        <option
                                                            key={loc.id}
                                                            value={loc.code}
                                                        >
                                                            {loc.city} ({loc.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.departure2 && <p className="mt-1 text-xs text-red-500">{errors.departure2}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-medium text-gray-600">{t("To")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-red-500" />
                                                <select
                                                    id="to"
                                                    value={selectedDestination2}
                                                    onChange={(e) => {
                                                        setSelectedDestination2(e.target.value);
                                                        setErrors({ ...errors, destination2: "" });
                                                    }}
                                                    className="w-full bg-transparent outline-none"
                                                    defaultValue=""
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                    >
                                                        {t("Select Destination")}
                                                    </option>
                                                    {getFilteredDestinations().map((loc) => (
                                                        <option
                                                            key={loc.id}
                                                            value={loc.code}
                                                        >
                                                            {loc.city} ({loc.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.destination2 && <p className="mt-1 text-xs text-red-500">{errors.destination2}</p>}
                                        </div>
                                        <div className="relative">
                                            <label className="mb-1 block font-medium text-gray-600">{t("Departure Date")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />

                                                
                                                 <DatePicker
                                                    selected={selectedDate2 ? parseLocalDate(selectedDate2) : null}
                                                    onChange={(date: Date | null) => {
                                                        // format en 'yyyy-MM-dd' en utilisant la date locale (PAS toISOString)
                                                        setSelectedDate2(date ? format(date, "yyyy-MM-dd") : "");
                                                    }}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM do, yyyy"
                                                    className="w-full bg-transparent outline-none"
                                                    placeholderText={format(new Date(), "MMMM do, yyyy")}
                                                    id="departure-date"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            {errors.date2 && <p className="mt-1 text-xs text-red-500">{errors.date2}</p>}
                                        </div>
                                        <div className="relative">
                                            <label className="mb-1 block font-medium text-gray-600">{t("Return Date")}</label>
                                            <div className="flex items-center rounded-full border p-2">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />

                                                
                                                <DatePicker
                                                    selected={selectedDateReturn ? parseLocalDate(selectedDateReturn) : null}
                                                    onChange={(date: Date | null) => {
                                                        // format en 'yyyy-MM-dd' en utilisant la date locale (PAS toISOString)
                                                        setSelectedDateReturn(date ? format(date, "yyyy-MM-dd") : "");
                                                    }}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM do, yyyy"
                                                    className="w-full bg-transparent outline-none"
                                                    placeholderText={format(new Date(), "MMMM do, yyyy")}
                                                    id="return-date"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            {errors.returnDate && <p className="mt-1 text-xs text-red-500">{errors.returnDate}</p>}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSearch}
                                    type="submit"
                                    className="mt-6 w-60 rounded-full bg-red-500 py-3 font-semibold text-white hover:bg-red-600"
                                >
                                    {t("Search Flight Helicopter")}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
