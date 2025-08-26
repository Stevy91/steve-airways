import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
    message: string;
    onRetry?: () => void;
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
    return (
        <div className="max-w-md rounded-md bg-red-50 p-4">
            <div className="flex items-center">
                <AlertCircle
                    className="h-5 w-5 text-red-400"
                    aria-hidden="true"
                />
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                    <div className="mt-2 text-sm text-red-700">
                        <p>{message}</p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-3 inline-flex items-center rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none"
                        >
                            Réessayer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
