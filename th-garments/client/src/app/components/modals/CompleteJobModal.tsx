import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Loader2, Scissors } from "lucide-react";
import { api } from "../../../services/api";
import { toast } from "sonner";

interface CompleteJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: number;
    assignedRolls: number[];
    onSuccess: () => void;
}

export function CompleteJobModal({ isOpen, onClose, jobId, assignedRolls, onSuccess }: CompleteJobModalProps) {
    const [rollsData, setRollsData] = useState<any[]>([]);
    const [remainingLengths, setRemainingLengths] = useState<Record<number, string>>({});
    const [cuttingRate, setCuttingRate] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && assignedRolls && assignedRolls.length > 0) {
            setRemainingLengths({});
            fetchRollsData();
        } else if (isOpen) {
            // No rolls assigned - instantly submit as empty
            setRollsData([]);
        }
    }, [isOpen, assignedRolls]);

    const fetchRollsData = async () => {
        setLoading(true);
        try {
            // We need to fetch details for each assigned roll to get current length
            const promises = assignedRolls.map(id => api.get(`/fabric/cloth-quantity/${id}`));
            const results = await Promise.all(promises);

            const fetchedRolls = results; // API get returns the json directly, not `{ data: ... }` Wait: check api.ts
            setRollsData(fetchedRolls);

            // Initialize remaining lengths to empty strings
            const initialRemaining: Record<number, string> = {};
            fetchedRolls.forEach((r: any) => {
                initialRemaining[r.id] = "";
            });
            setRemainingLengths(initialRemaining);

        } catch (error) {
            console.error("Failed to load roll details:", error);
            toast.error("Failed to load details for assigned rolls.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validate inputs
        if (rollsData.length > 0) {
            for (const roll of rollsData) {
                const remaining = remainingLengths[roll.id];
                if (remaining === undefined || remaining === "") {
                    toast.error(`Please enter remaining length for Roll #${roll.id}`);
                    return;
                }
                const remNum = Number(remaining);
                const curNum = Number(roll.roll_quantity);
                if (isNaN(remNum) || remNum < 0) {
                    toast.error(`Invalid length for Roll #${roll.id}`);
                    return;
                }
                if (remNum > curNum) {
                    toast.error(`Remaining length for Roll #${roll.id} cannot exceed current length (${curNum}m)`);
                    return;
                }
            }
        }

        const rateNum = Number(cuttingRate);
        if (cuttingRate === "" || isNaN(rateNum) || rateNum <= 0) {
            toast.error("Please enter a valid cutting rate (greater than 0)");
            return;
        }

        setIsSubmitting(true);
        try {
            const roll_consumptions = rollsData.map(roll => ({
                roll_id: roll.id,
                remaining_length: Number(remainingLengths[roll.id])
            }));

            await api.put(`/cutting/${jobId}/complete`, {
                roll_consumptions,
                cutting_rate: rateNum
            });

            toast.success("Job completed successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Failed to complete job:", error);
            toast.error(error.message || "Failed to complete job.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Complete Job #${jobId}`}
            size="md"
        >
            <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm text-slate-700 font-medium flex items-start gap-2">
                        <Scissors className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>To complete this job, please verify the <strong className="text-indigo-900">amount of fabric remaining</strong> on each roll you used.</span>
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading Roll Details...</p>
                    </div>
                ) : rollsData.length > 0 ? (
                    <div className="space-y-4">
                        {rollsData.map(roll => {
                            const currentLen = Number(roll.roll_quantity);
                            const unit = roll.unit || 'm';
                            const remStr = remainingLengths[roll.id] || "";
                            const remaining = remStr === "" ? currentLen : Number(remStr);
                            const used = currentLen - remaining;

                            return (
                                <div key={roll.id} className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">Roll #{roll.id}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Started with {currentLen.toFixed(2)}{unit}</p>
                                        </div>
                                        {used > 0 && (
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                                Net Used: {used.toFixed(2)}{unit}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={currentLen}
                                                step="0.01"
                                                placeholder="e.g. 10.5"
                                                value={remainingLengths[roll.id] || ""}
                                                onChange={e => setRemainingLengths(prev => ({
                                                    ...prev,
                                                    [roll.id]: e.target.value
                                                }))}
                                                className="font-mono text-lg font-bold"
                                            />
                                            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">
                                                {unit === 'Kg.' ? 'Kilograms' : 'Meters'} Remaining on Roll
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-6 text-center">
                        <p className="text-gray-500 text-sm font-medium">No fabric rolls were assigned to this job.</p>
                        <p className="text-gray-400 text-xs mt-1">You may proceed to complete it.</p>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="cutting_rate" className="text-sm font-bold text-amber-900">Cutting Rate (per piece)</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-amber-700">₹</span>
                                <Input
                                    id="cutting_rate"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="e.g. 5.50"
                                    value={cuttingRate}
                                    onChange={e => setCuttingRate(e.target.value)}
                                    className="font-mono text-lg font-bold border-amber-300 focus:ring-amber-500"
                                />
                            </div>
                            <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wider">
                                Rate to be credited to tailor's account
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Complete Job
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
