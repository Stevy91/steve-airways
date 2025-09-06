import { useTranslation } from "react-i18next";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";


const LanguageSwitcher = () => {
   const [languageOpen, setLanguageOpen] = useState(false);
    const { lang } = useParams<{ lang: string }>();
    const { t, i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(lang || "en");

    useEffect(() => {
        if (lang) i18n.changeLanguage(lang);
    }, [lang]);

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


    return (
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
    );
};

export default LanguageSwitcher;
