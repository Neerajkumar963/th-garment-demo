import { useState, useEffect } from "react";
import {
    Package,
    Plus,
    Search,
    AlertCircle,
    RefreshCcw,
    CheckCircle2
} from "lucide-react";
import { labelAPI } from "../../services/api";
import { toast } from "react-hot-toast";

interface StockableLabel {
    labelling_id: number;
    article_name: string;
    org_name: string;
    label_type: string;
    stock_quantity: number;
}

export function LabelStockManagement() {
    const [labels, setLabels] = useState<StockableLabel[]>([]);
    const [availableLabels, setAvailableLabels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
    const [addQuantity, setAddQuantity] = useState(0);

    const fetchLabels = async () => {
        try {
            setLoading(true);
            const response = await labelAPI.getStockableLabels();
            if (response.success) {
                setLabels(response.data);
            }
        } catch (error) {
            console.error("Error fetching labels:", error);
            toast.error("Failed to load labels");
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableLabels = async () => {
        try {
            const response = await labelAPI.getAvailableLabels();
            if (response.success) {
                setAvailableLabels(response.data);
            }
        } catch (error) {
            console.error("Error fetching available labels:", error);
        }
    };

    useEffect(() => {
        fetchLabels();
        fetchAvailableLabels();
    }, []);

    const handleAddStock = async () => {
        if (!selectedLabelId || addQuantity <= 0) return;

        try {
            const response = await labelAPI.addStock(selectedLabelId, addQuantity);
            if (response.success) {
                toast.success("Stock updated successfully");
                setIsStockModalOpen(false);
                setAddQuantity(0);
                setSelectedLabelId(null);
                fetchLabels();
            }
        } catch (error) {
            console.error("Error adding stock:", error);
            toast.error("Failed to update stock");
        }
    };

    const handleToggleTracking = async (labellingId: number, status: boolean) => {
        try {
            const response = await labelAPI.updateStatus(labellingId, status);
            if (response.success) {
                toast.success(status ? "Label added to tracking" : "Label removed from tracking");
                fetchLabels();
                fetchAvailableLabels();
                if (status) setIsAddModalOpen(false);
            }
        } catch (error) {
            console.error("Error updating label status:", error);
            toast.error("Failed to update tracking status");
        }
    };

    const filteredLabels = labels.filter(label =>
        label.article_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        label.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        label.label_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Label Stock Management</h1>
                    <p className="text-muted-foreground">Manage and track label inventory for specific client products</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Label to Track
                    </button>
                    <button
                        onClick={() => fetchLabels()}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-medium"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>
            {/* ... stats section ... */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-4 rounded-lg border-2 border-border/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Active Labels</p>
                        <p className="text-2xl font-bold">{labels.length}</p>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-lg border-2 border-border/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Low Stock ({"<"} 100)</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {labels.filter(l => l.stock_quantity < 100).length}
                        </p>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-lg border-2 border-border/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Well Stocked</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {labels.filter(l => l.stock_quantity >= 100).length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-lg border-2 border-border/50 shadow-sm overflow-hidden">
                <div className="p-4 border-b-2 border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by product, client or label type..."
                            className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Product</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client / Organization</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Label Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Stock</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-muted/60 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredLabels.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="w-12 h-12 opacity-20" />
                                            <p>No stockable labels found matching your search</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLabels.map((label) => (
                                    <tr key={label.labelling_id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-4 min-w-[200px]">
                                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {label.article_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {label.org_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium border border-border/50">
                                                {label.label_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-lg font-bold ${label.stock_quantity < 100 ? 'text-red-500' : 'text-green-500'}`}>
                                                {label.stock_quantity.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {label.stock_quantity < 100 ? (
                                                <div className="flex items-center gap-2 text-red-500 text-xs font-semibold">
                                                    <AlertCircle className="w-3 h-3" />
                                                    LOW STOCK
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-500 text-xs font-semibold">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    IN STOCK
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right pr-10">
                                            <button
                                                onClick={() => {
                                                    setSelectedLabelId(label.labelling_id);
                                                    setIsStockModalOpen(true);
                                                }}
                                                className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all"
                                                title="Add Stock"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Label Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden border border-border/50 slide-in-from-bottom-4 animate-in duration-300">
                        <div className="p-6 border-b border-border/50 bg-muted/30 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Add Label to Tracking</h2>
                                <p className="text-sm text-muted-foreground mt-1">Select a label from client products to start tracking its stock</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors font-bold">✕</button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {availableLabels.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Package className="w-12 h-12 mx-auto opacity-20 mb-2" />
                                    <p>All existing labels are already being tracked.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {availableLabels.map((l) => (
                                        <div key={l.labelling_id} className="flex items-center justify-between p-4 bg-muted/20 border border-border hover:border-primary/50 rounded-lg transition-all group">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground">{l.article_name}</span>
                                                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-bold uppercase tracking-wider">{l.label_type}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">{l.org_name}</p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleTracking(l.labelling_id, true)}
                                                className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                            >
                                                Start Tracking
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isStockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-lg shadow-2xl overflow-hidden border border-border/50 slide-in-from-bottom-4 animate-in duration-300">
                        <div className="p-6 border-b border-border/50 bg-muted/30">
                            <h2 className="text-xl font-bold">Add Label Stock</h2>
                            <p className="text-sm text-muted-foreground mt-1">Enter the quantity to add to current inventory</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quantity to Add</label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                                    <input
                                        type="number"
                                        className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-lg font-bold text-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
                                        placeholder="Enter quantity..."
                                        value={addQuantity || ""}
                                        onChange={(e) => setAddQuantity(parseInt(e.target.value))}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsStockModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddStock}
                                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!addQuantity || addQuantity <= 0}
                                >
                                    Confirm Batch
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
