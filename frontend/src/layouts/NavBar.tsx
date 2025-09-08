"use client";
import { useState, useEffect, RefObject, useRef } from "react";
import { useLocation, Link, useParams } from "react-router-dom";
import { FacebookIcon, InstagramIcon, GlobeIcon, Phone, ChevronDown, MenuIcon, XIcon, House, Info, Contact, Twitter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
// Hook personnalisé pour détecter les clics à l'extérieur
const useClickOutside = (ref: RefObject<HTMLElement | null>, callback: () => void) => {
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => {
            document.removeEventListener("mousedown", handleClick);
        };
    }, [ref, callback]);
};

export const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [bookMenuOpen, setBookMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

    const [scrolled, setScrolled] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);
    const { lang } = useParams<{ lang: string }>();
    const { t, i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(lang || "en");

    // Référence pour le menu de langue
    const languageMenuRef = useRef<HTMLDivElement>(null);

    // Fermer le menu de langue en cliquant à l'extérieur
    useClickOutside(languageMenuRef, () => {
        setLanguageOpen(false);
    });

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

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 400);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const headerHomeLinks = [
        { label: t("Home"), path: "", icon: House },
        { label: t("Travel Info"), path: "info", icon: Info },
        { label: t("Charter"), path: "charter", icon: Icon, iconProps: { icon: "mdi:helicopter", className: "mr-2 h-4 w-4" } },
        { label: t("Support"), path: "support", icon: Contact },
    ];

    return (
        <>
            <div className="hidden md:block">
                <div
                    className={`fixed left-0 right-0 top-0 z-40 flex h-10 items-center justify-between border-b border-white px-4 py-2 text-sm text-white backdrop-blur-lg ${isScrolled ? "bg-blue-950" : "border-white/10 bg-transparent text-white"}`}
                >
                    <div className="flex items-center space-x-4">
                        <div className="flex space-x-3">
                            <Link
                                to={"https://web.facebook.com/profile.php?id=61578561909061"}
                                className="hover:text-gray-200"
                                target="_blank"
                            >
                                <FacebookIcon className="h-4 w-4 cursor-pointer hover:text-blue-300" />
                            </Link>
                            <Link
                                to={"https://www.instagram.com/trogonairways?igsh=MWhtbHhjMjBrczZmaQ=="}
                                className="hover:text-gray-200"
                                target="_blank"
                            >
                                <InstagramIcon className="h-4 w-4 cursor-pointer hover:text-pink-300" />
                            </Link>
                            <Link
                                to={"https://x.com/TrogonAirways"}
                                className="hover:text-gray-200"
                                target="_blank"
                            >
                                <Twitter className="h-4 w-4 cursor-pointer hover:text-pink-300" />
                            </Link>
                            <span className="h-5 border-l border-gray-200"></span>
                            <Link
                                to={"mailto:info@trogonairways.com"}
                                className="hover:text-white"
                                target="_blank"
                            >
                                info@trogonairways.com
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <a
                            href="tel:+50933410404"
                            className="hover:text-white"
                        >
                            <span className="flex items-center">
                                <Phone className="mr-1 h-4 w-4" />
                                +509 3341 0404
                            </span>
                        </a>
                        {/* language */}
                        <div
                            className="relative"
                            ref={languageMenuRef}
                        >
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

            <div>
                {/* NAVBAR */}
                <nav
                    className={`fixed left-0 right-0 top-0 z-30 h-16 border-b backdrop-blur-lg md:top-10 ${
                        isScrolled ? "border-gray-300 bg-white/80 text-blue-700" : "border-white/10 bg-transparent text-white"
                    }`}
                >
                    <div className="mx-auto max-w-7xl justify-between px-4">
                        <div className="flex h-16 items-center justify-between">
                            {/* Logo */}
                            <Link
                                to={`/${currentLang}/`}
                                className="flex items-center justify-center gap-x-1.5 text-white"
                                title="Link to Trogon Airways Homepage"
                            >
                                <img
                                    className="w-[55px]"
                                    src="/logo.png"
                                    alt="Trogon Bird"
                                />
                                <span className={`${isScrolled ? "text-blue-900" : "text-white"}`}>TROGON AIRWAYS</span>
                            </Link>
                            <div className={`hidden items-center space-x-4 md:flex`}>
                                {headerHomeLinks.map((link) => {
                                    const isActive = window.location.pathname === `/${currentLang}/${link.path}`;
                                    return (
                                        <Link
                                            to={`/${currentLang}/${link.path}`}
                                            className={`flex items-center space-x-1 rounded-full px-4 py-2 transition-colors ${
                                                isActive
                                                    ? "bg-red-500 text-white"
                                                    : `${isScrolled ? "text-blue-900" : "text-white"} hover:bg-red-400 hover:bg-opacity-20`
                                            }`}
                                        >
                                            {link.iconProps ? <link.icon {...link.iconProps} /> : <link.icon className="h-4 w-4" />}
                                            <span>{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Mobile Menu Button */}
                            <div className="md:hidden">
                                <div className="flex">
                                    {/* language */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setLanguageOpen(!languageOpen)}
                                            className={`flex items-center rounded-md px-2 py-1 text-white ${isScrolled ? "text-blue-900" : "text-white"}`}
                                        >
                                            <img
                                                src={currentLang === "en" ? "/assets/flag/us.png" : "/assets/flag/fr.png"}
                                                alt={currentLang}
                                                className="mr-2 h-5 w-5"
                                            />
                                            <span className={`${isScrolled ? "text-blue-900" : "text-white"}`}>{currentLang.toUpperCase()}</span>
                                            <ChevronDown className={`ml-1 h-4 w-4 ${isScrolled ? "text-blue-900" : "text-white"}`} />
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
                                    <button
                                        onClick={() => setMenuOpen((prev) => !prev)}
                                        className="text-gray-300 focus:outline-none"
                                        aria-label="Toggle Menu"
                                    >
                                        <svg
                                            className={`h-6 w-6 ${isScrolled ? "text-blue-900" : "text-white"}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            {menuOpen ? (
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            ) : (
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 6h16M4 12h16M4 18h16"
                                                />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/*Mobile Menu */}
                        {menuOpen && (
                            <div className="bg-[rgb(252,250,250)] md:hidden">
                                <div className="space-y-1 px-2 pb-3 pt-2">
                                    {headerHomeLinks.map((link) => {
                                        const isActive = window.location.pathname === `/${currentLang}/${link.path}`;
                                        return (
                                            <li key={`/${currentLang}/${link.path}`}>
                                                <Link
                                                    to={`/${currentLang}/${link.path}`}
                                                    onClick={() => setMenuOpen(false)}
                                                    className={`flex items-center space-x-2 rounded-md px-3 py-2 ${isActive ? "bg-red-500 text-white" : "text-gray-800 hover:bg-red-100"}`}
                                                >
                                                    {link.iconProps ? <link.icon {...link.iconProps} /> : <link.icon className="h-4 w-4" />}
                                                    <span>{link.label}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </>
    );
};
