import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { ChevronLeft, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";

// Types
interface PaymentData {
    outbound: {
        id: number;
        flightId: number;
        from: string;
        to: string;
        date: string;
        departure_time: string;
        arrival_time: string;
        price: number;
        noflight: string;
        type: "plane" | "helicopter"; // Ajouté ici

        typev: "onway" | "roundtrip"; // Propriété manquante ajoutée
    };
    return?: {
        id: number;
        flightId: number;
        from: string;
        to: string;
        date: string;
        departure_time: string;
        arrival_time: string;
        price: number;
        noflight: string;
        type: "plane" | "helicopter"; // Ajouté ici
        typev: "onway" | "roundtrip"; // Propriété manquante ajoutée
    };
    passengers: {
        adults: number;
        children: number;
        infants: number;
    };
    passengersData: any;
    tripType: string;
    totalPrice: number;
    fromCity: string;
    toCity: string;
    from: string;
    to: string;
    adults: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        [key: string]: any;
        tripType: string;
        totalPrice: number;
        fromCity: string;
        toCity: string;
        from: string;
        to: string;
    }>;
    children?: any[];
    infants?: any[];
}

interface PassengerData {
    outbound: {
        id: number;
        flightId: number;
        from: string;
        to: string;
        date: string;
        departure_time: string;
        arrival_time: string;
        price: number;
        noflight: string;
        type: "plane" | "helicopter"; // Ajouté ici
        typev: "onway" | "roundtrip"; // Propriété manquante ajoutée
    };
    return?: {
        id: number;
        flightId: number;
        from: string;
        to: string;
        date: string;
        departure_time: string;
        arrival_time: string;
        price: number;
        noflight: string;
        type: "plane" | "helicopter"; // Ajouté ici
        typev: "onway" | "roundtrip"; // Propriété manquante ajoutée
    };
    passengers: {
        adults: number;
        children: number;
        infants: number;
    };
    tripType: string;
    tabType: string;
    from: string;
    to: string;
    fromCity: string;
    toCity: string;
    departureDate: string;
    returnDate?: string;
    totalPrice: number;
}

interface Passenger {
    firstName: string;
    lastName: string;
    dob: string;
    gender?: string;
    title?: string;

    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    nationality?: string;
    middle?: string;
    type?: string;
    typeV?: string;
    typeVol?: string;
    typeVolV?: string;
}

interface PassengersData {
    adults?: Passenger[];
    children?: Passenger[];
    infants?: Passenger[];
}

interface TransformedPassenger {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    type: "adult" | "child" | "infant";
    typeVol: "plane" | "helicopter";
    typeVolV: "onway" | "roundtrip";

    middleName?: string;
    gender?: string;
    title?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    nationality?: string;
}

interface SuccessData {
    bookingId: number;
    reference: string;
}

