import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import emailjs from '@emailjs/browser';
import ReCAPTCHA from 'react-google-recaptcha';


export const CharterEmailForm: React.FC = () => {
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(1);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCaptchaChange = (value: string | null) => {
    setCaptchaVerified(Boolean(value));
  };

  const validateStep = () => {
    if (currentStep === 1 && (!formData.fullName || !formData.email || !formData.phone)) {
      setFormError(t('form_error_required'));
      return false;
    }
    if (currentStep === 2 && (!formData.departure || !formData.destination || !formData.departureDate)) {
      setFormError(t('form_error_required'));
      return false;
    }
    setFormError('');
    return true;
  };

  const validateForm = () => {
    if (!captchaVerified) {
      setFormError(t('form_error_captcha') || 'Please verify that you are not a robot.');
      return false;
    }
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.departure ||
      !formData.destination ||
      !formData.departureDate
    ) {
      setFormError(t('form_error_required'));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setFormError('');
    setCurrentStep((s) => s - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    emailjs
      .send(
        'service_o0xgswb', // Your EmailJS service ID
        'template_gj4coqt', // Your EmailJS template ID
        formData,
        'xtVRsPADx5G7O69Bb' // Your EmailJS public key
      )
      .then(() => {
        // Send acknowledgment to user
        emailjs.send(
          'service_o0xgswb',
          'template_qk8dqqh', // Template ID for client confirmation
          formData,
          'xtVRsPADx5G7O69Bb'
        );
        setSuccessMessage(t('form_success') || 'Your inquiry has been submitted successfully!');
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
        setCurrentStep(1);
      })
      .catch(() => {
        setFormError(t('form_error_send') || 'Failed to send your inquiry. Please try again.');
      });
  };

  const steps = [
    { number: 1, title: t('step1_title') },
    { number: 2, title: t('step2_title') },
    { number: 3, title: t('step3_title') },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* STEP INDICATOR */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          {steps.map((step) => (
            <div key={step.number} className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold transition-all
                ${currentStep === step.number
                    ? 'bg-blue-900 text-white scale-110'
                    : currentStep > step.number
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'}`}
              >
                {step.number}
              </div>
              <div className="text-xs mt-1 font-medium">{step.title}</div>
            </div>
          ))}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full relative overflow-hidden">
          <div
            className="h-full bg-blue-900 transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStep - 1) * 50}%` }}
          ></div>
        </div>
      </div>

      {/* ERROR / SUCCESS MESSAGES */}
      {formError && <div className="text-red-600 text-sm mb-4">{formError}</div>}
      {successMessage && <div className="text-green-600 text-sm mb-4">{successMessage}</div>}

      {/* === STEP 1 === */}
      {currentStep === 1 && (
        <>
          <div className="mb-4">
            <label className="block mb-1">{t('full_name')}*</label>
            <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-1">{t('email_form')}*</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-1">{t('phone')}*</label>
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
        </>
      )}

      {/* === STEP 2 === */}
      {currentStep === 2 && (
        <>
          <div className="mb-4">
            <label className="block mb-1">{t('departure')}*</label>
            <input name="departure" value={formData.departure} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-1">{t('destination')}*</label>
            <input name="destination" value={formData.destination} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-1">{t('departure_date')}*</label>
            <input name="departureDate" type="date" value={formData.departureDate} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-1">{t('return_date')}</label>
            <input name="returnDate" type="date" value={formData.returnDate} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
        </>
      )}

      {/* === STEP 3 === */}
      {currentStep === 3 && (
        <>
          <div className="mb-4">
            <label className="block mb-1">{t('passengers')}</label>
            <input name="passengers" type="number" value={formData.passengers} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div className="mb-4">
            <label className="block mb-1">{t('notes')}</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          {/* === RECAPTCHA === */}
          <div className="mb-4">
            <ReCAPTCHA sitekey="6LdU-3grAAAAALQ6CNd1165bR_g_7S5c5MtIJ4dC" onChange={handleCaptchaChange} />
          </div>
        </>
      )}

      {/* === BUTTONS === */}
      <div className="flex justify-between mt-6">
        {currentStep > 1 && (
          <button type="button" onClick={handlePrev} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            {t('prev')}
          </button>
        )}
        {currentStep < 3 ? (
          <button type="button" onClick={handleNext} className="ml-auto px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-600">
            {t('next')}
          </button>
        ) : (
          <button type="submit" className="ml-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            {t('submit')}
          </button>
        )}
      </div>
    </form>
  );
};
