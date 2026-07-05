import { useState, useEffect, memo } from "react";
import { Package, Search, Loader2, Eye } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { api } from "../../services/api";
import { toast } from "sonner";
import { StockHistoryModal } from "./StockHistoryModal";

interface StockItem {
    article_id: number;
    size: string;
    price: number;
    available_qty: number;
    article_name: string;
    org_name: string;
    brand?: string;
    remarks?: string;
}

const FinishedStockRow = memo(({ s, onHistory }: { s: StockItem; onHistory: (s: StockItem) => void }) => {
    return (
        <tr className="hover:bg-gray-50/50 transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
            <td className="px-8 py-5">
                <p className="font-bold text-gray-900 text-sm uppercase tracking-wide">{s.article_name}</p>
                {(s.brand || s.remarks) && (
                    <div className="flex gap-2 mt-1">
                        {s.brand && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{s.brand}</span>}
                        {s.remarks && s.remarks !== 'Produced' && (
                            <span className="text-[10px] text-gray-400 italic">"{s.remarks}"</span>
                        )}
                    </div>
                )}
            </td>
            <td className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">{s.org_name}</td>
            <td className="px-8 py-5">
                <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50/50 font-black">{s.size}</Badge>
            </td>
            <td className="px-8 py-5">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{Math.round(s.available_qty)}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase">PCS</span>
                </div>
            </td>
            <td className="px-8 py-5 text-sm font-black text-indigo-600">₹{Math.round(s.price)}</td>
            <td className="px-8 py-5">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => onHistory(s)}
                >
                    <Eye className="w-4 h-4" />
                </Button>
            </td>
        </tr>
    );
});

export function FinishedStock() {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedStockForHistory, setSelectedStockForHistory] = useState<StockItem | null>(null);

    const fetchStock = async () => {
        try {
            const res = await api.get('/sales/stock');
            setStock(res.stock || []);
        } catch (error) {
            toast.error("Failed to load finished stock");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const handleOpenHistory = (item: StockItem) => {
        setSelectedStockForHistory(item);
        setIsHistoryModalOpen(true);
    };

    const filteredStock = stock.filter(item =>
        item.article_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.org_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-auto bg-[#f8fafc]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Finished Stock</h1>
                        <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">Available Ready-to-Sell Inventory</p>
                    </div>
                    <div className="relative w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Search product or client..."
                            className="pl-9 h-10 border-gray-200 bg-gray-50/50 rounded-lg font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 max-w-7xl mx-auto">
                {loading ? (
                    <div className="py-40 text-center space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-tighter">Inventory Sync in Progress...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/30">
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Client / Org</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Size</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Qty</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Price</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStock.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center opacity-30">
                                                <Package className="w-12 h-12 mx-auto mb-3" />
                                                <p className="text-xs font-black uppercase tracking-widest">Warehouse Empty</p>
                                            </td>
                                        </tr>
                                    ) : filteredStock.map((item, idx) => (
                                        <FinishedStockRow
                                            key={idx}
                                            s={item}
                                            onHistory={handleOpenHistory}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            <StockHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                stockItem={selectedStockForHistory}
            />
        </div>
    );
}