interface StripePaymentFormProps {
    totalPrice: number;
    paymentData: PaymentData;
    onSuccess: (data: SuccessData) => void; // Signature modifiée
}
const Stepper = ({ currentStep }: { currentStep: number }) => {
    return (
        <div className="relative mb-10 px-6">
            <div className="absolute left-[14%] right-[14%] top-2 z-0 h-0.5 bg-blue-500" />
            <div className="relative z-10 flex items-center justify-between">
                {["Flight", "Passenger", "Pay", "Confirmation"].map((step, idx) => {
                    const isCompleted = idx < currentStep;
                    const isActive = idx === currentStep;

                    return (
                        <div
                            key={idx}
                            className="flex w-1/4 flex-col items-center text-center text-sm"
                        >
                            <div
                                className={`relative z-10 mb-2 h-4 w-4 rounded-full border-2 ${
                                    isActive
                                        ? "border-blue-500 bg-red-500"
                                        : isCompleted
                                          ? "border-blue-500 bg-blue-500"
                                          : "border-blue-500 bg-slate-50"
                                }`}
                            >
                                {isCompleted && (
                                    <svg
                                        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span
                                className={`whitespace-nowrap ${
                                    isActive ? "font-bold text-blue-500" : isCompleted ? "text-blue-500" : "text-blue-500"
                                }`}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
const BookingSummary = ({ bookingData }: { bookingData: PassengerData }) => {
   const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");

    return (
        <div className="rounded-xl border border-blue-500 bg-white p-4 shadow-lg">
            <div className="mx-auto w-fit rounded-full border border-blue-500 bg-white px-4 py-1 text-sm font-bold text-red-600">
                {bookingData.tripType === "roundtrip" ? "Round Trip" : "One Way"}
            </div>

            <div className="relative mt-4 flex flex-col items-start pl-6">
                <div className="absolute bottom-3 left-0 top-3 z-0 h-[60px] w-0.5 bg-red-600"></div>
                <div className="z-10 mb-6 flex items-start gap-3">
                    <div className="relative -left-8 z-10 mt-0.5">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-red-600"></div>
                    </div>
                    <div className="-ml-7">
                        <p className="font-bold text-black">
                            {bookingData.outbound.departure_time} - {bookingData.fromCity} ({bookingData.from})
                        </p>
                        <p className="mt-1 text-[11px] text-black">Flight #{bookingData.outbound.noflight}</p>
                    </div>
                </div>

                <div className="z-10 flex items-start gap-3">
                    <div className="-ml-9 text-lg leading-none text-red-600">
                        <MapPin />
                    </div>
                    <p className="font-bold text-black">
                        {bookingData.outbound.arrival_time} - {bookingData.toCity} ({bookingData.to})
                    </p>
                </div>
            </div>

            {bookingData.return && (
                <div className="relative mt-6 flex flex-col items-start pl-6">
                    <div className="absolute bottom-3 left-0 top-3 z-0 h-[60px] w-0.5 bg-red-600"></div>
                    <div className="z-10 mb-6 flex items-start gap-3">
                        <div className="relative -left-8 z-10 mt-0.5">
                            <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-red-600"></div>
                        </div>
                        <div className="-ml-7">
                            <p className="font-bold text-black">
                                {bookingData.return.departure_time} - {bookingData.toCity} ({bookingData.to})
                            </p>
                            <p className="mt-1 text-[11px] text-black">Flight #{bookingData.return.noflight}</p>
                        </div>
                    </div>

                    <div className="z-10 flex items-start gap-3">
                        <div className="-ml-9 text-lg leading-none text-red-600">
                            <MapPin />
                        </div>
                        <p className="font-bold text-black">
                            {bookingData.return.arrival_time} - {bookingData.fromCity} ({bookingData.from})
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-4">
                <p className="mb-2 text-base font-bold text-red-600">Booking Details</p>
                <div className="grid grid-cols-2 gap-y-1 text-[13px] font-semibold text-black">
                    <p>Departure</p>
                    <p className="text-right">{formatDate(bookingData.departureDate)}</p>
                    {bookingData.returnDate && (
                        <>
                            <p>Return</p>
                            <p className="text-right">{formatDate(bookingData.returnDate)}</p>
                        </>
                    )}
                    <p>Adults</p>
                    <p className="text-right">{bookingData.passengers.adults}</p>
                    <p>Children</p>
                    <p className="text-right">{bookingData.passengers.children}</p>
                    <p>Infants</p>
                    <p className="text-right">{bookingData.passengers.infants}</p>
                </div>
            </div>
        </div>
    );
};
// Configurez votre clé publique Stripe

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "your_paypal_client_id";
const stripePromise = loadStripe("pk_test_51IxWQcCWPjcmZuUZHSKwNZssNdyHCo9ny1vffTyTQCsVk1ZVBeCQNQih3H7hlRUgV92heLSS09WFaH8ieoSs6P0y00my7uI9Cl");

export function transformPassengers(
    passengersData: PassengersData,
    travelType: "plane" | "helicopter",
    travelTypeV: "onway" | "roundtrip",
): TransformedPassenger[] {
    if (!passengersData?.adults?.length) {
        throw new Error("Au moins un adulte est requis");
    }

    const mainAdult = passengersData.adults[0];

    return [
        // Adults
        ...(passengersData.adults || []).map(
            (adult): TransformedPassenger => ({
                firstName: adult.firstName,
                lastName: adult.lastName,
                dateOfBirth: adult.dob,
                type: "adult",
                typeVol: travelType,
                typeVolV: travelTypeV,
                gender: adult.gender || "other",
                title: adult.title || "mr",
                email: adult.email || mainAdult.email,
                phone: adult.phone || mainAdult.phone,
                address: adult.address || mainAdult.address,
                country: adult.country || mainAdult.country,
                nationality: adult.nationality || mainAdult.nationality,
                ...(adult.middle && { middleName: adult.middle }),
            }),
        ),

        // Children
        ...(passengersData.children || []).map(
            (child): TransformedPassenger => ({
                firstName: child.firstName,
                lastName: child.lastName,
                dateOfBirth: child.dob,
                type: "child",
                typeVol: travelType,
                typeVolV: travelTypeV,
                gender: child.gender || "other",
                title: child.title || "mr",
                email: mainAdult.email,
                phone: mainAdult.phone,
                address: child.address || mainAdult.address,
                country: child.country || mainAdult.country,
                nationality: child.nationality || mainAdult.nationality,
                ...(child.middle && { middleName: child.middle }),
            }),
        ),

        // Infants
        ...(passengersData.infants || []).map(
            (infant): TransformedPassenger => ({
                firstName: infant.firstName,
                lastName: infant.lastName,
                dateOfBirth: infant.dob,
                type: "infant",
                typeVol: travelType,
                typeVolV: travelTypeV,
                gender: infant.gender || "other",
                title: infant.title || "mr",
                email: mainAdult.email,
                phone: mainAdult.phone,
                address: infant.address || mainAdult.address,
                country: infant.country || mainAdult.country,
                nationality: infant.nationality || mainAdult.nationality,
                ...(infant.middle && { middleName: infant.middle }),
            }),
        ),
    ];
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ totalPrice, onSuccess, paymentData }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const createPaymentIntent = async () => {
        try {
            const passengerCount =
                (paymentData.passengersData.adults?.length || 0) +
                (paymentData.passengersData.children?.length || 0) +
                (paymentData.passengersData.infants?.length || 0);

            const response = await fetch("https://steve-airways-production.up.railway.app/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    flightId: paymentData.outbound.flightId,
                    returnFlightId: paymentData.return?.flightId,
                    passengerCount,
                    email: paymentData.passengersData.adults[0].email,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || "Échec de la création du paiement");
            }

            return await response.json();
        } catch (error) {
            console.error("Détails de l'erreur:", error);
            throw error;
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        setError(null);

        let bookingRequest;

        try {
            if (!stripe || !elements) throw new Error("Stripe n'est pas initialisé");

            const { clientSecret } = await createPaymentIntent();

            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error("Carte de paiement non trouvée");

            const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        email: paymentData.passengersData.adults[0].email,
                        name: `${paymentData.passengersData.adults[0].firstName} ${paymentData.passengersData.adults[0].lastName}`,
                        address: {
                            city: paymentData.passengersData.adults[0].address?.city,
                            country: paymentData.passengersData.adults[0].country,
                        },
                        phone: paymentData.passengersData.adults[0].phone,
                    },
                },
            });

            if (paymentError) throw paymentError;
            if (!paymentIntent || paymentIntent.status !== "succeeded") throw new Error("Le paiement n'a pas abouti");

            const transformedPassengers = transformPassengers(paymentData.passengersData, paymentData.outbound.type, paymentData.outbound.typev);
            if (!transformedPassengers?.length) throw new Error("Données passagers invalides");

            bookingRequest = {
                paymentIntentId: paymentIntent.id,
                passengers: transformedPassengers,
                contactInfo: {
                    email: paymentData.passengersData.adults[0].email,
                    phone: paymentData.passengersData.adults[0].phone,
                },
                flightId: paymentData.outbound.flightId,
                returnFlightId: paymentData.return?.flightId,
                totalPrice: totalPrice,
                departureDate: paymentData.outbound.date,
                returnDate: paymentData.return?.date,
            };

            const response = await fetch("https://steve-airways-production.up.railway.app/api/confirm-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingRequest),
            });

            if (!response.ok) throw new Error("Échec de la réservation");

            const responseData = await response.json();

            onSuccess({
                bookingId: responseData.bookingId,
                reference: responseData.bookingReference,
            });
        } catch (err: unknown) {
            setError("Échec de la réservation. Veuillez réessayer ou contacter le support.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            <div className="rounded-md border p-3">
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: "16px",
                                color: "#424770",
                                "::placeholder": {
                                    color: "#aab7c4",
                                },
                            },
                            invalid: {
                                color: "#9e2146",
                            },
                        },
                    }}
                />
            </div>

            {error && <div className="mt-2 text-sm text-red-500">{error}</div>}

            <button
                type="submit"
                disabled={!stripe || processing}
                className={`w-full rounded-md px-4 py-3 font-medium ${
                    processing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                } text-white transition-colors`}
            >
                {processing ? "Traitement en cours..." : `Payer ${totalPrice.toFixed(2)}$`}
            </button>
        </form>
    );
};

// Composant PayPal
const PayPalPayment = ({ totalPrice, onSuccess }: { totalPrice: number; onSuccess: () => void }) => {
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            <PayPalButtons
                style={{
                    layout: "vertical",
                    color: "blue",
                    shape: "rect",
                    label: "pay",
                    height: 48,
                }}
                createOrder={(_data, actions) => {
                    return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                            {
                                amount: {
                                    value: totalPrice.toFixed(2),
                                    currency_code: "USD",
                                    breakdown: {
                                        item_total: {
                                            value: totalPrice.toFixed(2),
                                            currency_code: "USD",
                                        },
                                    },
                                },
                                items: [
                                    {
                                        name: "Flight Booking",
                                        description: "Airline ticket reservation",
                                        quantity: "1",
                                        unit_amount: {
                                            value: totalPrice.toFixed(2),
                                            currency_code: "USD",
                                        },
                                    },
                                ],
                            },
                        ],
                        application_context: {
                            shipping_preference: "NO_SHIPPING",
                            user_action: "PAY_NOW",
                        },
                    });
                }}
                onApprove={async (data, actions) => {
                    try {
                        const details = await actions.order?.capture();
                        console.log("Payment completed:", details);

                        await fetch("/api/confirm-paypal-payment", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                orderID: data.orderID,
                                details: details,
                            }),
                        });

                        onSuccess();
                    } catch (err) {
                        console.error("Payment error:", err);
                        setError("Payment processing failed. Please try again.");
                    }
                }}
                onError={(err) => {
                    console.error("PayPal error:", err);
                    setError("An error occurred with PayPal. Please try another payment method.");
                }}
            />
            {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
        </div>
    );
};

