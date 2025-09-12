"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useTranslation } from "react-i18next";
import { useFaqData } from "../../hooks/useFaqData";
import { Footer } from "../../layouts/footer";
import { HeroSection } from "../../layouts/HeroSection";
import SessionTimeout from "../../components/SessionTimeout";


export default function FaqPage() {
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
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Frequently Asked Questions")}</h1>
                    <p className="text-xl">{t("Find answers to common questions about flights and helicopter charters.")}</p>
                </div>
            </div>
            <div className="mx-auto max-w-4xl px-4 py-12">
                <h1 className="mb-4 text-3xl font-bold text-blue-900">{t("faq_header_title")}</h1>
                <p className="mb-6 text-gray-600">{t("faq_browse_description")}</p>

                <input
                    type="text"
                    placeholder={t("faq_search_placeholder")}
                    value={searchTerm}
                    onChange={handleSearch}
                    className="mb-6 w-full rounded border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="mb-8 flex flex-wrap gap-3">
                    {categories.map((category) => (
                        <button
                            key={category.value}
                            onClick={() => setActiveCategory(category.value)}
                            className={`rounded-full border px-4 py-2 text-sm transition ${
                                activeCategory === category.value
                                    ? "border-blue-900 bg-blue-900 text-white"
                                    : "border-blue-300 bg-white text-blue-900 hover:bg-blue-50"
                            }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>

                {filteredFaqs.length > 0 ? (
                    <ul className="space-y-4">
                        {filteredFaqs.map((faq, idx) => (
                            <li
                                key={idx}
                                className="rounded border border-gray-200"
                            >
                                <button
                                    onClick={() => toggleOpen(idx)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-blue-800 hover:bg-blue-50"
                                >
                                    {faq.question}
                                    <span>{openIndex === idx ? "−" : "+"}</span>
                                </button>
                                {openIndex === idx && (
                                    <div className="px-4 pb-4 text-gray-700">
                                        {faq.answer}
                                        <div className="mt-2 text-sm italic text-gray-400">
                                            {t("faq_label_category")} {t(`faq_category_${faq.category}`)}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">{t("faq_no_results")}</p>
                )}
            </div>
            <Footer />
        </>
    );
}
