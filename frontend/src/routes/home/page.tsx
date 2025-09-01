"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import BookingForm from "../../components/BookingForm";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../../layouts/footer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

interface FlightOffer {
    departure: string;
    destination: string;
    price: string;
    image: string;
}

interface Hotel {
    name: string;
    location: string;
    image: string;
}

interface HelicopterCharter {
    image: string;
    departure: string;
    destination: string;
    price: string;
}

export default function HomePage() {
      const { lang } = useParams<{ lang: string }>();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(lang || "en");
    const [, setFlights] = useState<any[]>([]);
 

    const flightOffers: FlightOffer[] = [
        { departure: "Port-au-Prince", destination: "Cap-Haitien", price: "$189", image: "/assets/offers/flight.jpg" },
        { departure: "Port-au-Prince", destination: "Cayes", price: "$189", image: "/assets/offers/flight-1.jpg" },
        { departure: "Cayes", destination: "Cap-Haitien", price: "$199", image: "/assets/offers/flight-2.jpg" },
    ];

    const hotels: Hotel[] = [
        { name: "Satama", location: "Cap Haitien", image: "/assets/hotels/hotel-ch.jpg" },
        { name: "Villa Mimosa", location: "Cayes", image: "/assets/hotels/hotel-cayes.jpg" },
        { name: "Karibe", location: "Port-au-Prince", image: "/assets/hotels/hotel-ptp.jpg" },
    ];

    const helicopterCharters: HelicopterCharter[] = [
        {
            image: "/assets/offers/heli.jpg",
            departure: "Pétion-ville",
            destination: "Cap-Haitien",
            price: "$400 + tca",
        },
        {
            image: "/assets/offers/heli.jpg",
            departure: "Port-au-Prince",
            destination: "Cayes",
            price: "$500 + tca",
        },
        {
            image: "/assets/offers/heli.jpg",
            departure: "Port-au-Prince",
            destination: "Jacmel",
            price: "$250 + tca",
        },
    ];

    // Cette fonction sera appelée par BookingForm avec les résultats
    const handleSearch = (foundFlights: any[]) => {
        setFlights(foundFlights);
    };
    return (
        <>
            <div
                className="z-1 relative flex h-[500px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                <div className="px-4">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Let's Explore the World Together!")}</h1>
                    <p className="text-xl">{t("We fly to connect people.")}</p>
                </div>
            </div>
            <div className="font-sans">
                {/* Booking Form Section */}
                <BookingForm onSearch={handleSearch} />
            </div>

            {/* FEATURED FLIGHT OFFERS */}
            <section className="bg-white px-4 py-12 md:px-8">
                <h2 className="mb-8 text-center text-2xl font-bold text-blue-900 md:text-3xl">{t("Featured Flight Offers")}</h2>
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
                    {flightOffers.map((offer, index) => (
                        <div
                            key={index}
                            className="flex flex-col overflow-hidden rounded-lg bg-gray-100 shadow transition hover:shadow-lg"
                        >
                            <div className="relative">
                                <img
                                    src={offer.image}
                                    alt={offer.destination}
                                    className="h-48 w-full object-cover"
                                />
                                {/* Bouton en superposition sans fond sombre */}
                                <div className="absolute bottom-2 right-2">
                                    <Link
                                        to={`/${currentLang}/`}
                                        className="rounded bg-blue-900 px-3 py-1 text-sm text-white transition hover:bg-blue-700"
                                    >
                                        {/* {t('Book Now')} */}{t('Coming soon')}
                                    </Link>
                                </div>
                            </div>
                            <div className="flex-grow p-4">
                                <h3 className="text-lg font-semibold text-blue-900">
                                    {offer.departure} → {offer.destination}
                                </h3>
                                <h3 className="text-lg font-semibold text-blue-900">
                                    {offer.destination} → {offer.departure}
                                </h3>
                                {/*<p className="text-gray-700">{t('starting_at')} {offer.price}</p>*/}
                                <p className="mt-2 text-sm text-gray-600">{t("Ready Adventure")}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FEATURED HELICOPTER CHARTERS */}
            <section className="bg-white px-4 py-12 md:px-8">
                <h2 className="mb-8 text-center text-2xl font-bold text-blue-900 md:text-3xl">{t("Featured Helicopter Charters")}</h2>
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
                    {helicopterCharters.map((charter, index) => (
                        <div
                            key={index}
                            className="flex flex-col overflow-hidden rounded-lg bg-gray-100 shadow transition hover:shadow-lg"
                        >
                            <div className="relative">
                                <img
                                    src={charter.image}
                                    alt={`${charter.departure} / ${charter.destination}`}
                                    className="h-48 w-full object-cover"
                                />
                                {/* Overlay Button */}
                                <div className="absolute bottom-2 right-2">
                                    <Link
                                        to={`/${currentLang}/charter`}
                                        className="rounded bg-blue-900 px-3 py-1 text-sm text-white transition hover:bg-blue-700"
                                    >
                                        {t("Charter Now")}
                                    </Link>
                                </div>
                            </div>
                            <div className="flex-grow p-4">
                                <h3 className="text-lg font-semibold text-blue-900">
                                    {charter.departure} → {charter.destination}
                                </h3>
                                <h3 className="text-lg font-semibold text-blue-900">
                                    {charter.destination} → {charter.departure}
                                </h3>
                                {/*<p className="text-gray-700">{t('from')} {charter.price}</p>*/}
                                <p className="mt-2 text-sm text-gray-600">{t("Experience Helicopter")}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* RECOMMENDED HOTELS */}
            <section className="bg-gray-50 px-4 py-12 md:px-8">
                <h2 className="mb-8 text-center text-2xl font-bold text-blue-900 md:text-3xl">{t("Recommended Hotels")}</h2>
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
                    {hotels.map((hotel, index) => (
                        <div
                            key={index}
                            className="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg"
                        >
                            <img
                                src={hotel.image}
                                alt={hotel.name}
                                className="h-48 w-full object-cover"
                            />
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-blue-900">{hotel.name}</h3>
                                <p className="text-gray-700">{hotel.location}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* NEED HELP SECTION */}
            <section className="border-t border-gray-200 bg-white px-4 py-16 md:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="mb-4 text-3xl font-bold text-blue-900">{t("Need Help Booking")}</h2>
                    <p className="mb-8 text-gray-600">{t("Support message")}</p>

                    <form
                        action={`/${currentLang}/faq`}
                        method="GET"
                        className="flex justify-center"
                        role="search"
                        aria-label="Search FAQs"
                    >
                        <div className="flex w-full max-w-xl sm:w-2/3">
                            <input
                                type="text"
                                name="q"
                                placeholder={t("Search FAQS")}
                                aria-label="Search FAQs"
                                className="w-full rounded-l-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Link
                                to={`/${currentLang}/faqs`}
                                type="submit"
                                aria-label="Submit search"
                                className="flex items-center justify-center rounded-r-md bg-blue-900 px-5 py-3 text-white transition hover:bg-blue-800"
                            >
                                
                                 <FontAwesomeIcon icon={faMagnifyingGlass} className="text-#ffffff-700 w-6 h-6" />
                            </Link>
                        </div>
                    </form>

                    <div className="mt-8 text-sm text-gray-500">
                        {t("Still Need Help")}{" "}
                        <Link
                            to={`/${currentLang}/support`}
                            className="text-blue-600 hover:underline"
                            >
                            {t("Contact Support Team")}
                        </Link>

                    </div>
                </div>
            </section>
            <Footer />
        </>
    );
}
