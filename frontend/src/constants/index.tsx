import { TowerControl , Plane, Lock, Armchair, Settings, Users, LayoutDashboard, UserRound, House, Info, Contact, List, MapPin, PlusCircle, ClipboardList, Tag, BarChart2, RefreshCcw, ShieldCheck, UserCircle } from "lucide-react";
import { HelicopterIcon } from "../components/icons/HelicopterIcon";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function useLang() {
  const { lang } = useParams();
  return lang || "en"; // valeur par défaut
}


// export const NavbarLinks = (lang: string) => [

    
//   {
//     title: "Dashboard",
//     links: [
//       { label: "Dashboard", icon: LayoutDashboard, path: `/${lang}/dashboard` },
//     ],
//   },
//   {
//     title: "Air plane",
//     icon: Plane,
//     links: [
//       { label: "All flights", icon: List, path: `/${lang}/dashboard/flights` },
//       { label: "View Bookings", icon: List, path: `/${lang}/dashboard/bookings-plane` },
//     //   { label: "Airport", icon: TowerControl, path: `/${lang}/dashboard/airport` },
//     ],
//   },
//   {
//     title: "Helico",
//     icon: HelicopterIcon,
    
//     links: [
//       { label: "All flights Helico", icon: List, path: `/${lang}/dashboard/flights-helico` },
//       { label: "View Bookings", icon: List, path: `/${lang}/dashboard/bookings-helico` },
//     //   { label: "Airport Helico", icon: TowerControl, path: `/${lang}/dashboard/airport-helico` },
//     ],
//   },

//  {
//   title: "Charter",
//   icons: [Plane, HelicopterIcon],
//   links: [
//     {label: "All flights Charter", icon: List, path: `/${lang}/dashboard/flights-charter`,},
//     {label: "View Bookings", icon: List, path: `/${lang}/dashboard/bookings-charter`,},
//   ],
// },




//   {
//     title: "Users",
//     icon: Users,
//     links: [
//       { label: "All Users", icon: UserRound, path: `/${lang}/dashboard/user` },
//       { label: "Role Manager", icon: Lock, path: `/${lang}/dashboard/roleUser` },
//     ],
//   },
// //   {
// //     title: "Settings",
// //     icon: Settings,
// //     links: [
// //       { label: "Settings", icon: Settings, path: `/${lang}/dashboard/settings` },
// //     ],
// //   },
// ];

export const NavbarLinks = (
  lang: string,
  auth?: {
    isAdmin: boolean;
    hasPermission: (perm: string) => boolean;
  }
) => {

  
const { 
    user, 
    loading: authLoading, 
    isAdmin, 
    hasPermission, 
    permissions 
} = useAuth();

  const canSeeUsers = isAdmin || hasPermission("listeUsers");
  const dashboard = isAdmin || hasPermission("dashboard");
  const listeFlightsPlane = isAdmin || hasPermission("listeFlightsPlane");
  const listeFlightsHelico = isAdmin || hasPermission("listeFlightsHelico");
  const charter = isAdmin || hasPermission("charter");
  const canManualBooking = isAdmin || hasPermission("manualBooking");
  const canViewBookingsPlane = isAdmin || hasPermission("listeBookingsPlane");
  const canViewBookingsHelico = isAdmin || hasPermission("listeBookingsHelico");
  const canViewBookingsCharter = isAdmin || hasPermission("listeBookingsCharter") || hasPermission("charter");
  const canPassengers = isAdmin || hasPermission("listePassagers");
  const canLocations = isAdmin || hasPermission("locations");
  const canRefunds = isAdmin || hasPermission("refunds");
  const canPromoCodes = isAdmin || hasPermission("promoCodes");
  const canRapport = isAdmin || hasPermission("rapport");

  // La section "Réservations" s'affiche dès qu'au moins une sous-permission est accordée
  const showReservationsSection = canManualBooking || canViewBookingsPlane || canViewBookingsHelico || canViewBookingsCharter || canPassengers || canRefunds;

  return [
    dashboard && {
      title: "Dashboard",
      links: [
        { label: "Tableau de bord", icon: LayoutDashboard, path: `/${lang}/dashboard` },
      ],
    },

    // Section Avion — uniquement la gestion des vols (View Bookings est dans "Réservations")
    listeFlightsPlane && {
      title: "Avion",
      icon: Plane,
      links: [
        { label: "Tous les vols avion", icon: List, path: `/${lang}/dashboard/flights` },
      ],
    },

    // Section Hélico — uniquement la gestion des vols (View Bookings est dans "Réservations")
    listeFlightsHelico && {
      title: "Hélico",
      icon: HelicopterIcon,
      links: [
        { label: "Tous les vols hélico", icon: List, path: `/${lang}/dashboard/flights-helico` },
      ],
    },

    // Section Charter — uniquement la gestion des vols charter (View Bookings est dans "Réservations")
    charter && {
      title: "Charter",
      icons: [Plane, HelicopterIcon],
      links: [
        { label: "Tous les vols charter", icon: List, path: `/${lang}/dashboard/flights-charter` },
      ],
    },

    // ✅ SECTION RÉSERVATIONS — chaque lien a sa propre permission
    showReservationsSection && {
      title: "Réservations",
      icon: PlusCircle,
      links: [
        canManualBooking && { label: "Créer une Réservation", icon: PlusCircle, path: `/${lang}/dashboard/manual-booking` },
        canViewBookingsPlane && { label: "Les réservations avion", icon: List, path: `/${lang}/dashboard/bookings-plane` },
        canViewBookingsHelico && { label: "Les réservations hélico", icon: List, path: `/${lang}/dashboard/bookings-helico` },
        canViewBookingsCharter && { label: "Les réservations charter", icon: List, path: `/${lang}/dashboard/bookings-charter` },
        canPassengers && { label: "Tous les passagers", icon: Users, path: `/${lang}/dashboard/passengers` },
        canRefunds && { label: "Remboursements", icon: RefreshCcw, path: `/${lang}/dashboard/refunds` },
      ].filter(Boolean),
    },

    canLocations && {
      title: "Destinations",
      icon: MapPin,
      links: [
        { label: "Gérer destinations", icon: MapPin, path: `/${lang}/dashboard/locations` },
      ],
    },

    canRapport && {
      title: "Rapports",
      icon: BarChart2,
      links: [
        { label: "Rapports financiers", icon: BarChart2, path: `/${lang}/dashboard/reports` },
      ],
    },

    canPromoCodes && {
      title: "Marketing",
      icon: Tag,
      links: [
        { label: "Codes promo", icon: Tag, path: `/${lang}/dashboard/promo-codes` },
      ],
    },

    // 👇 USERS & ADMIN
    canSeeUsers && {
      title: "Administration",
      icon: Users,
      links: [
        { label: "Utilisateurs", icon: UserRound, path: `/${lang}/dashboard/user` },
        isAdmin && { label: "Rôles & Permissions", icon: ShieldCheck, path: `/${lang}/dashboard/roles` },
        isAdmin && { label: "Journal d'audit", icon: ClipboardList, path: `/${lang}/dashboard/audit-logs` },
        isAdmin && { label: "Paramètres", icon: Settings, path: `/${lang}/dashboard/settings` },
      ].filter(Boolean),
    },

    // Mon profil — toujours visible
    {
      title: "Mon compte",
      icon: UserCircle,
      links: [
        { label: "Mon profil", icon: UserCircle, path: `/${lang}/dashboard/profile` },
      ],
    },
  ].filter(Boolean);
};



