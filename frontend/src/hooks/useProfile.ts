import { useEffect, useState } from "react";

interface UserProfile {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    created_at: string;
    role: string;
}

export const useProfile = () => {
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const res = await fetch("https://steve-airways-production.up.railway.app/api/profile", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!res.ok) throw new Error("Impossible de récupérer le profil");
                const data = await res.json();
                setUser(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchProfile();
    }, []);

    return user;
};
