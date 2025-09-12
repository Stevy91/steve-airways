import { format, isBefore, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function CalendarModal({
    allDates,
    allReturnDates,
    selectedDateIndex,
    selectedReturnDateIndex,
    handleDateSelect,
    handleReturnDateSelect,
    fromParam,
    toParam,
    selectedTabTrip,
    onClose,
    searchParams,
    navigate,
    currentLang,
}: {
    allDates: any[];
    allReturnDates: any[];
    selectedDateIndex: number;
    selectedReturnDateIndex: number;
    handleDateSelect: (index: number) => void;
    handleReturnDateSelect: (index: number) => void;
    fromParam: string | null;
    toParam: string | null;
    selectedTabTrip: string;
    onClose: () => void;
    searchParams: URLSearchParams;
    navigate: any;
    currentLang: string;
}) {
    const { t } = useTranslation();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [tempSelectedDateIndex, setTempSelectedDateIndex] = useState(-1);
    const [tempSelectedReturnDateIndex, setTempSelectedReturnDateIndex] = useState(-1);
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
    const [returnMonthOffset, setReturnMonthOffset] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    // Générer les jours du mois courant avec décalage
    const generateMonthDays = (baseDates: any[], monthOffset: number) => {
        const today = new Date();
        const targetMonth = addMonths(today, monthOffset);
        const monthStart = startOfMonth(targetMonth);
        const monthEnd = endOfMonth(targetMonth);

        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        return daysInMonth.map((date) => {
            const isoDate = format(date, "yyyy-MM-dd");
            const matchingDate = baseDates.find((d) => format(d.date, "yyyy-MM-dd") === isoDate);

            return {
                date,
                price: matchingDate?.price || null,
                hasFlight: matchingDate?.hasFlight || false,
                hasAnyFlight: matchingDate?.hasAnyFlight || false,
                isCurrentMonth: isSameMonth(date, targetMonth),
            };
        });
    };

    const departureMonthDays = useMemo(() => generateMonthDays(allDates, currentMonthOffset), [allDates, currentMonthOffset]);

    const returnMonthDays = useMemo(() => generateMonthDays(allReturnDates, returnMonthOffset), [allReturnDates, returnMonthOffset]);

    // Initialiser les sélections avec les dates déjà choisies
    useEffect(() => {
        if (!isInitialized && allDates.length > 0 && departureMonthDays.length > 0) {
            let needsReRender = false;

            // Initialiser la date d'aller
            if (selectedDateIndex >= 0 && selectedDateIndex < allDates.length) {
                const selectedDate = allDates[selectedDateIndex]?.date;
                if (selectedDate) {
                    const indexInMonth = departureMonthDays.findIndex((day) => isSameDay(day.date, selectedDate));

                    if (indexInMonth !== -1) {
                        setTempSelectedDateIndex(indexInMonth);
                    } else {
                        // Si la date n'est pas dans le mois courant, ajuster le mois
                        const selectedMonth = selectedDate.getMonth();
                        const currentMonth = new Date().getMonth();
                        const monthDiff = selectedMonth - currentMonth;
                        setCurrentMonthOffset(monthDiff);
                        needsReRender = true;
                    }
                }
            }

            // Initialiser la date de retour (seulement pour aller-retour)
            if (
                selectedTabTrip === "roundtrip" &&
                allReturnDates.length > 0 &&
                selectedReturnDateIndex >= 0 &&
                selectedReturnDateIndex < allReturnDates.length
            ) {
                const selectedReturnDate = allReturnDates[selectedReturnDateIndex]?.date;
                if (selectedReturnDate) {
                    const indexInMonth = returnMonthDays.findIndex((day) => isSameDay(day.date, selectedReturnDate));

                    if (indexInMonth !== -1) {
                        setTempSelectedReturnDateIndex(indexInMonth);
                    } else {
                        // Si la date de retour n'est pas dans le mois courant, ajuster le mois
                        const selectedMonth = selectedReturnDate.getMonth();
                        const currentMonth = new Date().getMonth();
                        const monthDiff = selectedMonth - currentMonth;
                        setReturnMonthOffset(monthDiff);
                        needsReRender = true;
                    }
                }
            }

            if (!needsReRender) {
                setIsInitialized(true);
            }
        }
    }, [allDates, allReturnDates, selectedDateIndex, selectedReturnDateIndex, selectedTabTrip, departureMonthDays, returnMonthDays, isInitialized]);

    // Réinitialiser les sélections quand les mois changent
    useEffect(() => {
        if (isInitialized) {
            // Re-trouver les index des dates sélectionnées dans le nouveau mois
            if (allDates.length > 0 && selectedDateIndex >= 0 && selectedDateIndex < allDates.length) {
                const selectedDate = allDates[selectedDateIndex]?.date;
                if (selectedDate) {
                    const newIndex = departureMonthDays.findIndex((day) => isSameDay(day.date, selectedDate));
                    if (newIndex !== -1) {
                        setTempSelectedDateIndex(newIndex);
                    }
                }
            }

            if (
                selectedTabTrip === "roundtrip" &&
                allReturnDates.length > 0 &&
                selectedReturnDateIndex >= 0 &&
                selectedReturnDateIndex < allReturnDates.length
            ) {
                const selectedReturnDate = allReturnDates[selectedReturnDateIndex]?.date;
                if (selectedReturnDate) {
                    const newIndex = returnMonthDays.findIndex((day) => isSameDay(day.date, selectedReturnDate));
                    if (newIndex !== -1) {
                        setTempSelectedReturnDateIndex(newIndex);
                    }
                }
            }
        } else {
            // Si pas encore initialisé, vérifier si on peut initialiser maintenant
            if (departureMonthDays.length > 0 && returnMonthDays.length > 0) {
                let allGood = true;

                // Vérifier la date d'aller
                if (selectedDateIndex >= 0 && selectedDateIndex < allDates.length) {
                    const selectedDate = allDates[selectedDateIndex]?.date;
                    if (selectedDate) {
                        const indexInMonth = departureMonthDays.findIndex((day) => isSameDay(day.date, selectedDate));
                        if (indexInMonth !== -1) {
                            setTempSelectedDateIndex(indexInMonth);
                        } else {
                            allGood = false;
                        }
                    }
                }

                // Vérifier la date de retour
                if (selectedTabTrip === "roundtrip" && selectedReturnDateIndex >= 0 && selectedReturnDateIndex < allReturnDates.length) {
                    const selectedReturnDate = allReturnDates[selectedReturnDateIndex]?.date;
                    if (selectedReturnDate) {
                        const indexInMonth = returnMonthDays.findIndex((day) => isSameDay(day.date, selectedReturnDate));
                        if (indexInMonth !== -1) {
                            setTempSelectedReturnDateIndex(indexInMonth);
                        } else {
                            allGood = false;
                        }
                    }
                }

                if (allGood) {
                    setIsInitialized(true);
                }
            }
        }
    }, [departureMonthDays, returnMonthDays, isInitialized, allDates, allReturnDates, selectedDateIndex, selectedReturnDateIndex, selectedTabTrip]);

    // Vérifier si les dates sélectionnées sont valides
    const isValidSelection = useMemo(() => {
        if (tempSelectedDateIndex === -1) return false;

        const selectedDepartureDateObj = departureMonthDays[tempSelectedDateIndex];
        if (!selectedDepartureDateObj) return false;

        // Pour un aller simple, seule la date d'aller doit avoir un vol
        if (selectedTabTrip !== "roundtrip") {
            return selectedDepartureDateObj.hasFlight;
        }

        // Pour un aller-retour, vérifier la date de retour
        if (tempSelectedReturnDateIndex === -1) return false;

        const selectedReturnDateObj = returnMonthDays[tempSelectedReturnDateIndex];
        if (!selectedReturnDateObj) return false;

        const hasValidDeparture = selectedDepartureDateObj.hasFlight;
        const hasValidReturn = selectedReturnDateObj.hasFlight;
        const isReturnValid = !isBefore(selectedReturnDateObj.date, selectedDepartureDateObj.date);

        return hasValidDeparture && hasValidReturn && isReturnValid;
    }, [tempSelectedDateIndex, tempSelectedReturnDateIndex, departureMonthDays, returnMonthDays, selectedTabTrip]);

    const handleDepartureDateSelect = (index: number) => {
        const selectedDateObj = departureMonthDays[index];
        if (!selectedDateObj) return;

        if (selectedTabTrip === "roundtrip") {
            const selectedReturnDateObj = returnMonthDays[tempSelectedReturnDateIndex];

            if (selectedReturnDateObj && isBefore(selectedReturnDateObj.date, selectedDateObj.date)) {
                setErrorMessage(t("Return date cannot be before departure date"));

                // Trouver la première date de retour valide après ou égale à la date d'aller sélectionnée
                const firstValidReturnIndex = returnMonthDays.findIndex((d) => d.hasFlight && !isBefore(d.date, selectedDateObj.date));

                if (firstValidReturnIndex !== -1) {
                    setTempSelectedReturnDateIndex(firstValidReturnIndex);
                    setErrorMessage(null);
                } else {
                    setErrorMessage(t("No valid return date available after selected departure date"));
                }
            } else {
                setErrorMessage(null);
            }
        }

        setTempSelectedDateIndex(index);
    };

    const handleReturnDateSelectWithValidation = (index: number) => {
        const selectedDateObj = returnMonthDays[index];
        if (!selectedDateObj) return;

        const selectedDepartureDateObj = departureMonthDays[tempSelectedDateIndex];

        if (selectedDepartureDateObj && isBefore(selectedDateObj.date, selectedDepartureDateObj.date)) {
            setErrorMessage(t("Return date cannot be before departure date"));
            return;
        }

        setErrorMessage(null);
        setTempSelectedReturnDateIndex(index);
    };

    const applyDateSelection = () => {
        if (!isValidSelection) return;

        // Trouver les index correspondants dans les tableaux originaux
        const selectedDepartureDateObj = departureMonthDays[tempSelectedDateIndex];
        const departureIndex = allDates.findIndex((d) => isSameDay(d.date, selectedDepartureDateObj.date));

        if (departureIndex !== -1) {
            handleDateSelect(departureIndex);
        }

        if (selectedTabTrip === "roundtrip" && tempSelectedReturnDateIndex !== -1) {
            const selectedReturnDateObj = returnMonthDays[tempSelectedReturnDateIndex];
            const returnIndex = allReturnDates.findIndex((d) => isSameDay(d.date, selectedReturnDateObj.date));

            if (returnIndex !== -1) {
                handleReturnDateSelect(returnIndex);
            }
        }

        onClose();
    };

    const navigateMonth = (isDeparture: boolean, direction: "prev" | "next") => {
        if (isDeparture) {
            setCurrentMonthOffset((prev) => (direction === "prev" ? prev - 1 : prev + 1));
        } else {
            setReturnMonthOffset((prev) => (direction === "prev" ? prev - 1 : prev + 1));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold">{t("Select Dates")}</h3>
                    <button
                        onClick={onClose}
                        className="text-2xl text-gray-500 hover:text-gray-700"
                    >
                        &times;
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 flex items-center rounded-md border border-red-300 bg-red-100 p-3 text-red-900">
                        <AlertCircle className="mr-2 h-5 w-5" />
                        {errorMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Calendrier Aller */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-semibold text-blue-900">
                                {t("Depart Flight")}: {fromParam} → {toParam}
                            </h4>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => navigateMonth(true, "prev")}
                                    className="rounded p-1 hover:bg-gray-100"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm font-medium">{format(addMonths(new Date(), currentMonthOffset), "MMMM yyyy")}</span>
                                <button
                                    onClick={() => navigateMonth(true, "next")}
                                    className="rounded p-1 hover:bg-gray-100"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="mb-2 grid grid-cols-7 gap-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-xs font-semibold text-gray-600"
                                >
                                    {t(day.substring(0, 3))}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {departureMonthDays.map((dateObj, index) => {
                                const date = dateObj.date;
                                const day = format(date, "d");
                                const isSelected = index === tempSelectedDateIndex;
                                const hasFlight = dateObj.hasFlight;
                                const isCurrentMonth = dateObj.isCurrentMonth;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleDepartureDateSelect(index)}
                                        disabled={!hasFlight || !isCurrentMonth}
                                        className={`rounded p-2 text-center text-sm ${
                                            isSelected
                                                ? "bg-blue-900 text-white"
                                                : hasFlight && isCurrentMonth
                                                  ? "bg-gray-100 hover:bg-gray-200"
                                                  : "cursor-not-allowed bg-gray-50 text-gray-400"
                                        }`}
                                        title={!isCurrentMonth ? t("Not in current month") : ""}
                                    >
                                        <div>{day}</div>
                                        {hasFlight && isCurrentMonth && dateObj.price && (
                                            <div className="mt-1 text-xs font-semibold">${dateObj.price}</div>
                                        )}
                                        {!isCurrentMonth && <div className="mt-1 text-xs text-gray-400">-</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Calendrier Retour (seulement si roundtrip) */}
                    {selectedTabTrip === "roundtrip" && (
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold text-blue-900">
                                    {t("Return Flight")}: {toParam} → {fromParam}
                                </h4>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => navigateMonth(false, "prev")}
                                        className="rounded p-1 hover:bg-gray-100"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <span className="text-sm font-medium">{format(addMonths(new Date(), returnMonthOffset), "MMMM yyyy")}</span>
                                    <button
                                        onClick={() => navigateMonth(false, "next")}
                                        className="rounded p-1 hover:bg-gray-100"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mb-2 grid grid-cols-7 gap-2">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                    <div
                                        key={day}
                                        className="text-center text-xs font-semibold text-gray-600"
                                    >
                                        {t(day.substring(0, 3))}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {returnMonthDays.map((dateObj, index) => {
                                    const date = dateObj.date;
                                    const day = format(date, "d");
                                    const isSelected = index === tempSelectedReturnDateIndex;
                                    const hasFlight = dateObj.hasFlight;
                                    const isCurrentMonth = dateObj.isCurrentMonth;
                                    const selectedDepartureDateObj = departureMonthDays[tempSelectedDateIndex];
                                    const isBeforeDeparture = selectedDepartureDateObj && isBefore(date, selectedDepartureDateObj.date);

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleReturnDateSelectWithValidation(index)}
                                            disabled={!hasFlight || isBeforeDeparture || !isCurrentMonth}
                                            className={`rounded p-2 text-center text-sm ${
                                                isSelected
                                                    ? "bg-blue-900 text-white"
                                                    : hasFlight && !isBeforeDeparture && isCurrentMonth
                                                      ? "bg-gray-100 hover:bg-gray-200"
                                                      : "cursor-not-allowed bg-gray-50 text-gray-400"
                                            }`}
                                            title={
                                                isBeforeDeparture
                                                    ? t("Return date cannot be before departure date")
                                                    : !isCurrentMonth
                                                      ? t("Not in current month")
                                                      : ""
                                            }
                                        >
                                            <div>{day}</div>
                                            {hasFlight && !isBeforeDeparture && isCurrentMonth && dateObj.price && (
                                                <div className="mt-1 text-xs font-semibold">${dateObj.price}</div>
                                            )}
                                            {(!isCurrentMonth || isBeforeDeparture) && <div className="mt-1 text-xs text-gray-400">-</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                        {t("Cancel")}
                    </button>
                    <button
                        onClick={applyDateSelection}
                        disabled={!isValidSelection}
                        className={`rounded-md px-4 py-2 ${
                            isValidSelection ? "bg-red-900 text-white hover:bg-red-700" : "cursor-not-allowed bg-gray-300 text-gray-500"
                        }`}
                    >
                        {t("Apply Dates")}
                    </button>
                </div>

                {!isValidSelection && (
                    <div className="mt-4 flex items-center rounded-md border border-yellow-300 bg-yellow-100 p-2 text-sm text-yellow-700">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {selectedTabTrip === "roundtrip"
                            ? t(
                                  "Please select valid departure and return dates with available flights. Return date must be on or after departure date.",
                              )
                            : t("Please select a valid departure date with available flights")}
                    </div>
                )}
            </div>
        </div>
    );
}
