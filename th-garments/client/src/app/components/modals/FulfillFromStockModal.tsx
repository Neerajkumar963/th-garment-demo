import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orderId: number;
    articleId: number;
    itemName: string;
    neededSq: any; // size-wise remaining
    onSuccess: () => void;
}

const FulfillFromStockModal: React.FC<Props> = ({ isOpen, onClose, orderId, articleId, itemName, neededSq, onSuccess }) => {
    const [availableStock, setAvailableStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selections, setSelections] = useState<{ [stockId: string]: any }>({});

    useEffect(() => {
        if (isOpen && articleId) {
            fetchStock();
        }
    }, [isOpen, articleId]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/cutting/internal-stock?article_id=${articleId}`);
            if (data.success) {
                setAvailableStock(data.stock || []);
            }
        } catch (error) {
            console.error('Error fetching stock:', error);
            toast.error('Failed to load inventory stock');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRow = (stockId: string, itemSq: any) => {
        const isSelected = !!selections[stockId];
        if (isSelected) {
            const newSel = { ...selections };
            delete newSel[stockId];
            setSelections(newSel);
        } else {
            // By default select ALL pieces in this block
            setSelections({
                ...selections,
                [stockId]: itemSq
            });
        }
    };

    const handleFulfill = async () => {
        const fulfillments = Object.entries(selections).map(([stockId, sq]) => ({
            selling_stock_id: typeof stockId === 'string' && stockId.startsWith('finished-') ? parseInt(stockId.replace('finished-', '')) : null,
            cut_stock_id: typeof stockId === 'string' && !stockId.startsWith('finished-') ? parseInt(stockId) : null,
            quantity_sq: sq
        }));

        if (fulfillments.length === 0) {
            toast.error('Please select at least one item from stock');
            return;
        }

        setLoading(true);
        try {
            const data = await api.post(`/orders/${orderId}/fulfill-from-stock`, {
                article_id: articleId,
                fulfillments: fulfillments
            });

            if (data.success) {
                toast.success('Added to processing hub successfully!');
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Fulfillment failed');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalSelected = () => {
        const totals: { [size: string]: number } = {};
        Object.values(selections).forEach(sq => {
            Object.entries(sq).forEach(([size, qty]) => {
                if (size === '_meta') return;
                totals[size] = (totals[size] || 0) + Number(qty);
            });
        });
        return totals;
    };

    if (!isOpen) return null;

    const totalsSelected = calculateTotalSelected();
    
    // Safety Parse: If neededSq comes as a string from backend
    const parsedNeededSq = typeof neededSq === 'string' ? JSON.parse(neededSq) : neededSq;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <span className="text-xl font-black">S</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Stage Injection</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Needed Summary */}
                    <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-6">
                        <h3 className="text-[10px] font-black text-indigo-400 mb-4 uppercase tracking-[0.2em] leading-none">Net Requirement Breakdown</h3>
                        <div className="flex flex-wrap gap-2.5">
                            {Object.entries(parsedNeededSq || {})
                                .filter(([size]) => size !== '_meta')
                                .map(([size, qty]) => (
                                <div key={size} className="bg-white border border-indigo-100 px-4 py-2 rounded-xl shadow-sm flex flex-col items-center min-w-[64px]">
                                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-tighter mb-0.5">{size}</span>
                                    <span className="text-sm font-black text-indigo-600">{qty as number}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stock List */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest">Available Inventory</h3>
                        {loading && availableStock.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 gap-3">
                                <div className="w-12 h-12 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Scanning Stock...</span>
                            </div>
                        ) : availableStock.length === 0 ? (
                            <div className="text-center p-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <p className="text-sm font-bold text-slate-400">No matching stock found in inventory.</p>
                                <p className="text-[10px] text-slate-300 mt-1">Try checking different articles or warehouse locations.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Breakdown</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-50">
                                        {availableStock.map((item) => {
                                            const isSelected = !!selections[item.id];
                                            return (
                                                <tr key={item.id} className={`hover:bg-slate-50/80 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/40' : ''}`} onClick={() => handleSelectRow(item.id, item.sq)}>
                                                    <td className="px-5 py-4 w-12">
                                                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-slate-300'}`}>
                                                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.is_finished ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                            {item.is_finished ? 'Finished' : 'Cut Stock'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-700 leading-tight">{item.color_name} | {item.cloth_type}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{item.design_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {Object.entries(item.sq).map(([size, qty]) => {
                                                                if (size === '_meta') return null;
                                                                return (
                                                                    <div key={size} className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 min-w-[36px]">
                                                                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none">{size}</span>
                                                                        <span className="text-[11px] font-black text-slate-600 mt-0.5">{qty as number}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t bg-slate-50/50 flex justify-between items-center px-8">
                    <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Total Selected:</span>
                        <span className="text-sm font-black text-indigo-600">{Object.values(totalsSelected).reduce((a, b) => a + (b as number), 0)} pieces</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all">
                            Cancel
                        </button>
                        <button 
                            onClick={handleFulfill}
                            disabled={loading || Object.keys(selections).length === 0}
                            className={`px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Injecting...
                                </span>
                            ) : (
                                'Finalize Allocation'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FulfillFromStockModal;
