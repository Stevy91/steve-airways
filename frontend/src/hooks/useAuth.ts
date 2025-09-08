import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const navigate = useNavigate();
       const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || "en"; // <-- ici on définit currentLang

  useEffect(() => {
    const token = localStorage.getItem("token"); // ou cookie
    if (!token) {
      navigate(`/${currentLang}/login`); // redirige vers login si pas connecté
    }
  }, [navigate]);
};