export const headerHomeLinks = [
    {
        title: "Home",
        icon: LayoutDashboard,
        links: [
            {
                label: "Home",
                icon: House,
                path: "/",
            },
        ],
    },
    {
        title: "Travel Info",
        links: [
            {
                label: "Travel Info",
                icon: Info,
                path: "/info",
            },
        ],
    },
    {
        title: "Support",
        links: [
            {
                label: "Support",
                icon: Contact,
                path: "/support",
            },
        ],
    },

];
export const headerMobilLinks = [
    {
        title: "Home",
        icon: LayoutDashboard,
        links: [
            {
                label: "Home",
                icon: House,
                path: "/",
            },
        ],
    },
    {
        title: "Travel Info",
        links: [
            {
                label: "Travel Info",
                icon: Info,
                path: "/info",
            },
        ],
    },
    {
        title: "Support",
        links: [
            {
                label: "Support",
                icon: Contact,
                path: "/support",
            },
        ],
    },

];

export const overviewData = [
    {
        name: "Jan",
        total: 1500,
    },
    {
        name: "Feb",
        total: 2000,
    },
    {
        name: "Mar",
        total: 1000,
    },
    {
        name: "Apr",
        total: 5000,
    },
    {
        name: "May",
        total: 2000,
    },
    {
        name: "Jun",
        total: 5900,
    },
    {
        name: "Jul",
        total: 2000,
    },
    {
        name: "Aug",
        total: 5500,
    },
    {
        name: "Sep",
        total: 2000,
    },
    {
        name: "Oct",
        total: 4000,
    },
    {
        name: "Nov",
        total: 1500,
    },
    {
        name: "Dec",
        total: 2500,
    },
];


export const recentBookingData = [
    {
        id: 1,
        name: "Olivia Martin",
        total: "$700",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
    {
        id: 2,
        name: "Martin",
        total: "$740",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
    {
        id: 3,
        name: "Olivia Martin",
        total: "$700",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
    {
        id: 4,
        name: "jean",
        total: "$70",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
    {
        id: 5,
        name: "saint hubert",
        total: "$700",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
    {
        id: 6,
        name: "steve",
        total: "$700",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
    {
        id: 7,
        name: "Olivia",
        total: "$700",
        paid: "$0",
        status: "processing",
        createAt: "06/11/2025 20:24",
    },
];


export const flightAirSteve = [
    {
        number: 1,
        name: "Steve Saint Hubert",
        code: 'VJd43',
        airportFrom: "Cayes",
        airportTo: "Cap",
        departureTime: "06/13/2025 16:59",
        arrivalTime: "06/13/2025 16:59",
        duration: "4",
        status: "Publish",
        date: "06/13/2025",
    },
     {
        number: 1,
        name: "Steve Saint Hubert",
        code: 'VJd43',
        airportFrom: "Cayes",
        airportTo: "Cap",
        departureTime: "06/13/2025 16:59",
        arrivalTime: "06/13/2025 16:59",
        duration: "4",
        status: "Publish",
        date: "06/13/2025",
    },
     {
        number: 1,
        name: "Steve Saint Hubert",
        code: 'VJd43',
        airportFrom: "Cayes",
        airportTo: "Cap",
        departureTime: "06/13/2025 16:59",
        arrivalTime: "06/13/2025 16:59",
        duration: "4",
        status: "Publish",
        date: "06/13/2025",
    },
     {
        number: 1,
        name: "Steve Saint Hubert",
        code: 'VJd43',
        airportFrom: "Cayes",
        airportTo: "Cap",
        departureTime: "06/13/2025 16:59",
        arrivalTime: "06/13/2025 16:59",
        duration: "4",
        status: "Publish",
        date: "06/13/2025",
    },
];
