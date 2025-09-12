// pages/CharterPage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { CharterEmailForm } from "../../components/CharterEmailForm";
import { Footer } from "../../layouts/footer";
import { HeroSection } from "../../layouts/HeroSection";

export const CharterPage: React.FC = () => {
    const { t } = useTranslation();
    return (
        <>
        
        <HeroSection />
            <div
                className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                
                <div className="px-4 pt-24">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Soar toward your dreams")}</h1>
                    <p className="text-xl">{t("With our charter flights, travel freely, without detour, into the light of your own path.")}</p>
                </div>
            </div>
            
                <h1 className="mb-6 text-center text-3xl font-bold mt-16"> {t("charter_form_title")}</h1>
                <CharterEmailForm />
            
            <Footer />
        </>
    );
};
