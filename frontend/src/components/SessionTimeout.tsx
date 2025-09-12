"use client";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";

export default function SessionTimeout() {
    const [showPopup, setShowPopup] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const INACTIVITY_LIMIT = 20 * 60 * 1000;

        const { t, i18n } = useTranslation();
    const { lang } = useParams<{ lang: string }>();
    const navigate = useNavigate();
    const currentLang = lang || "fr";

    // Mettre à jour le temps de la dernière activité
    const updateLastActivity = useCallback(() => {
        localStorage.setItem("lastActivity", Date.now().toString());
    }, []);

    // Vérifier l'inactivité
    const checkInactivity = useCallback(() => {
        const lastActivity = localStorage.getItem("lastActivity");
        if (!lastActivity) return false;

        const elapsed = Date.now() - parseInt(lastActivity, 10);
        return elapsed >= INACTIVITY_LIMIT;
    }, [INACTIVITY_LIMIT]);

    // Gérer le clic utilisateur
    const handleUserClick = useCallback(() => {
        // Si l'utilisateur était inactif pendant plus de 10 secondes
        if (checkInactivity()) {
            setShowPopup(true);
            setCountdown(10);

            // Démarrer le compte à rebours
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        navigate(`/${currentLang}/`);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        // Mettre à jour le temps d'activité
        updateLastActivity();
    }, [checkInactivity, updateLastActivity, navigate, currentLang]);

    // Redirection immédiate
    const handleRedirectNow = useCallback(() => {
        navigate(`/${currentLang}/`);
    }, [navigate, currentLang]);

    useEffect(() => {
        // Initialiser le temps de la dernière activité
        if (!localStorage.getItem("lastActivity")) {
            updateLastActivity();
        }

        // Ajouter les écouteurs d'événements pour l'activité utilisateur
        window.addEventListener("click", handleUserClick);
        window.addEventListener("touchstart", handleUserClick);

        return () => {
            window.removeEventListener("click", handleUserClick);
            window.removeEventListener("touchstart", handleUserClick);
        };
    }, [handleUserClick, updateLastActivity]);

    return (
        <>
            {showPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-10 w-10 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-red-900">{t("Session Expired")}</h2>
                        <p className="mt-3 text-gray-700">{t("Your session has expired due to prolonged inactivity.")}</p>
                        <div className="my-4">
                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full bg-red-600 transition-all duration-1000"
                                    style={{ width: `${(countdown / 10) * 100}%` }}
                                ></div>
                            </div>
                            <p className="mt-2 text-gray-500">
                                {t("Redirection in")} {countdown} {t("second")}{countdown !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <button
                            onClick={handleRedirectNow}
                            className="mt-4 rounded-lg bg-red-700 px-5 py-2.5 font-medium text-white transition-colors hover:bg-red-800"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
