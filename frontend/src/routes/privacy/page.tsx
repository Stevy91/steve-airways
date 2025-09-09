"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useTranslation } from "react-i18next";
import { useFaqData } from "../../hooks/useFaqData";
import { Footer } from "../../layouts/footer";
import { HeroSection } from "../../layouts/HeroSection";

export default function Privacy() {
    const { t, i18n } = useTranslation();
    const { categories, filteredFaqs, searchTerm, handleSearch, activeCategory, setActiveCategory, openIndex, toggleOpen } = useFaqData();

    return (
        <>
        <HeroSection />
            <div
                className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
           
                <div className="px-4 pt-24">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("privacy_header_title")}</h1>
                    <p className="text-xl">{t("privacy_header_subtitle")}</p>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 py-12 text-gray-800">
                <h1 className="mb-4 text-3xl font-bold text-blue-900">{t("privacy_title")}</h1>
                <p>
                    <strong>{t("privacy_effectiveDate")}</strong>
                </p>
                <p>{t("privacy_intro")}</p>
                <hr className="my-6" />

                {Array.from({ length: 10 }, (_, idx) => {
                    const n = idx + 1;
                    const titleKey = `privacy.${n}.title`;
                    const textKey = `privacy.${n}.text`;
                    const listKey = `privacy.${n}.list`;

                    const hasText = t(textKey, { defaultValue: "", returnObjects: false });
                    const hasList = t(listKey, { defaultValue: [], returnObjects: true }) as string[];

                    return (
                        <section
                            key={n}
                            className="mb-10"
                        >
                            <h2 className="mb-2 text-2xl font-semibold text-blue-800">{t(titleKey)}</h2>
                            {hasText && <p className="mb-2">{t(textKey)}</p>}
                            {hasList.length > 0 && (
                                <ul className="list-disc pl-6">
                                    {hasList.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
            <Footer />
        </>
    );
}
