import { TowerControl , Plane, Lock, Armchair, Settings, Users, LayoutDashboard, UserRound, House, Info, Contact, List, Helicopter } from "lucide-react";
import { HelicopterIcon } from "../components/icons/HelicopterIcon";
import { useParams } from "react-router-dom";

function useLang() {
  const { lang } = useParams();
  return lang || "en"; // valeur par défaut
}


export const NavbarLinks = (lang: string) => [
  {
    title: "Dashboard",
    links: [
      { label: "Dashboard", icon: LayoutDashboard, path: `/${lang}/dashboard` },
    ],
  },
  {
    title: "Air plane",
    icon: Plane,
    links: [
      { label: "All flights", icon: List, path: `/${lang}/dashboard/flights` },
      { label: "View Bookings", icon: List, path: `/${lang}/dashboard/bookings-plane` },
    //   { label: "Airport", icon: TowerControl, path: `/${lang}/dashboard/airport` },
    ],
  },
  {
    title: "Helico",
    icon: HelicopterIcon,
    
    links: [
      { label: "All flights Helico", icon: List, path: `/${lang}/dashboard/flights-helico` },
      { label: "View Bookings", icon: List, path: `/${lang}/dashboard/bookings-helico` },
    //   { label: "Airport Helico", icon: TowerControl, path: `/${lang}/dashboard/airport-helico` },
    ],
  },

 {
  title: "Charter",
  icons: [Plane, HelicopterIcon],
  links: [
    {label: "All flights Charter", icon: List, path: `/${lang}/dashboard/flights-charter`,},
    {label: "View Bookings", icon: List, path: `/${lang}/dashboard/bookings-charter`,},
  ],
},




  {
    title: "Users",
    icon: Users,
    links: [
      { label: "All Users", icon: UserRound, path: `/${lang}/dashboard/user` },
      { label: "Role Manager", icon: Lock, path: `/${lang}/dashboard/roleUser` },
    ],
  },
//   {
//     title: "Settings",
//     icon: Settings,
//     links: [
//       { label: "Settings", icon: Settings, path: `/${lang}/dashboard/settings` },
//     ],
//   },
];


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


