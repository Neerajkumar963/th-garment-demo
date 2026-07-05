import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Loader2, Package, CheckCircle2 } from "lucide-react";
import { api } from "../../../services/api";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

interface RecordFabricModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: number;
    articleId: number;
    onSuccess: () => void;
    fabrics: any[];
    productColorId?: number;
    productRemarks?: string;
    initialFabricId?: string; // If fabric is locked/already known
    targetSq?: any; // Target sizes for the job
}

export function RecordFabricModal({ isOpen, onClose, jobId, articleId, onSuccess, fabrics, productColorId, productRemarks, initialFabricId, targetSq }: RecordFabricModalProps) {
    const [selectedFabricId, setSelectedFabricId] = useState<string>(initialFabricId || "");
    const [rollIds, setRollIds] = useState<string[]>([]);
    const [rolls, setRolls] = useState<any[]>([]);

    // Stock Logic
    const [availableStocks, setAvailableStocks] = useState<any[]>([]);
    const [stockDetailsUsed, setStockDetailsUsed] = useState<Record<string, string>>({});
    const [selectedStockId, setSelectedStockId] = useState("");

    const [usageMode, setUsageMode] = useState<'stock' | 'roll'>('roll');
    const [loadingRolls, setLoadingRolls] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 1. Reset state
            setRollIds([]);
            setStockDetailsUsed({});
            setSelectedStockId("");
            setAvailableStocks([]);

            // 2. Auto-Match Logic
            if (initialFabricId) {
                setSelectedFabricId(initialFabricId);
            } else if (productColorId && (productRemarks || true)) { // Always try matching if we have color at least
                try {
                    const reqs = productRemarks ? JSON.parse(productRemarks) : {};
                    const normalize = (val: any) => (!val || val.toString() === "0" ? "" : val.toString());

                    // Match requirements with Inventory
                    const matched = fabrics.find(f =>
                        normalize(f.color_id) === normalize(productColorId) &&
                        normalize(f.cloth_type_id) === normalize(reqs.ct) &&
                        normalize(f.design_id) === normalize(reqs.d) &&
                        normalize(f.quality_id) === normalize(reqs.q)
                    );

                    if (matched) {
                        setSelectedFabricId(matched.id.toString());
                    } else {
                        setSelectedFabricId(""); // No match found
                        toast.error("No matching fabric found in inventory for this product configuration.");
                    }
                } catch (e) {
                    console.error("Failed to parse product remarks for matching", e);
                    setSelectedFabricId("");
                }
            } else {
                setSelectedFabricId("");
            }
        }
    }, [isOpen, initialFabricId, productColorId, productRemarks, fabrics]);

    // Fetch Rolls & Stock when Fabric Selected
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedFabricId) {
                setRolls([]);
                setAvailableStocks([]);
                return;
            }
            setLoadingRolls(true);
            try {
                const [rollsData, stockData] = await Promise.all([
                    api.get(`/fabric/${selectedFabricId}`),
                    api.get(`/cutting/internal-stock?article_id=${articleId}`)
                ]);

                if (rollsData.success && rollsData.rolls) {
                    setRolls(rollsData.rolls);
                }

                if (stockData.success && stockData.stock) {
                    const normalize = (val: any) => (!val || val.toString() === "0" ? "" : val.toString());
                    const selectedFabric = fabrics.find(f => f.id.toString() === selectedFabricId.toString());

                    const relevantStock = stockData.stock.filter((s: any) => {
                        if (!selectedFabric) return false;

                        // Try matching by attribute IDs if available, else fallback to cloth_detail_id
                        const matchesAttributes =
                            normalize(s.color_id) === normalize(selectedFabric.color_id) &&
                            normalize(s.cloth_type_id) === normalize(selectedFabric.cloth_type_id) &&
                            normalize(s.design_id) === normalize(selectedFabric.design_id) &&
                            normalize(s.quality_id) === normalize(selectedFabric.quality_id);

                        return matchesAttributes || s.cloth_detail_id?.toString() === selectedFabricId.toString();
                    });

                    setAvailableStocks(relevantStock);

                    if (relevantStock.length > 0) {
                        setSelectedStockId(relevantStock[0].id.toString());
                        setUsageMode('stock'); // Default to stock if available
                    } else {
                        setUsageMode('roll');
                    }
                } else {
                    setUsageMode('roll');
                }
            } catch (error: any) {
                toast.error("Failed to load fabric details");
                console.error("Fetch Error:", error);
            } finally {
                setLoadingRolls(false);
            }
        };

        if (isOpen && selectedFabricId) {
            fetchData();
        }
    }, [selectedFabricId, isOpen, articleId]);

    const handleSubmit = async () => {
        // Validation based on mode
        const hasFabric = usageMode === 'roll' && rollIds.length > 0;
        const hasStock = usageMode === 'stock' && selectedStockId && Object.entries(stockDetailsUsed).length > 0;

        if (!hasFabric && !hasStock) {
            toast.error(usageMode === 'roll' ? "Please select at least one roll" : "Please enter stock quantities");
            return;
        }



        let totalStockUsed = 0;
        if (hasStock) {
            const stock = availableStocks.find(s => s.id.toString() === selectedStockId);
            if (stock) {
                const stockSq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                // Validate per size
                for (const [size, qty] of Object.entries(stockDetailsUsed)) {
                    const req = Number(qty);
                    const avail = Number(stockSq[size] || 0);
                    if (req > avail) {
                        toast.error(`Insufficient stock for size ${size} (Max: ${avail})`);
                        return;
                    }
                    totalStockUsed += req;
                }

                if (totalStockUsed === 0) {
                    toast.error("Please enter quantity to use from stock");
                    return;
                }
            }
        }


        setIsSubmitting(true);
        try {
            const payload: any = {};

            if (hasFabric) {
                payload.assigned_rolls = rollIds.map(id => parseInt(id));
            }

            if (hasStock) {
                payload.stock_entries = [{
                    cut_stock_id: selectedStockId,
                    used_qty: totalStockUsed,
                    used_sq: stockDetailsUsed // Send map: { "24": "10", "32": "5" }
                }];
            }

            await api.put(`/cutting/${jobId}/fabric-usage`, payload);

            toast.success("Usage recorded merged successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to record fabric");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Record Fabric & Stock for Job #${jobId}`}
            size="md"
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    {/* Fabric Selection Information */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Required Fabric (Read-Only)</Label>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                <Package className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                {selectedFabricId ? (
                                    <>
                                        <p className="text-sm font-bold text-gray-900">
                                            {fabrics.find(f => f.id.toString() === selectedFabricId)?.color_name} / {fabrics.find(f => f.id.toString() === selectedFabricId)?.cloth_type}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">
                                            {fabrics.find(f => f.id.toString() === selectedFabricId)?.quality_name} • {fabrics.find(f => f.id.toString() === selectedFabricId)?.design_name}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm font-bold text-rose-600 flex items-center gap-1">
                                        No matching fabric found!
                                    </p>
                                )}
                            </div>
                            {selectedFabricId && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        </div>
                    </div>

                    {/* Source Selector */}
                    <div className="flex p-1 bg-gray-100 rounded-lg gap-1">
                        <button
                            onClick={() => setUsageMode('roll')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${usageMode === 'roll' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Assign New Rolls
                        </button>
                        <button
                            onClick={() => setUsageMode('stock')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${usageMode === 'stock' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            View Available Stock
                        </button>
                    </div>

                    {/* Stock Availability Section */}
                    {usageMode === 'stock' && (
                        <div className="space-y-3 animate-in fade-in zoom-in slide-in-from-top-2">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-4 h-4 text-indigo-600" />
                                    <h4 className="text-sm font-bold text-indigo-900">Available Cut Stock</h4>
                                </div>

                                {(() => {
                                    const validStocks = availableStocks.filter(stock => {
                                        let stockSq = {};
                                        try {
                                            stockSq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                                        } catch (e) { return false; }

                                        return Object.entries(stockSq).some(([k, v]) => {
                                            if (k === '_meta') return false;
                                            if (Number(v) <= 0) return false;
                                            if (targetSq && !targetSq[k]) return false;
                                            return true;
                                        });
                                    });

                                    if (validStocks.length === 0) {
                                        return <p className="text-xs text-indigo-400 italic py-2">No matching stock available for this fabric.</p>;
                                    }

                                    return validStocks.map(stock => {
                                        let stockSq = {};
                                        try {
                                            stockSq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                                        } catch (e) { console.error("SQ Parse Error", e); }

                                        const sizes = Object.entries(stockSq).filter(([k, v]) => {
                                            if (k === '_meta') return false;
                                            if (Number(v) <= 0) return false;
                                            if (targetSq && !targetSq[k]) return false;
                                            return true;
                                        });

                                        const isSelected = selectedStockId === stock.id.toString();

                                        return (
                                            <div key={stock.id} className={`mb-3 p-3 rounded-lg border transition-all ${isSelected ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-sm font-bold text-indigo-900">Stock #{stock.id}</span>
                                                    <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-200 font-mono">
                                                        {sizes.length} Matching Sizes
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 mt-2">
                                                    {sizes.map(([size, availableQty]) => {
                                                        const rawRequired = targetSq ? Number(targetSq[size] || 0) : 0;
                                                        const fulfilled = targetSq?._meta?.finished_sq?.[size] || 0;
                                                        const semiFulfilled = targetSq?._meta?.semi_finished_sq?.[size] || 0;
                                                        const packed = targetSq?._meta?.finished_packed_sq?.[size] || 0;
                                                        const requiredQty = Math.max(0, rawRequired - Number(fulfilled) - Number(semiFulfilled) - Number(packed));
                                                        const isDone = requiredQty <= 0;
                                                        const maxAllowed = Math.min(Number(availableQty), requiredQty);

                                                        return (
                                                            <div key={size} className="space-y-1">
                                                                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100 mt-1">
                                                                    <span>{size}</span>
                                                                    <div className="flex flex-col items-end">
                                                                        {isDone ? (
                                                                            <span className="text-green-600 font-black">DONE</span>
                                                                        ) : (
                                                                            <span className="text-indigo-600 font-bold">Need: {requiredQty}</span>
                                                                        )}
                                                                        <span className="text-gray-500">Avail: {availableQty as React.ReactNode}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                })()}
                            </div>

                        </div>
                    )}

                    {/* Rolls Assignment Section */}
                    {usageMode === 'roll' && (
                        <div className="space-y-3 animate-in fade-in zoom-in slide-in-from-top-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Rolls to Use</Label>
                            {loadingRolls ? (
                                <div className="flex items-center text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Loading rolls...
                                </div>
                            ) : rolls.length === 0 ? (
                                <p className="text-sm text-rose-500 italic">No rolls available for this fabric.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                                    {rolls.map(r => {
                                        const isSelected = rollIds.includes(r.id.toString());
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    setRollIds(prev =>
                                                        isSelected
                                                            ? prev.filter(id => id !== r.id.toString())
                                                            : [...prev, r.id.toString()]
                                                    );
                                                }}
                                                className={`p-3 border rounded-xl text-left transition-all ${isSelected
                                                    ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-100'
                                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex flex-col items-start justify-between w-full">
                                                    {/* Roll ID hidden as per user request */}
                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none">Available: <span className={isSelected ? 'text-indigo-600 font-black text-base' : 'text-slate-900 font-black text-base'}>{parseFloat(r.roll_quantity).toFixed(2)}{r.unit || 'm'}</span></p>
                                                    {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600 drop-shadow-sm absolute right-3 top-3" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Save Assigned Rolls
                    </Button>
                </div>
            </div>
        </Modal >
    );
}
