import { useState } from "react";
import emailjs from '@emailjs/browser';
import ReCAPTCHA from 'react-google-recaptcha';

export const CharterEmail = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        departure: '',
        destination: '',
        departureDate: '',
        returnDate: '',
        passengers: '',
        notes: '',
    });

    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCaptchaChange = (value: string | null) => {
        setCaptchaVerified(Boolean(value));
    };

    const validateForm = () => {
        if (!formData.fullName || !formData.email || !formData.phone || !formData.departure || !formData.destination || !formData.departureDate) {
            setFormError('Please fill in all required fields.');
            return false;
        }
        if (!captchaVerified) {
            setFormError('Please verify the captcha.');
            return false;
        }
        setFormError('');
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        emailjs
          .send(
            'service_4vxqfpd', // Replace with your EmailJS service ID
            'template_7cppptp', // Replace with your EmailJS template ID
            formData,
            'yA4Csv93xGMjNAIoP' // Replace with your EmailJS public key
          )
          .then(() => {
            setSuccessMessage('Your inquiry has been submitted successfully!');
            setFormData({
              fullName: '',
              email: '',
              phone: '',
              departure: '',
              destination: '',
              departureDate: '',
              returnDate: '',
              passengers: '',
              notes: '',
            });
            setCaptchaVerified(false);
          })
          .catch(() => {
            setFormError('Failed to send your inquiry. Please try again.');
          });
        alert('Sent!')
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-4">Charter Flight Inquiry</h2>
            {formError && <p className="text-red-500 mb-2">{formError}</p>}
            {successMessage && <p className="text-green-500 mb-2">{successMessage}</p>}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Full Name*</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Email*</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Phone*</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Departure Location*</label>
                    <input
                        type="text"
                        name="departure"
                        value={formData.departure}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Destination Location*</label>
                    <input
                        type="text"
                        name="destination"
                        value={formData.destination}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Departure Date*</label>
                    <input
                        type="date"
                        name="departureDate"
                        value={formData.departureDate}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Return Date (Optional)</label>
                    <input
                        type="date"
                        name="returnDate"
                        value={formData.returnDate}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Number of Passengers</label>
                    <input
                        type="number"
                        name="passengers"
                        value={formData.passengers}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                    ></textarea>
                </div>
                <div className="mb-4">
                    <ReCAPTCHA
                        sitekey="6Lez9pErAAAAAASOQdrrl-2J9fktO9PLqdlNRj6J" // Replace with your reCAPTCHA site key
                        onChange={handleCaptchaChange}
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-900 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                    Submit Inquiry
                </button>
            </form>
        </div>
    );
};
