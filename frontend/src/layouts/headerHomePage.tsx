"use client";
import { useState, useEffect } from "react";
import { useLocation, Link, useParams } from "react-router-dom";
import { FacebookIcon, InstagramIcon, GlobeIcon, Phone, ChevronDown, MenuIcon, XIcon, House, Info, Contact } from "lucide-react";
import { useTranslation } from "react-i18next";

const HeaderHomePage = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);
    const { lang } = useParams<{ lang: string }>();
    const { t, i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(lang || "en");

    useEffect(() => {
        if (lang) i18n.changeLanguage(lang);
    }, [lang]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLanguageChange = (selected: string) => {
        setLanguageOpen(false);

        let newLang = "en";
        switch (selected) {
            case "English":
                newLang = "en";
                break;
            case "Français":
                newLang = "fr";
                break;
        }

        i18n.changeLanguage(newLang);
        setCurrentLang(newLang);

        // Conserver le path + query params
        const pathParts = window.location.pathname.split("/").slice(2);
        const newPath = `/${newLang}/${pathParts.join("/")}${window.location.search}`;
        window.history.replaceState(null, "", newPath);
    };

    const languages = ["English", "Français"];

    // const headerHomeLinks = [
    //     { label: t("Home"), path: `/${currentLang}`, icon: House },
    //     { label: t("Travel Info"), path: `/${currentLang}/info`, icon: Info },
    //     { label: t("Support"), path: `/${currentLang}/support`, icon: Contact },
    // ];
    const headerHomeLinks = [
        { label: t("Home"), path: "", icon: House },
        { label: t("Travel Info"), path: "info", icon: Info },
        { label: t("Charter"), path: "charter", icon: Contact },
        { label: t("Support"), path: "support", icon: Contact },
    ];

    return (
        <header className={`fixed z-50 w-full transition-all duration-300 ${scrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
            {/* Top Header */}
            <div
                className={`overflow-visible border-b border-zinc-400 transition-all duration-300 ${scrolled ? "h-0 opacity-0" : "h-auto py-2 opacity-100"}`}
            >
                <div className="container mx-auto flex items-center justify-between px-4 text-sm text-white">
                    <div className="flex items-center space-x-4">
                        <FacebookIcon className="h-4 w-4 cursor-pointer hover:text-blue-300" />
                        <InstagramIcon className="h-4 w-4 cursor-pointer hover:text-pink-300" />
                        <span>info@trogonairways.com</span>
                    </div>

                    {/* Phone & Language */}
                    <div className="relative flex items-center space-x-4">
                        <span className="flex items-center">
                            <Phone className="mr-1 h-4 w-4" />
                            +509 3341 0404
                        </span>

                        <div className="relative">
                            <button
                                onClick={() => setLanguageOpen(!languageOpen)}
                                className="flex items-center rounded-md px-2 py-1 text-white"
                            >
                                <img
                                    src={currentLang === "en" ? "/assets/flag/us.png" : "/assets/flag/fr.png"}
                                    alt={currentLang}
                                    className="mr-2 h-5 w-5"
                                />
                                {currentLang.toUpperCase()}
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </button>

                            {languageOpen && (
                                <ul className="absolute right-0 z-[9999] mt-2 w-32 rounded-md bg-white text-black shadow-md">
                                    <li
                                        onClick={() => handleLanguageChange("English")}
                                        className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-200"
                                    >
                                        <img
                                            src="/assets/flag/us.png"
                                            alt="English"
                                            className="mr-2 h-5 w-5"
                                        />
                                        English
                                    </li>
                                    <li
                                        onClick={() => handleLanguageChange("Français")}
                                        className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-200"
                                    >
                                        <img
                                            src="/assets/flag/fr.png"
                                            alt="Français"
                                            className="mr-2 h-5 w-5"
                                        />
                                        Français
                                    </li>
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className={`transition-all duration-300 ${scrolled ? "bg-red-600 py-3 shadow-lg" : "bg-transparent py-4"}`}>
                <div className="container mx-auto flex items-center justify-between px-4">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-10"
                        />
                        <span className={`text-lg font-bold text-white`}>Trogon Airways</span>
                    </div>

                    {/* Desktop Links */}
                    <ul className="hidden space-x-2 md:flex">
                        {headerHomeLinks.map((link) => {
                            const isActive = window.location.pathname === `/${currentLang}/${link.path}`;
                            return (
                                <li key={`/${currentLang}/${link.path}`}>
                                    <Link
                                        to={`/${currentLang}/${link.path}`}
                                        className={`flex items-center space-x-1 rounded-full px-4 py-2 transition-colors ${
                                            isActive ? "bg-white text-red-600" : "text-white hover:bg-white hover:bg-opacity-20"
                                        }`}
                                    >
                                        <link.icon className="h-4 w-4" />
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Mobile Button */}
                    <button
                        className="text-white md:hidden"
                        onClick={() => setMenuOpen(true)}
                    >
                        <MenuIcon className="h-8 w-8" />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="fixed inset-0 z-[9999] bg-white p-6 md:hidden">
                    <div className="mb-6 flex items-center justify-between">
                        <span className="text-lg font-bold">Trogon Airways</span>
                        <button onClick={() => setMenuOpen(false)}>
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <ul className="space-y-4">
                        {headerHomeLinks.map((link) => {
                            const isActive = window.location.pathname === `/${currentLang}/${link.path}`;
                            return (
                                <li key={`/${currentLang}/${link.path}`}>
                                    <Link
                                        to={`/${currentLang}/${link.path}`}
                                        onClick={() => setMenuOpen(false)}
                                        className={`flex items-center space-x-2 rounded-md px-3 py-2 ${isActive ? "bg-blue-700 text-white" : "text-gray-800 hover:bg-blue-100"}`}
                                    >
                                        <link.icon className="h-4 w-4" />
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </header>
    );
};

export default HeaderHomePage;
