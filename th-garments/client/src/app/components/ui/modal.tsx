import { X } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "./button";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-2xl",
        lg: "max-w-4xl",
        xl: "max-w-6xl"
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-200`}>
                {/* Header (Windows 11 Style) */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#f3f3f3]/80 backdrop-blur-md border-b border-gray-200 shrink-0">
                    <h2 className="text-sm font-semibold text-gray-700 tracking-tight">{title}</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-md w-7 h-7 p-0 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-200">
                    {children}
                </div>
            </div>
        </div>
    );
}
