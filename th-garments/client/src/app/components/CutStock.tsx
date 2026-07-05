import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, ArrowRight, Table as TableIcon, CheckSquare as CheckboxIcon, Play, Send } from "lucide-react";
import { cn, getBranchName } from "./ui/utils.tsx";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { MultiEmployeeAssignmentPanel, ProcessingJob } from "./panels/MultiEmployeeAssignmentPanel";

export function CutStock() {
    const [availableStock, setAvailableStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);

    // Modal State for Single Assignment (Direct to Tailor/Process)
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [assignmentJob, setAssignmentJob] = useState<ProcessingJob | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const stockRes = await api.get('/processing/available-stock');
            const empRes = await api.get('/employees');
            setAvailableStock(stockRes.availableStock || []);
            setEmployees(empRes.employees || []);
        } catch (error) {
            toast.error("Failed to fetch stock data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCheckboxChange = (id: number) => {
        setSelectedStockIds(prev =>
            prev.includes(id) ? prev.filter((i: number) => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStockIds(availableStock.map((s: any) => s.id));
        } else {
            setSelectedStockIds([]);
        }
    };

    const startInitiate = (stock: any) => {
        const job: ProcessingJob = {
            ...stock,
            id: 0,
            worker_name: '',
            status: '',
            processing_rate: 0,
            stage_name: '',
            created_on: '',
            updated_on: '',
            remarks: '',
            order_id: 0,
            stage_id: 1,
            cut_stock_id: stock.id
        };
        setAssignmentJob(job);
        setIsAssignmentModalOpen(true);
    };

    const handleSendToBell = async () => {
        if (selectedStockIds.length === 0) return;
        setIsSubmitting(true);
        try {
            await api.post('/processing/queue-fabricator', {
                cut_stock_ids: selectedStockIds
            });
            toast.success(`${selectedStockIds.length} items moved to Bell Inbox`);
            setSelectedStockIds([]);
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to move items to Inbox");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitAssignment = async (assignments: any[], stockUsed: any) => {
        if (!assignmentJob) return;
        setIsSubmitting(true);
        try {
            await api.post('/processing/assign-multiple', {
                cut_stock_id: assignmentJob.cut_stock_id || 0,
                parent_job_id: assignmentJob.id,
                stage_id: 1,
                assignments,
                stockUsed
            });
            toast.success(`Assignment successful for ${assignmentJob.article_name}`);
            setIsAssignmentModalOpen(false);
            setAssignmentJob(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Assignment failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Grouping for Rowspan
    const groupedStock = availableStock.reduce((acc: { article_name: string, items: any[] }[], stock: any) => {
        const existing = acc.find(g => g.article_name === stock.article_name);
        if (existing) {
            existing.items.push(stock);
        } else {
            acc.push({ article_name: stock.article_name, items: [stock] });
        }
        return acc;
    }, []);

    return (
        <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shadow-sm z-10">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-pink-600 rounded-lg">
                            <TableIcon className="w-5 h-5 text-white" />
                        </div>
                        Cut Stock Management
                    </h1>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">
                        Assign processed stock to Stage 1 Production
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={fetchData} className="h-9 text-xs">
                        Refresh
                    </Button>
                    <Button
                        className="bg-pink-600 hover:bg-pink-700 h-9 px-6 cursor-pointer text-xs gap-2"
                        disabled={selectedStockIds.length === 0 || isSubmitting}
                        onClick={handleSendToBell}
                    >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send to Fabricator ({selectedStockIds.length})
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="bg-white rounded-[5px] border border-gray-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase tracking-tighter w-[300px] pl-10">Article Name</TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase tracking-tighter w-[250px]">Org / Branch Name</TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase tracking-tighter w-[20px]">Size / Quantity Summary</TableHead>
                                <TableHead className="w-[50px] text-center">
                                    <Checkbox
                                        checked={selectedStockIds.length === availableStock.length && availableStock.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase tracking-tighter w-[150px] text-center">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Synchronizing available stock...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : availableStock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center italic text-gray-400 text-sm">
                                        No cut stock available for processing.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedStock.map((group) => (
                                    group.items.map((stock: any, index: number) => {
                                        const sq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                                        return (
                                            <TableRow key={stock.id} className="hover:bg-gray-50/50 transition-colors">

                                                {index === 0 && (
                                                    <TableCell
                                                        rowSpan={group.items.length}
                                                        className="align-top py-4 pl-10 font-black text-gray-900 border-r border-gray-100 text-base"
                                                    >
                                                        {group.article_name}
                                                    </TableCell>
                                                )}
                                                <TableCell className="pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-700 capitalize">
                                                            {stock.org_name} {stock.branch && `(${getBranchName(stock.branch).toLowerCase()})`}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(sq)
                                                            .filter(([key, qty]) => key !== '_meta' && Number(qty) > 0)
                                                            .map(([size, qty]) => (
                                                                <Badge key={size} variant="outline" className="text-[10px] bg-white text-gray-600 font-bold border-gray-200">
                                                                    {size}: {qty as string}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selectedStockIds.includes(stock.id)}
                                                        onCheckedChange={() => handleCheckboxChange(stock.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-pink-200 text-pink-700 hover: cursor-pointer text-[11px] gap-1.5"
                                                        onClick={() => startInitiate(stock)}
                                                    >
                                                        <Play className="w-3 h-3" />
                                                        Initiate Process
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Modal
                isOpen={isAssignmentModalOpen}
                onClose={() => {
                    setIsAssignmentModalOpen(false);
                    setAssignmentJob(null);
                }}
                title={`Assign Workers - Stage 1`}
                size="sm"
            >
                {assignmentJob && (
                    <MultiEmployeeAssignmentPanel
                        transitionJob={assignmentJob}
                        employees={employees}
                        onCancel={() => {
                            setIsAssignmentModalOpen(false);
                            setAssignmentJob(null);
                        }}
                        isSubmitting={isSubmitting}
                        onSubmit={handleSubmitAssignment}
                    />
                )}
            </Modal>
        </div >
    );
}
