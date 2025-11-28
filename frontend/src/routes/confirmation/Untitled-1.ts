   // const handleSubmit = async () => {
    //     // 1️⃣ Validation des champs obligatoires
    //     if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.nationality || !formData.dateOfBirth) {
    //         toast.error(`Veuillez remplir tous les champs obligatoires`, {
    //             style: {
    //                 background: "#fee2e2",
    //                 color: "#991b1b",
    //                 border: "1px solid #f87171",
    //             },
    //             iconTheme: { primary: "#fff", secondary: "#dc2626" },
    //         });
    //         return;
    //     }

        

    //     // 2️⃣ Préparer les passagers
    //     const passengers: Passenger[] = [];
    //     const passengerCount = Number(formData.passengerCount || 1);
    //     for (let i = 0; i < passengerCount; i++) {
    //         passengers.push({
    //             firstName: formData.firstName,
    //             middleName: formData.middleName,
    //             lastName: formData.lastName,
    //             dateOfBirth: formData.dateOfBirth,
    //             gender: formData.gender,
    //             title: formData.title,
    //             address: formData.address,
    //             type: "adult",
    //             typeVol: flight?.type || "plane",
    //             typeVolV: "onway",
    //             country: formData.country,
    //             nationality: formData.nationality,
    //             phone: formData.phone,
    //             email: formData.email,
    //         });
    //     }

    //     // 3️⃣ Préparer le body à envoyer
    //     const body = {
    //         flightId: flight.id,
    //         passengers,
    //         contactInfo: { email: formData.email, phone: formData.phone },
    //         totalPrice: flight.price * passengerCount,
    //         departureDate: flight.departure.split("T")[0],
    //         returnDate: formData.returnDate,
    //         paymentMethod: formData.paymentMethod,
    //     };

    //     try {
    //         const res = await fetch("https://steve-airways.onrender.com/api/create-ticket", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify(body),
    //         });

    //         let data: any;

    //         try {
    //             data = await res.json();
    //         } catch (jsonErr) {
    //             console.error("Erreur parsing JSON:", jsonErr);
    //             toast.error("❌ Réponse serveur invalide");
    //             return;
    //         }

    //         // Vérifiez explicitement le statut HTTP ET le champ success
    //         if (res.status === 200 && data.success) {
            
    //              toast.success(`Ticket créé avec succès ! Référence: ${data.bookingReference}`, {
    //             style: {
    //                 background: "#28a745",
    //                 color: "#fff",
    //                 border: "1px solid #1e7e34",
    //             },
    //             iconTheme: { primary: "#fff", secondary: "#1e7e34" },
    //         });

    //             try {
    //                 console.log("📧 Tentative d'envoi d'email...");
    //                 console.log("Données email:", {
    //                     bookingReference: data.bookingReference,
    //                     passengerCount: passengers.length,
    //                     email: formData.email,
    //                 });

    //                 await sendTicketByEmail(
    //                     {
    //                         from: flight.from || "",
    //                         to: flight.to || "",
    //                         outbound: {
    //                             date: flight.departure,
    //                             noflight: flight.flight_number,
    //                             departure_time: flight.departure,
    //                             arrival_time: flight.arrival,
    //                         },
    //                         passengersData: { adults: passengers },
    //                         totalPrice: body.totalPrice,
    //                     },
    //                     data.bookingReference,
    //                     formData.paymentMethod,
    //                 );

    //                 console.log("✅ Email envoyé avec succès");
    //             } catch (emailError) {
    //                 console.error("❌ Erreur détaillée envoi email:", emailError);
    //                 toast.error("Ticket créé mais email non envoyé");
    //             }

    //             onClose();
    //         } else {
    //             console.error("Erreur création ticket:", data);
    //             toast.error(`❌ Erreur: ${data.error || data.message || "inconnue"}`);
    //         }
    //     } catch (err) {
    //         console.error("Erreur réseau:", err);
    //         toast.error("❌ Erreur de connexion au serveur");
    //     }
    // };