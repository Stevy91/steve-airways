const permissionsData = [
  {
    id: "dashboard",
    label: "0 - TABLEAU DE BORD",
    children: []
  },
  {
    id: "user",
    label: "1 - UTILISATEUR",
    children: [
      { id: "user.add", label: "1.1 - Ajouter" },
      { id: "user.list", label: "1.2 - Lister" },
      { id: "user.edit", label: "1.3 - Modifier" },
      { id: "user.block", label: "1.4 - Bloquer / Débloquer" },
      { id: "user.access", label: "1.5 - Accès" },
      { id: "user.delete", label: "1.6 - Supprimer" }
    ]
  },
  {
    id: "agent",
    label: "3 - AGENT",
    children: [
      { id: "agent.add", label: "3.1 - Ajouter" },
      { id: "agent.list", label: "3.2 - Lister" },
      { id: "agent.edit", label: "3.3 - Modifier" },
      { id: "agent.block", label: "3.4 - Bloquer / Débloquer" },
      { id: "agent.transaction", label: "3.5 - Transaction" }
    ]
  },
  {
    id: "client",
    label: "4 - CLIENT",
    children: [
      { id: "client.add", label: "4.1 - Ajouter" },
      { id: "client.list", label: "4.2 - Lister" },
      { id: "client.edit", label: "4.3 - Modifier" },
      { id: "client.block", label: "4.4 - Bloquer / Débloquer" },
      { id: "client.transaction", label: "4.5 - Transaction" },
      { id: "client.delete", label: "4.6 - Supprimer" }
    ]
  }
];
