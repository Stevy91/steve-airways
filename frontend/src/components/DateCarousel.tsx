"use client";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

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
    date: string; // ✅ déjà en yyyy-MM-dd
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
    flightType?: "plane" | "helicopter";
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
    flightType = "plane",
}: DateCarouselProps) {
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const { t } = useTranslation();

    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") || "plane";

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
            container.scrollTo({ left: targetScroll, behavior: "smooth" });
        }, 50);

        return () => clearTimeout(timer);
    }, [selectedDateIndex]);

    const handleDateClick = (globalIndex: number, formattedDate: string) => {
        if (!allDates[globalIndex].hasFlight) return;

        // ✅ garder la date comme string yyyy-MM-dd
        const selectedDate = formattedDate;

        // Vérif retour
        if (isReturnDateCarousel) {
            if (selectedDate < date) {
                toast.error(`${t("The return date cannot be earlier than the departure date.")}`);
                return;
            }
        } else {
            if (returnDate && selectedDate > returnDate) {
                toast.error(`${t("The departure date cannot be later than the return date.")}`);
                return;
            }
        }

        setSelectedDateIndex(globalIndex);

        const currentSearchParams = new URLSearchParams(location.search);
        const params = new URLSearchParams();

        params.append("from", currentSearchParams.get("from") || from);
        params.append("to", currentSearchParams.get("to") || to);
        params.append("tab", currentSearchParams.get("tab") || flightType);

        if (isReturnDateCarousel) {
            params.append("date", currentSearchParams.get("date") || date);
            params.append("return_date", selectedDate);
        } else {
            params.append("date", selectedDate);
            const currentReturnDate = currentSearchParams.get("return_date");
            if (currentReturnDate || returnDate) {
                params.append("return_date", currentReturnDate || returnDate);
            }
        }

        params.append("adults", currentSearchParams.get("adults") || passengers.adult.toString());
        params.append("children", currentSearchParams.get("children") || passengers.child.toString());
        params.append("infants", currentSearchParams.get("infants") || passengers.infant.toString());
        params.append("trip_type", currentSearchParams.get("trip_type") || tripType);

        navigate(`/${currentLang}/flights?${params.toString()}`);
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
                    <div className="flex-1" key={`${label}-${formattedDate}`}>
                        <div
                            ref={(el) => {
                                itemRefs.current[globalIndex] = el ?? null;
                            }}
                            onClick={() => d.hasFlight && handleDateClick(globalIndex, formattedDate)}
                            className={`flex min-w-[80px] flex-col items-center whitespace-nowrap rounded px-3 text-sm transition-all ${
                                isSelected
                                    ? "border border-blue-900 bg-white font-semibold"
                                    : d.hasFlight
                                    ? "cursor-pointer font-bold text-black hover:bg-gray-100"
                                    : "cursor-not-allowed font-bold text-gray-400 opacity-50"
                            }`}
                            style={{ scrollSnapAlign: "center" }}
                        >
                            <span>{format(d.date, "EEE MMM dd")}</span>
                            <span className={d.hasFlight ? "" : "p-0 text-gray-400"}>
                                {d.hasFlight ? (
                                    <div className="pt-4">${d.price}</div>
                                ) : tab === "plane" ? (
                                    <img className="w-[55px]" src="/assets/no-flight-icon1.svg" alt="No flight" />
                                ) : (
                                    <img className="w-[40px]" src="/assets/no-helico-icon6.svg" alt="No helicopter" />
                                )}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