// Page de paiement principale
export default function Pay() {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentStep] = useState(2);
    const bookingData = location.state as PassengerData;
    const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);
    const paymentData = location.state as PaymentData;

    useEffect(() => {
        if (!paymentData) {
            navigate("/flights", { state: { error: "No booking data found" } });
        } else {
            setLoading(false);
        }
    }, [paymentData, navigate]);

    const handlePaymentSuccess = async (successData: { bookingId: number; reference: string }) => {
        setPaymentSuccess(true);

        // Redirection après un délai pour montrer le message de succès
        setTimeout(() => {
            navigate("/confirmation", {
                state: {
                    bookingData: {
                        ...paymentData,
                        bookingReference: successData.reference, 
                    },
                    paymentMethod,
                },
            });
        }, 3000);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div
                        className="spinner-border inline-block h-8 w-8 animate-spin rounded-full border-4"
                        role="status"
                    >
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-4">Loading payment details...</p>
                </div>
            </div>
        );
    }

    if (!paymentData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center text-red-500">
                    <p>No booking data found. Please start your booking again.</p>
                    <button
                        onClick={() => navigate("/flights")}
                        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        Return to Flights
                    </button>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <svg
                            className="h-8 w-8 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                            ></path>
                        </svg>
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-800">Payment Successful!</h2>
                    <p className="mb-6 text-gray-600">Your booking has been confirmed. Redirecting to booking details...</p>
                    <div className="h-2.5 w-full rounded-full bg-gray-200">
                        <div
                            className="h-2.5 animate-pulse rounded-full bg-blue-600"
                            style={{ width: "100%" }}
                        ></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative z-10 mt-[-100px] w-full rounded bg-white p-6 shadow-lg">
            <Stepper currentStep={currentStep} />
            <div className="w-full">
                <div className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 bg-yellow-400 px-6 py-5">
                        <h2 className="text-2xl font-bold text-gray-800">Complete Your Payment</h2>
                        <p className="mt-1 text-gray-600">
                            Total Amount: <span className="font-bold text-red-600">${paymentData.totalPrice.toFixed(2)}</span>
                        </p>
                    </div>

                    <div className="grid gap-8 p-6 md:grid-cols-3">
                        <div className="md:col-span-2">
                            <div className="mb-6">
                                <h3 className="mb-4 text-lg font-medium text-gray-900">Payment Method</h3>

                                <div className="mb-6 flex space-x-4">
                                    <label className="flex cursor-pointer items-center rounded-lg border border-gray-200 p-4 hover:border-blue-500">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={paymentMethod === "stripe"}
                                            onChange={() => setPaymentMethod("stripe")}
                                            className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="ml-3 flex items-center">
                                            <img
                                                src="/credit-card-icons.png"
                                                alt="Credit Cards"
                                                className="mr-3 h-8 w-auto"
                                            />
                                        </div>
                                    </label>

                                    {/* Option PayPal */}
                                    <label className="flex cursor-pointer items-center rounded-lg border border-gray-200 p-4 hover:border-blue-500">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={paymentMethod === "paypal"}
                                            onChange={() => setPaymentMethod("paypal")}
                                            className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="ml-3 flex items-center">
                                            <img
                                                src="/paypal-logo.png"
                                                alt="PayPal"
                                                className="mr-3 h-8 w-auto"
                                            />
                                        </div>
                                    </label>
                                </div>

                                {error && (
                                    <div className="mb-6 border-l-4 border-red-400 bg-red-50 p-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg
                                                    className="h-5 w-5 text-red-400"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-red-700">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === "stripe" ? (
                                    <Elements stripe={stripePromise}>
                                        <StripePaymentForm
                                            totalPrice={paymentData.totalPrice}
                                            onSuccess={handlePaymentSuccess}
                                            paymentData={paymentData} 
                                        />
                                    </Elements>
                                ) : (
                                    <PayPalScriptProvider
                                        options={{
                                            clientId: paypalClientId || "", // obligatoire et non null
                                            components: "buttons",
                                            currency: "USD",
                                        }}
                                    >
                                        <PayPalPayment
                                            totalPrice={paymentData.totalPrice}
                                            onSuccess={() =>
                                                handlePaymentSuccess({
                                                    bookingId: 0, // à remplacer par l'ID réel
                                                    reference: "TEMPORARY_REF", // à remplacer par la référence réelle
                                                })
                                            }
                                        />
                                    </PayPalScriptProvider>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <BookingSummary bookingData={bookingData} />
                        </div>
                    </div>

                    <div className="flex justify-between px-6 py-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <ChevronLeft className="-ml-1 mr-2 h-5 w-5 text-white" />
                            Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
