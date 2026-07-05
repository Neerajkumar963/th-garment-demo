import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Trash2, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn, getBranchName } from "../ui/utils.tsx";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { api } from "../../../services/api";
import toast from "react-hot-toast";
import { useConfirm } from "../ui/WindowsConfirm";

export interface ProcessingJob {
    id: number;
    worker_name: string;
    org_name: string;
    article_name: string;
    sq: any;
    status: string;
    processing_rate: number;
    stage_name: string;
    created_on: string;
    updated_on: string;
    remarks: string;
    order_id: number;
    stage_id: number;
    cut_stock_id?: number;
    article_id?: number;
    stage_code?: number;
    order_branch?: string;
    branch?: string;
}

export interface Assignment {
    emp_id: number;
    sq: Record<string, number>;
    processing_rate: number;
}

export function MultiEmployeeAssignmentPanel({
    transitionJob,
    employees,
    onCancel,
    onSubmit,
    isSubmitting,
}: {
    transitionJob: ProcessingJob;
    employees: any[];
    onCancel: () => void;
    onSubmit: (assignments: Assignment[], stockUsed: Record<string, number>) => Promise<void>;
    isSubmitting: boolean;
}) {
    const confirm = useConfirm();
    const rawSq = typeof transitionJob.sq === 'string' ? JSON.parse(transitionJob.sq) : transitionJob.sq;

    const availableSq: Record<string, number> = {};
    Object.keys(rawSq).forEach(size => {
        if (size !== '_meta') {
            availableSq[size] = Number(rawSq[size]) || 0;
        }
    });

    const sizes = Object.keys(availableSq).filter(k => k !== '_meta');

    // Stock State
    const [matchingStock, setMatchingStock] = useState<any[]>([]);
    const [stockUsed, setStockUsed] = useState<Record<string, number>>({});
    const [loadingStock, setLoadingStock] = useState(false);

    const [assignments, setAssignments] = useState<Assignment[]>([
        {
            emp_id: -1,
            sq: sizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}),
            processing_rate: 5
        }
    ]);

    const [isAutoFill, setIsAutoFill] = useState(false);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

    const isInternalStock = transitionJob.org_name?.includes("INTERNAL STOCK");

    // Fetch Stock on Mount
    useEffect(() => {
        if (isInternalStock) {
            setMatchingStock([]);
            setLoadingStock(false);
            return;
        }
        const fetchStock = async () => {
            setLoadingStock(true);
            try {
                const data = await api.get('/sales/stock');
                if (transitionJob.article_id) {
                    const RelevantStock = (data.stock || []).filter((s: any) => String(s.article_id) === String(transitionJob.article_id));
                    const requiredSizes = sizes.map(s => s.trim().toUpperCase());
                    const usableStock = RelevantStock.filter((s: any) =>
                        requiredSizes.includes(s.size.trim().toUpperCase())
                    );
                    setMatchingStock(usableStock);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingStock(false);
            }
        }
        fetchStock();
    }, [transitionJob]);

    const addAssignment = () => {
        setAssignments([
            ...assignments,
            {
                emp_id: -1,
                sq: sizes.reduce((acc, size) => ({ ...acc, [size]: 0 }), {}),
                processing_rate: 5
            }
        ]);
    };

    const removeAssignment = async (index: number) => {
        if (assignments.length > 1) {
            const isConfirmed = await confirm({
                title: "Remove Assignment",
                description: "Are you sure you want to remove this employee's assignment? This will reset the quantities for this worker.",
                confirmText: "Remove",
                variant: "destructive"
            });
            if (isConfirmed) {
                setAssignments(assignments.filter((_, i) => i !== index));
            }
        }
    };

    const updateAssignment = (index: number, field: keyof Assignment, value: any) => {
        const newAssignments = [...assignments];
        newAssignments[index] = { ...newAssignments[index], [field]: value };
        setAssignments(newAssignments);
    };

    const updateQuantity = (index: number, size: string, value: number) => {
        if (isAutoFill) return;
        const newAssignments = [...assignments];
        newAssignments[index].sq = { ...newAssignments[index].sq, [size]: value };
        setAssignments(newAssignments);
    };

    // Auto-fill Logic
    useEffect(() => {
        if (!isAutoFill) return;

        const newAssignments = [...assignments];
        // We only auto-fill for the first worker for simplicity, or we can distribute.
        // The prompt says "automatically fill size quantities based on remaining order quantity".
        // If there are multiple workers, this gets tricky. Let's auto-fill the FIRST worker with 
        // whatever is left after all OTHER workers and stock.

        sizes.forEach(size => {
            const available = availableSq[size] || 0;
            const stock = stockUsed[size] || 0;

            // Sum of all assignments except the first one
            const otherWorkersAssigned = assignments.slice(1).reduce((sum, a) => sum + (a.sq[size] || 0), 0);
            const remaining = Math.max(0, available - stock - otherWorkersAssigned);

            newAssignments[0].sq[size] = remaining;
        });

        setAssignments(newAssignments);
    }, [isAutoFill, stockUsed, assignments.length]); // Re-run if workers added/removed or auto-fill toggled

    const updateStockUsage = (size: string, value: number) => {
        setStockUsed(prev => ({ ...prev, [size]: value }));
    };

    const isFullyFulfilledByStock = sizes.every(size => {
        const required = availableSq[size] || 0;
        const used = stockUsed[size] || 0;
        return used >= required;
    });

    const autoFillStockUsage = () => {
        const newStockUsed: Record<string, number> = {};
        sizes.forEach(size => {
            const required = availableSq[size] || 0;
            const stockItem = matchingStock.find(s => s.size.trim().toUpperCase() === size.trim().toUpperCase());
            const available = stockItem?.available_qty || 0;
            newStockUsed[size] = Math.min(required, available);
        });
        setStockUsed(newStockUsed);
    };

    const getTotalAssigned = (size: string) => {
        const empAssigned = assignments.reduce((sum, assignment) => sum + (assignment.sq[size] || 0), 0);
        const stock = stockUsed[size] || 0;
        return empAssigned + stock;
    };

    const isOverLimit = (size: string) => {
        const assigned = getTotalAssigned(size);
        const available = availableSq[size] || 0;
        return assigned > available;
    };

    const getRemaining = (size: string) => {
        const available = availableSq[size] || 0;
        const assigned = getTotalAssigned(size);
        return Math.max(0, available - assigned);
    };

    const isStockOverLimit = (size: string) => {
        const used = stockUsed[size] || 0;
        const stockItem = matchingStock.find(s => s.size.trim().toUpperCase() === size.trim().toUpperCase());
        const available = stockItem?.available_qty || 0;
        return used > available;
    }

    const hasOverAssignment = () => {
        return sizes.some(size => isOverLimit(size) || isStockOverLimit(size));
    };

    const handleSubmit = () => {
        const validAssignments = assignments.filter(a =>
            a.emp_id > 0 && Object.values(a.sq).some(qty => qty > 0)
        );
        const hasStock = Object.values(stockUsed).some(v => v > 0);

        if (validAssignments.length === 0 && !hasStock) {
            toast.error("Add at least one valid assignment or use stock");
            return;
        }
        onSubmit(validAssignments, stockUsed);
    };

    return (
        <div className="max-w-[600px] mx-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
            </div>

            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 mb-4">
                <div className="flex justify-between items-center gap-6">
                    <div className="flex-1">
                        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                            {transitionJob.stage_id > 0 ? 'Next Stage' : 'First Assignment'}
                        </p>
                        <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">
                            {transitionJob.org_name} {transitionJob.order_branch && `(${getBranchName(transitionJob.order_branch).toLowerCase()})`}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">{transitionJob.article_name}</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 pr-4 border-r border-gray-100">
                            <Checkbox
                                id="select-all"
                                checked={isAutoFill}
                                onCheckedChange={(checked) => setIsAutoFill(!!checked)}
                                className="w-4 h-4 border-gray-300 rounded"
                            />
                            <label htmlFor="select-all" className="text-[11px] font-medium text-gray-600 cursor-pointer uppercase tracking-tight">
                                Auto-Fill
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sizes.map(size => (
                                <Badge key={size} variant="secondary" className="h-6 text-[10px] font-semibold bg-gray-50 border border-gray-100 text-gray-700 px-2 rounded-md">
                                    {size}: {availableSq[size]}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isFullyFulfilledByStock ? (
                <div className="p-10 border-2 border-dashed border-green-100 rounded-lg bg-green-50/20 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-black text-green-900 mb-2">Direct Fulfillment Mode</h4>
                    <p className="text-sm text-green-700 max-w-sm">
                        Quantity requirement matched by available stock. No worker assignment needed for this stage.
                    </p>
                    <div className="mt-6 p-4 bg-white/50 rounded-lg border border-green-200">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Items to be fulfilled</p>
                        <div className="flex gap-3">
                            {sizes.map(size => (
                                <div key={size} className="text-center">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{size}</p>
                                    <p className="text-sm font-black text-gray-900">{availableSq[size]}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    {assignments.map((assignment, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm relative group transition-all hover:border-gray-300">
                            {assignments.length > 1 && (
                                <button
                                    onClick={() => removeAssignment(index)}
                                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all z-10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}

                            <div className="space-y-5">
                                {/* Horizontal Worker Row */}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <Select
                                            value={assignment.emp_id === -1 ? "" : assignment.emp_id.toString()}
                                            onValueChange={(val) => updateAssignment(index, 'emp_id', parseInt(val))}
                                        >
                                            <SelectTrigger className="h-10 bg-gray-50/50 text-xs border border-gray-200 focus:border-indigo-500 font-semibold hover:bg-white transition-all rounded-lg">
                                                <SelectValue placeholder="Select Worker" />
                                            </SelectTrigger>
                                            <SelectContent className="border border-gray-200 shadow-2xl rounded-xl">
                                                {employees
                                                    .filter(emp => transitionJob.stage_id > 0 ? emp.role_name !== 'Fabricator' : true)
                                                    .map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id.toString()} className="font-medium py-2 text-xs">
                                                            {emp.name} ({emp.role_name})
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-24 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">₹</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={assignment.processing_rate}
                                            onChange={(e) => updateAssignment(index, 'processing_rate', parseFloat(e.target.value) || 0)}
                                            className="pl-7 h-10 bg-gray-50/50 border border-gray-200 focus:border-indigo-500 font-bold text-gray-800 transition-all hover:bg-white text-xs text-center rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Vertical Sizes List */}
                                <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-indigo-100/30">
                                    {sizes.map(size => {
                                        const isThisSizeOver = isOverLimit(size);
                                        return (
                                            <div key={size} className="flex items-center gap-3">
                                                <div className="w-12 text-center py-1.5 bg-gray-50 rounded-md border border-gray-100">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{size}</span>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        disabled={isAutoFill && index === 0}
                                                        value={assignment.sq[size] === 0 ? '' : assignment.sq[size]}
                                                        onChange={(e) => updateQuantity(index, size, e.target.value === '' ? 0 : parseInt(e.target.value))}
                                                        className={cn(
                                                            "h-9 text-xs bg-white border text-center font-bold transition-all rounded-md",
                                                            isThisSizeOver ? "border-red-200 bg-red-50/30 text-red-600" : "border-gray-200 focus:border-indigo-400",
                                                            isAutoFill && index === 0 && "bg-gray-50 border-gray-100 text-indigo-600 shadow-inner"
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-end items-center gap-3 pt-6 mt-2 border-t border-gray-100 shrink-0">
                <Button
                    variant="ghost"
                    className="h-9 px-6 text-[11px] font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all rounded-lg"
                    onClick={onCancel}
                >
                    Cancel
                </Button>

                <Button
                    variant="outline"
                    className="h-9 px-5 text-[11px] font-bold border-gray-200 bg-white hover:bg-gray-50 text-indigo-600 transition-all rounded-lg flex items-center gap-2"
                    onClick={addAssignment}
                >
                    <Plus className="w-4 h-4" />
                    Add Worker
                </Button>

                <Button
                    className="h-9 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg shadow-md disabled:bg-gray-100 disabled:text-gray-400 active:scale-[0.98]"
                    onClick={handleSubmit}
                    disabled={
                        isSubmitting ||
                        hasOverAssignment() ||
                        (!isFullyFulfilledByStock && !Object.values(stockUsed).some(v => v > 0) && !assignments.some(a => a.emp_id > 0 && Object.values(a.sq).some(q => q > 0)))
                    }
                >
                    {isSubmitting ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : null}
                    Confirm Assignment
                </Button>
            </div>
        </div>
    );
}
