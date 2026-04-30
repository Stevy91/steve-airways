const permissionsData = [
  {
    id: "dashboard",
    label: "0 - TABLEAU DE BORD",
    children: [],
  },
  {
    id: "user",
    label: "1 - UTILISATEUR",
    children: [
      { id: "listeFlightsPlane", label: "1.1 - Listes Flights Avion" },
      { id: "listeFlightsHelico", label: "1.2 - Listes Flights Hélico" },
      { id: "charter", label: "1.3 - Listes Charter" },
      { id: "listeBookingsPlane", label: "1.4 - Listes Bookings Avion" },
      { id: "listeBookingsHelico", label: "1.5 - Listes Bookings Hélico" },
      { id: "addFlights", label: "1.6 - Ajouter des Vols" },
      { id: "editFlights", label: "1.7 - Modifier des Vols" },
      { id: "deleteFlights", label: "1.8 - Supprimer des Vols" },
      { id: "cancelFlight", label: "1.9 - Annuler des Vols" },
      { id: "editBookings", label: "2.0 - Modifier Réservations" },
      { id: "reschedule", label: "2.1 - Reprogrammer Vols" },
      { id: "listePassagers", label: "2.2 - Liste des Passagers" },
      { id: "createdTicket", label: "2.3 - Créer Ticket" },
      { id: "imprimerTicket", label: "2.4 - Imprimer Ticket" },
      { id: "cancelledTicket", label: "2.5 - Annuler Ticket" },
      { id: "manifestPdf", label: "2.6 - Manifest PDF" },
      { id: "rapport", label: "2.7 - Rapports Financiers" },
      { id: "listeUsers", label: "2.8 - Gestion Utilisateurs" },
    ],
  },
  {
    id: "reservations",
    label: "3 - RÉSERVATIONS",
    children: [
      { id: "manualBooking", label: "3.1 - Réservation Manuelle" },
      { id: "refunds", label: "3.2 - Remboursements" },
    ],
  },
  {
    id: "destinations",
    label: "4 - DESTINATIONS",
    children: [
      { id: "locations", label: "4.1 - Gérer Destinations/Aéroports" },
    ],
  },
  {
    id: "marketing",
    label: "5 - MARKETING",
    children: [
      { id: "promoCodes", label: "5.1 - Codes Promo" },
    ],
  },
];

export default permissionsData;
