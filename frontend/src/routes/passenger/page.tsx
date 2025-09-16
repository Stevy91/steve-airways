import { useState, useCallback, memo } from "react";
import { ChevronLeft, MapPin } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { COUNTRIES } from "../../constants/country";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { HeroSection } from "../../layouts/HeroSection";
import { HeroSectionSearch } from "../../layouts/HeroSectionSearch";
import SessionTimeout from "../../components/SessionTimeout";

interface Flight {
    id: number;
    flightId: number;
    from: string;
    to: string;
    date: string;
    departure_time: string;
    arrival_time: string;
    price: number;
    noflight: string;
    type: "plane" | "helicopter";
    typev: "onway" | "roundtrip";
}
interface PassengerFormData {
    firstName: string;
    lastName: string;
    dob: string;
    gender?: string; // Optional for infants
    title?: string; // Only for adults
    nationality?: string;
    country?: string; // Only for adults
    phone?: string; // Only for adults
    email?: string; // Only for adults
    address?: string; // Only for adults
    middle?: string;
}

interface PassengerData {
    outbound: Flight;
    return?: Flight;
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

interface ValidationErrors {
    adults: Record<number, Partial<Record<keyof PassengerFormData, string>>>;
    children: Record<number, Partial<Record<keyof PassengerFormData, string>>>;
    infants: Record<number, Partial<Record<keyof PassengerFormData, string>>>;
}

const Stepper = ({ currentStep }: { currentStep: number }) => {
    const { t, i18n } = useTranslation();
    return (
        <div className="relative mb-10 px-6">
            {/* <div className="absolute left-[14%] right-[14%] top-2 z-0 h-0.5 bg-blue-900" /> */}
            <div className="absolute left-[14%] right-[14%] top-2 z-10 hidden h-0.5 bg-blue-900 md:block" />

            <div className="relative z-10 flex items-center justify-between">
                {[t("Flight"), t("Passenger"), t("Pay"), "Confirmation"].map((step, idx) => {
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
                                        ? "border-blue-900 bg-red-900"
                                        : isCompleted
                                          ? "border-blue-900 bg-blue-900"
                                          : "border-blue-900 bg-slate-50"
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
                                    isActive ? "font-bold text-blue-900" : isCompleted ? "text-blue-900" : "text-blue-900"
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

interface PassengerFormProps {
    type: "adults" | "children" | "infants";
    index: number;
    passenger: PassengerFormData;
    isChild?: boolean;
    isInfant?: boolean;
    onChange: (type: "adults" | "children" | "infants", index: number, field: keyof PassengerFormData, value: string) => void;
    errors?: Partial<Record<keyof PassengerFormData, string>>;
}

const PassengerForm = memo(({ type, index, passenger, isChild = false, isInfant = false, onChange, errors = {} }: PassengerFormProps) => {
    const { t, i18n } = useTranslation();
    return (
        <div className="mb-8 rounded-lg border p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">
                {isInfant ? `${t("Infant")} ${index + 1}` : isChild ? `${t("Child")} ${index + 1}` : `${t("Adult Passenger")} ${index + 1}`}
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-1 block font-medium text-gray-600">{t("First Name")} *</label>
                    <div className={`flex items-center rounded-full border p-2 ${errors.firstName ? "border-red-900" : ""}`}>
                        <input
                            type="text"
                            value={passenger.firstName}
                            placeholder={t("First Name")}
                            onChange={(e) => onChange(type, index, "firstName", e.target.value)}
                            className="input-style w-full bg-transparent outline-none"
                            required
                        />
                    </div>
                    {errors.firstName && <p className="mt-1 text-sm text-red-900">{errors.firstName}</p>}
                </div>
                <div>
                    <label className="mb-1 block font-medium text-gray-600">{t("Middle Name")}</label>
                    <div className="flex items-center rounded-full border p-2">
                        <input
                            type="text"
                            value={passenger.middle}
                            placeholder={t("Middle Name")}
                            onChange={(e) => onChange(type, index, "middle", e.target.value)}
                            className="input-style w-full bg-transparent outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-1 block font-medium text-gray-600">{t("Last Name")} *</label>
                    <div className={`flex items-center rounded-full border p-2 ${errors.lastName ? "border-red-900" : ""}`}>
                        <input
                            type="text"
                            value={passenger.lastName}
                            placeholder={t("Last Name")}
                            onChange={(e) => onChange(type, index, "lastName", e.target.value)}
                            className="input-style w-full bg-transparent outline-none"
                            required
                        />
                    </div>
                    {errors.lastName && <p className="mt-1 text-sm text-red-900">{errors.lastName}</p>}
                </div>

                <div>
                    <label className="mb-1 block font-medium text-gray-600">{t("Date of Birth")} *</label>
                    <div className={`flex items-center rounded-full border p-2 ${errors.dob ? "border-red-900" : ""}`}>
                        <input
                            type="date"
                            value={passenger.dob}
                            onChange={(e) => onChange(type, index, "dob", e.target.value)}
                            className="input-style w-full bg-transparent outline-none"
                            required
                        />
                    </div>
                    {errors.dob && <p className="mt-1 text-sm text-red-900">{errors.dob}</p>}
                </div>

                {!isInfant && (
                    <div>
                        <label className="mb-1 block font-medium text-gray-600">{t("Gender")} *</label>
                        <div className={`flex items-center rounded-full border p-2 ${errors.gender ? "border-red-900" : ""}`}>
                            <select
                                value={passenger.gender}
                                onChange={(e) => onChange(type, index, "gender", e.target.value)}
                                className="input-style w-full bg-transparent outline-none"
                                required
                            >
                                <option value="">Select</option>
                                <option value="male">{t("Male")}</option>
                                <option value="female">{t("Female")}</option>
                                <option value="other">{t("Other")}</option>
                            </select>
                        </div>
                        {errors.gender && <p className="mt-1 text-sm text-red-900">{errors.gender}</p>}
                    </div>
                )}

                {/* Ajout du champ Nationality pour les enfants */}
                {isChild && !isInfant && (
                    <div>
                        <label className="mb-1 block font-medium text-gray-600">{t("Nationality")} *</label>
                        <div className={`flex items-center rounded-full border p-2 ${errors.nationality ? "border-red-900" : ""}`}>
                            <input
                                type="text"
                                value={passenger.nationality}
                                placeholder={t("Nationality")}
                                onChange={(e) => onChange(type, index, "nationality", e.target.value)}
                                className="input-style w-full bg-transparent outline-none"
                                required
                            />
                        </div>
                        {errors.nationality && <p className="mt-1 text-sm text-red-900">{errors.nationality}</p>}
                    </div>
                )}

                {!isChild && !isInfant && (
                    <>
                        <div>
                            <label className="mb-1 block font-medium text-gray-600">{t("Title")} *</label>
                            <div className={`flex items-center rounded-full border p-2 ${errors.title ? "border-red-900" : ""}`}>
                                <select
                                    value={passenger.title}
                                    onChange={(e) => onChange(type, index, "title", e.target.value)}
                                    className="input-style w-full bg-transparent outline-none"
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="mr">Mr</option>
                                    <option value="mrs">Mrs</option>
                                    <option value="ms">Ms</option>
                                    <option value="dr">Dr</option>
                                </select>
                            </div>
                            {errors.title && <p className="mt-1 text-sm text-red-900">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block font-medium text-gray-600">{t("Address")} *</label>
                            <div className={`flex items-center rounded-full border p-2 ${errors.address ? "border-red-900" : ""}`}>
                                <input
                                    type="text"
                                    placeholder={t("Address")}
                                    value={passenger.address}
                                    onChange={(e) => onChange(type, index, "address", e.target.value)}
                                    className="input-style w-full bg-transparent outline-none"
                                    required
                                />
                            </div>
                            {errors.address && <p className="mt-1 text-sm text-red-900">{errors.address}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block font-medium text-gray-600">{t("Country / Region of Residence")} *</label>
                            <div className={`flex items-center rounded-full border p-2 ${errors.country ? "border-red-900" : ""}`}>
                                <select
                                    value={passenger.country}
                                    onChange={(e) => onChange(type, index, "country", e.target.value)}
                                    className="input-style w-full bg-transparent outline-none"
                                    required
                                >
                                    <option value="">Select</option>
                                    {COUNTRIES.map((country) => (
                                        <option
                                            key={country.code}
                                            value={country.code}
                                        >
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.country && <p className="mt-1 text-sm text-red-900">{errors.country}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block font-medium text-gray-600">{t("Nationality")} *</label>
                            <div className={`flex items-center rounded-full border p-2 ${errors.nationality ? "border-red-900" : ""}`}>
                                <input
                                    type="text"
                                    value={passenger.nationality}
                                    placeholder={t("Nationality")}
                                    onChange={(e) => onChange(type, index, "nationality", e.target.value)}
                                    className="input-style w-full bg-transparent outline-none"
                                    required
                                />
                            </div>
                            {errors.nationality && <p className="mt-1 text-sm text-red-900">{errors.nationality}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block font-medium text-gray-600">{t("Phone Number")} *</label>
                            <div className={`flex items-center rounded-full border p-2 ${errors.phone ? "border-red-900" : ""}`}>
                                <input
                                    type="tel"
                                    placeholder={t("Phone Number")}
                                    value={passenger.phone}
                                    onChange={(e) => onChange(type, index, "phone", e.target.value)}
                                    className="input-style w-full bg-transparent outline-none"
                                    required
                                />
                            </div>
                            {errors.phone && <p className="mt-1 text-sm text-red-900">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block font-medium text-gray-600">{t("Email Address")} *</label>
                            <div className={`flex items-center rounded-full border p-2 ${errors.email ? "border-red-900" : ""}`}>
                                <input
                                    type="email"
                                    placeholder={t("Email Address")}
                                    value={passenger.email}
                                    onChange={(e) => onChange(type, index, "email", e.target.value)}
                                    className="input-style w-full bg-transparent outline-none"
                                    required
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-900">{errors.email}</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

const BookingSummary = ({ bookingData }: { bookingData: PassengerData }) => {
    const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");
    const { t, i18n } = useTranslation();

    return (
        <div className="rounded-xl border border-blue-900 bg-white p-4 shadow-lg">
            <div className="mx-auto w-fit rounded-full border border-blue-900 bg-white px-4 py-1 text-sm font-bold text-red-900">
                {bookingData.tripType === "roundtrip" ? t("Round Trip") : t("One Way")}
            </div>

            <div className="relative mt-4 flex flex-col items-start pl-6">
                {/* <div className="absolute bottom-3 left-0 top-3 z-0 h-[85px] w-0.5 bg-red-600"></div> */}
                <div className="z-10 mb-6 flex items-start gap-3">
                    <div className="relative -left-8 z-10 mt-0.5">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-900 bg-red-900"></div>
                    </div>
                    <div className="-ml-7">
                        <p className="font-bold text-black">
                            {bookingData.outbound.departure_time} - {bookingData.fromCity} ({bookingData.from})
                        </p>
                        <p className="mt-1 text-[11px] text-black">
                            {t("Flight")} <span className="font-bold text-red-900"># {bookingData.outbound.noflight}</span>
                        </p>
                    </div>
                </div>

                <div className="z-10 flex items-start gap-3">
                    <div className="-ml-9 text-lg leading-none text-red-900">
                        <MapPin />
                    </div>
                    <p className="font-bold text-black">
                        {bookingData.outbound.arrival_time} - {bookingData.toCity} ({bookingData.to})
                    </p>
                </div>
            </div>

            {bookingData.return && (
                <div className="relative mt-6 flex flex-col items-start pl-6">
                    {/* <div className="absolute bottom-3 left-0 top-3 z-0 h-[79px] w-0.5 bg-red-600"></div> */}
                    <div className="z-10 mb-6 flex items-start gap-3">
                        <div className="relative -left-8 z-10 mt-0.5">
                            <div className="h-4 w-4 rounded-full border-2 border-blue-900 bg-red-900"></div>
                        </div>
                        <div className="-ml-7">
                            <p className="font-bold text-black">
                                {bookingData.return.departure_time} - {bookingData.toCity} ({bookingData.to})
                            </p>
                            <p className="mt-1 text-[11px] text-black">
                                {t("Flight")} <span className="font-bold text-red-900"># {bookingData.return.noflight}</span>
                            </p>
                        </div>
                    </div>

                    <div className="z-10 flex items-start gap-3">
                        <div className="-ml-9 text-lg leading-none text-red-900">
                            <MapPin />
                        </div>
                        <p className="font-bold text-black">
                            {bookingData.return.arrival_time} - {bookingData.fromCity} ({bookingData.from})
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-4">
                <p className="mb-2 text-base font-bold text-red-900">{t("Booking Details")}</p>
                <div className="grid grid-cols-2 gap-y-1 text-[13px] font-semibold text-black">
                    <p>{t("Departure")}</p>
                    <p className="text-right">{formatDate(bookingData.departureDate)}</p>
                    {bookingData.returnDate && (
                        <>
                            <p>{t("Return")}</p>
                            <p className="text-right">{formatDate(bookingData.returnDate)}</p>
                        </>
                    )}
                    <p>{t("Adults")}</p>
                    <p className="text-right">{bookingData.passengers.adults}</p>
                    <p>{t("Children")}</p>
                    <p className="text-right">{bookingData.passengers.children}</p>
                    <p>{t("Infants")}</p>
                    <p className="text-right">{bookingData.passengers.infants}</p>
                </div>
            </div>

            {/* <div className="mt-4 text-center text-2xl font-extrabold text-red-600">${bookingData.totalPrice}</div> */}
        </div>
    );
};

const FlightSummaryCard = ({ bookingData }: { bookingData: PassengerData }) => {
    const formatDate = (dateString: string) => format(parseISO(dateString), "EEE, dd MMM");
    const { t, i18n } = useTranslation();

    return (
        <div className="mb-10 flex items-center justify-between rounded-md bg-blue-400 p-4 text-black shadow-sm">
            <div className="space-y-1">
                <p className="font-semibold">
                    {bookingData.fromCity} ({bookingData.from}) → {bookingData.toCity} ({bookingData.to})
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                    <span>{formatDate(bookingData.departureDate)}</span>
                    {bookingData.returnDate && (
                        <>
                            <span>|</span>
                            <span>{formatDate(bookingData.returnDate)}</span>
                        </>
                    )}
                    <span>|</span>
                    <span>
                        {bookingData.passengers.adults} {t("Adult")}
                        {bookingData.passengers.adults > 1 ? "s" : ""}
                        {bookingData.passengers.children > 0 && (
                            <>
                                , {bookingData.passengers.children} {t("Child")}
                                {bookingData.passengers.children > 1 ? t("ren") : ""}
                            </>
                        )}
                        {bookingData.passengers.infants > 0 && (
                            <>
                                , {bookingData.passengers.infants} {t("Infant")}
                                {bookingData.passengers.infants > 1 ? "s" : ""}
                            </>
                        )}
                    </span>
                    <span>|</span>
                    <span>{bookingData.tripType === "roundtrip" ? t("Round Trip") : t("One Way")}</span>
                    <span>|</span>
                    <span>{bookingData.tabType === "helicopter" ? t("Helicopter") : t("Air Plane")}</span>
                </div>
            </div>
            <div className="text-right">
                <p className="text-xs font-semibold uppercase text-gray-700">{t("Total Price")}</p>
                <div className="flex items-center text-lg font-bold">
                    <span>${bookingData.totalPrice}</span>
                    <span className="ml-1 text-sm font-medium">USD</span>
                </div>
            </div>
        </div>
    );
};

export default function Passenger() {
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang
    const navigate = useNavigate();
    const location = useLocation();
    const bookingData = location.state as PassengerData;
    const { t, i18n } = useTranslation();
    const [currentStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
        adults: {},
        children: {},
        infants: {},
    });

    const [passengersData, setPassengersData] = useState(() => {
        const initialAdultData: PassengerFormData = {
            firstName: "",
            lastName: "",
            dob: "",
            gender: "",
            title: "",
            nationality: "",
            country: "",
            phone: "",
            email: "",
            address: "",
            middle: "",
        };

        return {
            adults: Array(bookingData.passengers.adults)
                .fill(0)
                .map(() => ({ ...initialAdultData })),
            children: Array(bookingData.passengers.children)
                .fill(0)
                .map(() => ({
                    firstName: "",
                    lastName: "",
                    dob: "",
                    gender: "",
                    nationality: "",
                })),

            infants: Array(bookingData.passengers.infants)
                .fill(0)
                .map(() => ({
                    firstName: "",
                    lastName: "",
                    dob: "",
                })),
        };
    });

    const handlePassengerChange = useCallback(
        (type: "adults" | "children" | "infants", index: number, field: keyof PassengerFormData, value: string) => {
            setPassengersData((prev) => {
                const updatedPassengers = [...prev[type]];
                updatedPassengers[index] = {
                    ...updatedPassengers[index],
                    [field]: value,
                };
                return {
                    ...prev,
                    [type]: updatedPassengers,
                };
            });

            // Clear validation error when field is edited
            if (validationErrors[type]?.[index]?.[field]) {
                setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    if (newErrors[type]?.[index]) {
                        delete newErrors[type][index][field];
                        if (Object.keys(newErrors[type][index]).length === 0) {
                            delete newErrors[type][index];
                        }
                    }
                    return newErrors;
                });
            }
        },
        [validationErrors],
    );

    const validateAllPassengers = (): boolean => {
        let isValid = true;
        const newErrors: ValidationErrors = { adults: {}, children: {}, infants: {} };

        // Helper pour vérifier les dates
        const validateAge = (dob: string, minAge?: number, maxAge?: number): string | undefined => {
            if (!dob) return t("Date of birth is required");

            const dobDate = new Date(dob);
            const today = new Date();

            if (minAge !== undefined) {
                const minDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
                if (dobDate > minDate) return `${t("Must be at least")} ${minAge} ${t("years old")}`;
            }

            if (maxAge !== undefined) {
                const maxDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
                if (dobDate < maxDate) return `${t("Must be younger than")} ${maxAge} ${t("years")}`;
            }

            return undefined;
        };

        // Validate adults
        passengersData.adults.forEach((adult, index) => {
            const errors: Partial<Record<keyof PassengerFormData, string>> = {};

            if (!adult.firstName?.trim()) errors.firstName = t("Required");
            if (!adult.lastName?.trim()) errors.lastName = t("Required");

            const adultAgeError = validateAge(adult.dob, 12);
            if (adultAgeError) errors.dob = adultAgeError;

            if (!adult.gender) errors.gender = t("Required");
            if (!adult.title) errors.title = t("Required");
            if (!adult.address?.trim()) errors.address = t("Required");
            if (!adult.country) errors.country = t("Required");
            if (!adult.nationality?.trim()) errors.nationality = t("Required");
            if (!adult.phone?.trim()) errors.phone = t("Required");

            if (!adult.email?.trim()) {
                errors.email = t("Required");
            } else if (!/^\S+@\S+\.\S+$/.test(adult.email)) {
                errors.email = "Invalid email";
            }

            if (Object.keys(errors).length > 0) {
                newErrors.adults[index] = errors;
                isValid = false;
            }
        });

        // Validate children
        passengersData.children.forEach((child, index) => {
            const errors: Partial<Record<keyof PassengerFormData, string>> = {};

            if (!child.firstName?.trim()) errors.firstName = t("Required");
            if (!child.lastName?.trim()) errors.lastName = t("Required");

            const childAgeError = validateAge(child.dob, 2, 12);
            if (childAgeError) errors.dob = childAgeError;

            if (!child.gender) errors.gender = t("Required");
            if (!child.nationality?.trim()) errors.nationality = t("Required");

            if (Object.keys(errors).length > 0) {
                newErrors.children[index] = errors;
                isValid = false;
            }
        });

        // Validate infants
        passengersData.infants.forEach((infant, index) => {
            const errors: Partial<Record<keyof PassengerFormData, string>> = {};

            if (!infant.firstName?.trim()) errors.firstName = t("Required");
            if (!infant.lastName?.trim()) errors.lastName = t("Required");

            const infantAgeError = validateAge(infant.dob, undefined, 2);
            if (infantAgeError) errors.dob = infantAgeError;

            if (Object.keys(errors).length > 0) {
                newErrors.infants[index] = errors;
                isValid = false;
            }
        });

        setValidationErrors(newErrors);
        console.log("Validation results:", { isValid, errors: newErrors }); // Debug log
        return isValid;
    };

    if (!bookingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-lg">No booking data found. Please start from the flight selection.</p>
            </div>
        );
    }

    return (
        <>
        {/* SessionTimeout */}
              {/* <SessionTimeout /> */}
            <HeroSectionSearch />
            <div
                className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>

                <div className="px-4">{/* <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Let's Explore the World Together!")}</h1> */}</div>
            </div>
            <div className="mx-auto min-h-screen max-w-7xl px-4 py-12 font-sans">
                <div className="relative z-10 mt-[-100px] w-full rounded bg-white p-6 shadow-lg">
                    <Stepper currentStep={currentStep} />
                    <FlightSummaryCard bookingData={bookingData} />

                    <div className="flex flex-col lg:flex-row">
                        <div className="w-full lg:w-3/4 lg:pr-6">
                            <h2 className="mb-6 text-2xl font-bold text-gray-800">Passenger Information</h2>

                            {passengersData.adults.map((adult, index) => (
                                <PassengerForm
                                    key={`adult-${index}`}
                                    type="adults"
                                    index={index}
                                    passenger={adult}
                                    onChange={handlePassengerChange}
                                    errors={validationErrors.adults[index] || {}}
                                />
                            ))}

                            {passengersData.children.map((child, index) => (
                                <PassengerForm
                                    key={`child-${index}`}
                                    type="children"
                                    index={index}
                                    passenger={child}
                                    isChild
                                    onChange={handlePassengerChange}
                                    errors={validationErrors.children[index] || {}}
                                />
                            ))}

                            {passengersData.infants.map((infant, index) => (
                                <PassengerForm
                                    key={`infant-${index}`}
                                    type="infants"
                                    index={index}
                                    passenger={infant}
                                    isInfant
                                    onChange={handlePassengerChange}
                                    errors={validationErrors.infants[index] || {}}
                                />
                            ))}
                        </div>

                        <div className="mt-6 w-full lg:mt-0 lg:w-1/4">
                            <BookingSummary bookingData={bookingData} />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-6 inline-flex  items-center  rounded-md bg-red-900  py-3 px-2 font-semibold text-white hover:bg-red-700"
                        >
                            <ChevronLeft className="-ml-1 mr-2 h-5 w-5" />
                            {t("Back")}
                        </button>
                        
                        <button
                            onClick={() => {
                                if (validateAllPassengers()) {
                                    const paymentData = {
                                        ...bookingData,
                                        passengersData,
                                        outbound: {
                                            ...bookingData.outbound,
                                            flightId: bookingData.outbound.id,
                                            type: bookingData.tabType === "helicopter" ? "helicopter" : "plane",
                                            typev: bookingData.tripType === "roundtrip" ? "roundtrip" : "onway",
                                        },
                                        return: bookingData.return
                                            ? {
                                                  ...bookingData.return,
                                                  flightId: bookingData.return.id,
                                                  type: bookingData.tabType === "helicopter" ? "helicopter" : "plane",
                                                  typev: bookingData.tripType === "roundtrip" ? "roundtrip" : "onway",
                                              }
                                            : undefined,
                                    };

                                    navigate(`/${currentLang}/pay`, {
                                        state: paymentData,
                                    });
                                } else {
                                    // Scroll vers la première erreur après un léger délai
                                    setTimeout(() => {
                                        const firstError = document.querySelector(".border-red-900");
                                        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }, 100);
                                }
                            }}
                            className="mt-6 w-48 rounded-md bg-red-900 py-3 font-semibold text-white hover:bg-red-700"
                        >
                            {t("Payment")}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
