"use client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { NoFlightIcon } from "./icons/AvionTracer";
import { useEffect, useRef } from "react";

type DateCarouselProps = {
    allDates: {
        date: Date;
        price: number | null;
        hasFlight: boolean;
        hasAnyFlight: boolean;
    }[];
    selectedDateIndex: number;
    setSelectedDateIndex: (idx: number) => void;
    startIndex: number;
    visibleCount: number;
    from: string;
    to: string;
    date: string;
    passengers: {
        adult: number;
        child: number;
        infant: number;
    };
    tripType: string;
    tabType: string;
    label?: string;
    isReturnDateCarousel?: boolean;
    returnDate?: string;
    flightType?: "plane" | "helicopter"; // Nouvelle prop pour le type de vol
};

export default function DateCarousel({
    allDates,
    selectedDateIndex,
    setSelectedDateIndex,
    startIndex,
    visibleCount,
    from,
    to,
    date,
    passengers,
    tripType,
    label = "",
    isReturnDateCarousel = false,
    returnDate = "",
    flightType = "plane", // Valeur par défaut
}: DateCarouselProps) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, allDates.length);
    }, [allDates]);

    useEffect(() => {
        if (!containerRef.current || selectedDateIndex === -1) return;

        const timer = setTimeout(() => {
            const container = containerRef.current;
            const selectedItem = itemRefs.current[selectedDateIndex];

            if (!container || !selectedItem) return;

            const containerWidth = container.offsetWidth;
            const itemOffset = selectedItem.offsetLeft;
            const itemWidth = selectedItem.offsetWidth;

            const targetScroll = itemOffset - containerWidth / 2 + itemWidth / 2;

            container.scrollTo({
                left: targetScroll,
                behavior: "smooth",
            });
        }, 50);

        return () => clearTimeout(timer);
    }, [selectedDateIndex]);

    const handleDateClick = (globalIndex: number, formattedDate: string) => {
        if (!allDates[globalIndex].hasFlight) return; // Empêcher le clic si pas de vol disponible

        setSelectedDateIndex(globalIndex);

        const currentSearchParams = new URLSearchParams(window.location.search);
        const params = new URLSearchParams();

        params.append("from", currentSearchParams.get("from") || from);
        params.append("to", currentSearchParams.get("to") || to);
        params.append("tab", currentSearchParams.get("tab") || flightType); // Conserver le type de vol

        if (isReturnDateCarousel) {
            // Pour le retour, garder la date de départ existante
            params.append("date", currentSearchParams.get("date") || date);
            params.append("return_date", formattedDate);
        } else {
            // Pour l'aller, mettre à jour la date de départ et garder le retour existant
            params.append("date", formattedDate);
            const currentReturnDate = currentSearchParams.get("return_date");
            if (currentReturnDate || returnDate) {
                params.append("return_date", currentReturnDate || returnDate);
            }
        }

        // Conserver les autres paramètres
        params.append("adults", currentSearchParams.get("adults") || passengers.adult.toString());
        params.append("children", currentSearchParams.get("children") || passengers.child.toString());
        params.append("infants", currentSearchParams.get("infants") || passengers.infant.toString());
        params.append("trip_type", currentSearchParams.get("trip_type") || tripType);

        navigate(`/flights?${params.toString()}`);
    };

    return (
        <div
            ref={containerRef}
            className="no-scrollbar flex w-full justify-between gap-1 overflow-x-auto scroll-smooth"
            style={{ scrollSnapType: "x mandatory" }}
        >
            {allDates.slice(startIndex, startIndex + visibleCount).map((d, i) => {
                const globalIndex = startIndex + i;
                const isSelected = globalIndex === selectedDateIndex;
              
                const formattedDate = format(d.date, "yyyy-MM-dd");

                return (
                    <div
                        className="flex-1"
                        key={`${label}-${formattedDate}`}
                    >
                        <div
                            ref={(el) => {
                                itemRefs.current[globalIndex] = el;
                            }}
                            onClick={() => {
                                if (d.hasFlight) {
                                    // Ne permettre le clic que si hasFlight est true
                                    handleDateClick(globalIndex, formattedDate);
                                }
                            }}
                            className={`flex min-w-[80px] flex-col items-center whitespace-nowrap rounded px-3 py-2 text-sm transition-all ${
                                isSelected
                                    ? "border border-blue-600 bg-white font-semibold"
                                    : d.hasFlight
                                      ? "cursor-pointer font-bold text-black hover:bg-gray-100"
                                      : "cursor-not-allowed font-bold text-gray-400 opacity-50" // Style modifié pour les dates non disponibles
                            }`}
                            style={{ scrollSnapAlign: "center" }}
                        >
                            <span>{format(d.date, "EEE MMM d")}</span>
                            <span className={d.hasFlight ? "" : "p-0 text-gray-400"}>
                                {d.hasFlight ? (
                                    `$${d.price}`
                                ) : (
                                    <NoFlightIcon
                                        size={20}
                                        color="#9ca3af"
                                    />
                                )}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
