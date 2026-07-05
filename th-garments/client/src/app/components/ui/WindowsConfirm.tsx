import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./alert-dialog";
import { cn } from "./utils";
import { Button } from "./button";

interface ConfirmOptions {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
    isOpen: boolean;
    resolve: (value: boolean) => void;
}

const ConfirmContext = React.createContext<(options: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false));

export const WindowsConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(null);

    const confirm = React.useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({
                ...options,
                isOpen: true,
                resolve,
            });
        });
    }, []);

    const handleClose = (value: boolean) => {
        if (confirmState) {
            confirmState.resolve(value);
            setConfirmState(null);
        }
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {confirmState && (
                <AlertDialog open={confirmState.isOpen} onOpenChange={(open) => !open && handleClose(false)}>
                    <AlertDialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[400px] p-0 border-gray-200 bg-white shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 fade-in-0 duration-200 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0">
                        {/* Header (Windows Style - Light) */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#f3f3f3] border-b border-gray-200">
                            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                                {confirmState.title || "Confirm Action"}
                            </span>
                            <button
                                onClick={() => handleClose(false)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 text-slate-900">
                            <div className="flex gap-4 items-start">
                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div className="space-y-1 mt-1">
                                    <AlertDialogTitle className="hidden">Confirmation</AlertDialogTitle>
                                    <AlertDialogDescription className="text-[14px] text-gray-800 font-medium leading-relaxed">
                                        {confirmState.description || "Are you sure you want to proceed?"}
                                    </AlertDialogDescription>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 pb-6 mt-2">
                            <Button
                                variant="outline"
                                className="h-8 min-w-[80px] text-xs font-bold border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                                onClick={() => handleClose(false)}
                            >
                                {confirmState.cancelText || "No"}
                            </Button>
                            <Button
                                className={cn(
                                    "h-8 min-w-[80px] text-xs font-bold",
                                    confirmState.variant === "destructive"
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : "bg-[#e94560] hover:bg-[#ff4d6d] text-white"
                                )}
                                onClick={() => handleClose(true)}
                            >
                                {confirmState.confirmText || "Yes"}
                            </Button>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = React.useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a WindowsConfirmProvider");
    }
    return context;
};
