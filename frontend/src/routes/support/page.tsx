"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useTranslation } from "react-i18next";
import emailjs from "@emailjs/browser";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../../layouts/footer";
import { HeroSection } from "../../layouts/HeroSection";

export default function SupportPage() {
        const { lang } = useParams<{ lang: string }>();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(lang || "en");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });

    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            setFormError(t("contact_form_error_required") || "Please fill in all required fields.");
            return;
        }

        emailjs
            .send(
                "service_1da4o79", // Your service ID
                "template_nw6egye", // Your template ID
                formData,
                "WAls6tGFvOOOuvbuL", // Your public API key
            )
            .then(() => {
                emailjs.send(
                    "service_1da4o79", // Your service ID
                    "template_lxy9tgg", // Your template ID
                    formData,
                    "WAls6tGFvOOOuvbuL", // Your public API key
                );
                setSuccessMessage(t("contact_form_success") || "Message sent successfully!");
                setFormData({ name: "", email: "", subject: "", message: "" });
                setFormError("");
            })
            .catch(() => {
                setFormError(t("contact_form_error_send") || "Failed to send your message. Please try again.");
            });
    };
    return (
        <>
            <div
                className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                <HeroSection />
                <div className="px-4 pt-24">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Need Help?")}</h1>
                    <p className="text-xl">{t("Our support team is here for you 24/7")}</p>
                </div>
            </div>

            {/* Static support info */}
            <div className="bg-white px-4 py-8 md:px-8">
                <div className="mx-auto max-w-5xl">
                    <h1 className="mb-4 text-3xl font-bold text-blue-900">{t("customer_support_title")}</h1>
                    <p className="mb-2 text-gray-700">{t("customer_support_content")}</p>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded bg-gray-100 p-5 shadow transition hover:shadow-md">
                            <h2 className="mb-1 text-xl font-semibold text-blue-800">{t("faq_title")}</h2>
                            <p className="mb-1 text-sm text-gray-600">{t("faq_description")}</p>
                            <Link
                               
                                to={`/${currentLang}/faqs`}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {t("view_faq_button")}
                            </Link>
                        </div>

                        <div className="rounded bg-gray-100 p-5 shadow transition hover:shadow-md">
                            <h2 className="mb-1 text-xl font-semibold text-blue-800">{t("live_chat_title")}</h2>
                            <p className="mb-1 text-sm text-gray-600">{t("live_chat_description")}</p>
                            <a
                                href="https://wa.me/message/HMUCTQF2BGWSA1"
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {t("start_chat_button")}
                            </a>
                        </div>

                        <div className="rounded bg-gray-100 p-5 shadow transition hover:shadow-md">
                            <h2 className="mb-1 text-xl font-semibold text-blue-800">{t("contact_methods_title")}</h2>
                            <p className="mb-1 text-sm text-gray-600">
                                {t("contact_email_label")}{" "}
                                <a
                                    href="mailto:info@trogonairways.com"
                                    className="underline"
                                >
                                    info@trogonairways.com
                                </a>
                                <br />
                                {t("contact_phone_label")}{" "}
                                <a
                                    href="tel:+50933410404"
                                    className="underline"
                                >
                                    +509 3341 0404
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Form */}
            <div >
                <div className="mx-auto max-w-3xl">
                    <h2 className="mb-3 text-center text-2xl font-bold text-blue-900">{t("contact_us_directly_title")}</h2>
                    <p className="mb-6 text-center text-sm text-gray-600">{t("contact_us_directly_text")}</p>

                    {formError && <div className="mb-4 text-center text-sm text-red-600">{formError}</div>}
                    {successMessage && <div className="mb-4 text-center text-sm text-green-600">{successMessage}</div>}

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-4"
                    >
                        <div className="grid gap-3 md:grid-cols-2">
                            <input
                                name="name"
                                type="text"
                                placeholder={t("contact_form_name")}
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                name="email"
                                type="email"
                                placeholder={t("contact_form_email")}
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <input
                            name="subject"
                            type="text"
                            placeholder={t("contact_form_subject")}
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                            name="message"
                            rows={5}
                            placeholder={t("contact_form_message")}
                            value={formData.message}
                            onChange={handleChange}
                            className="w-full resize-none rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <div className="text-center">
                            <button
                                type="submit"
                                className="rounded bg-blue-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
                            >
                                {t("contact_form_submit")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer/>
        </>
    );
}
