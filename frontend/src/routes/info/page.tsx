"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBan,
    faChildReaching,
    faClock,
    faCloudSunRain,
    faIdCard,
    faShieldHalved,
    faSuitcaseRolling,
    faWheelchair,
} from "@fortawesome/free-solid-svg-icons";
import { Footer } from "../../layouts/footer";

export default function TravelInfoPage() {
    const { t, i18n } = useTranslation();
    return (
        <>
            <div
                className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                <div className="px-4 pt-24">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Travel Information")}</h1>
                    <p className="text-xl">{t("Everything you need to know before your flight")}</p>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 text-gray-800">
                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faSuitcaseRolling}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("baggage_policy_title")}
                    </h2>
                    <p>{t("baggage_policy_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faClock}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("checkin_guidelines_title")}
                    </h2>
                    <p>{t("checkin_guidelines_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faBan}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("travel_restrictions_title")}
                    </h2>
                    <p>{t("travel_restrictions_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faIdCard}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("id_and_docs_title")}
                    </h2>
                    <p>{t("id_and_docs_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faCloudSunRain}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("weather_and_delays_title")}
                    </h2>
                    <p>{t("weather_and_delays_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faShieldHalved}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("security_procedures_title")}
                    </h2>
                    <p>{t("security_procedures_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faChildReaching}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("children_and_minors_title")}
                    </h2>
                    <p>{t("children_and_minors_content")}</p>
                </section>

                <section>
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <FontAwesomeIcon
                            icon={faWheelchair}
                            className="h-6 w-6 text-blue-700"
                        />
                        {t("special_assistance_title")}
                    </h2>
                    <p>{t("special_assistance_content")}</p>
                </section>
            </div>
            <Footer/>
        </>
    );
}
