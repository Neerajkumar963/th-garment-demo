import { useState, useEffect } from "react";
import { Search, Loader2, Package, CheckCircle2, Factory, ArrowRight, Bell } from "lucide-react";
import { FabricatorTracking } from "./FabricatorTracking";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../../services/api";
import { toast } from "sonner";
import { cn, getBranchName } from "./ui/utils.tsx";
import { Modal } from "./ui/modal";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

export function Fabricator() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [inboxModalOpen, setInboxModalOpen] = useState(false);
    const [selectedJobsForReceive, setSelectedJobsForReceive] = useState<number[]>([]);
    const [bulkReceivedQty, setBulkReceivedQty] = useState<{ [jobId: number]: { [size: string]: number } }>({});
    const [bulkReceivedRate, setBulkReceivedRate] = useState<{ [jobId: number]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [inboxCount, setInboxCount] = useState(0);
    const [selectedFabricator, setSelectedFabricator] = useState<string>("all");

    const fetchInboxCount = async () => {
        try {
            const res = await api.get('/processing/queued-fabricator');
            setInboxCount(res.jobs?.length || 0);
        } catch (e) {
            console.error("Inbox poll failed", e);
        }
    };

    const fetchJobs = async () => {
        try {
            const { jobs } = await api.get('/processing/fabricator');
            setJobs(jobs || []);
        } catch (error) {
            toast.error("Failed to load fabricator jobs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        fetchInboxCount();
        const interval = setInterval(fetchInboxCount, 15000); // 15s polling for Bell
        return () => clearInterval(interval);
    }, []);

    const uniqueFabricators = Array.from(new Set(jobs.map(j => j.worker_name))).sort();

    const filteredJobs = selectedFabricator === "all"
        ? jobs
        : jobs.filter(j => j.worker_name === selectedFabricator);

    const handleReceive = async () => {
        if (selectedJobsForReceive.length === 0) {
            return toast.error("Please select at least one job to receive.");
        }

        let totalProcessed = 0;
        let hasError = false;

        setSubmitting(true);
        try {
            // First, validate all rates for jobs that have quantities entered
            for (const jobId of selectedJobsForReceive) {
                const qtyMap = bulkReceivedQty[jobId];
                if (!qtyMap || Object.values(qtyMap).filter(v => Number(v) > 0).length === 0) {
                    continue; // Skip validation if no quantities entered
                }

                const rateValue = parseFloat(bulkReceivedRate[jobId] || "0");
                if (isNaN(rateValue) || rateValue <= 0) {
                    const job = jobs.find(j => j.id === jobId);
                    toast.error(`Please enter a valid rate (greater than 0) for ${job?.article_name || 'selected job'}`);
                    setSubmitting(false);
                    return;
                }
            }

            // Process each selected job
            for (const jobId of selectedJobsForReceive) {
                const job = jobs.find(j => j.id === jobId);
                if (!job) continue;

                const qtyMap = bulkReceivedQty[jobId];
                if (!qtyMap || Object.values(qtyMap).filter(v => Number(v) > 0).length === 0) {
                    continue; // Skip if no quantities entered for this job
                }

                // Filter out zero quantities and format for API
                const quantitiesToReceive = Object.fromEntries(
                    Object.entries(qtyMap)
                        .filter(([_, qty]) => Number(qty) > 0)
                        .map(([size, qty]) => [size, Number(qty)])
                );

                if (Object.keys(quantitiesToReceive).length === 0) continue;

                const rate = bulkReceivedRate[jobId] || "0";

                await api.put(`/processing/${job.id}/receive`, {
                    receivedQty: quantitiesToReceive,
                    processing_rate: parseFloat(rate)
                });
                totalProcessed++;
            }

            if (totalProcessed > 0) {
                toast.success(`Successfully recorded receipts for ${totalProcessed} job(s)`);
                setReceiveModalOpen(false);
                fetchJobs();
            } else if (!hasError) {
                toast.error("Please enter quantities greater than 0 for selected jobs.");
            }

        } catch (error: any) {
            console.error("Receive error:", error);
            toast.error(error.message || "Failed to record receipt");
        } finally {
            setSubmitting(false);
        }
    };

    const parseSq = (sq: any) => {
        try {
            return typeof sq === 'string' ? JSON.parse(sq) : sq;
        } catch {
            return {};
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-[#f8fafc]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Fabricator Tracking</h1>
                        <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">External Processing Management</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                            <Search className="w-4 h-4 text-gray-400" />
                            <select
                                className="bg-transparent border-none text-xs font-bold text-gray-600 focus:outline-none min-w-[160px] cursor-pointer"
                                value={selectedFabricator}
                                onChange={(e) => setSelectedFabricator(e.target.value)}
                            >
                                <option value="all">All Fabricators</option>
                                {uniqueFabricators.map(worker => (
                                    <option key={worker} value={worker}>{worker}</option>
                                ))}
                            </select>
                        </div>

                        <Button
                            variant="ghost"
                            className="relative p-2 h-10 w-10 rounded-lg hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                            onClick={() => setInboxModalOpen(true)}
                        >
                            <Bell className="w-5 h-5 text-gray-600 group-hover:text-pink-600 transition-colors" />
                            {inboxCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                    {inboxCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className={cn(
                                "h-10 font-black px-5 rounded-lg uppercase tracking-wider text-xs shadow-sm",
                                selectedFabricator === "all" ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            )}
                            disabled={selectedFabricator === "all"}
                            onClick={() => {
                                setSelectedJobsForReceive([]);
                                setBulkReceivedQty({});
                                setBulkReceivedRate({});
                                setReceiveModalOpen(true);
                            }}
                        >
                            Receive Products
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchJobs} className="h-10 font-bold px-5 rounded-lg border-gray-200 hover:bg-gray-50 uppercase tracking-wider text-xs">
                            Refresh Jobs
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto">
                {loading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600 mb-4" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Fabricator Data...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
                        <Factory className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400">No active fabricator jobs</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#f8fafc] border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Sr No</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/3">Product & Organization</th>
                                        <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sent</th>
                                        <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Recv</th>
                                        <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pend</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredJobs.map((job, index) => {
                                        const sq = parseSq(job.sq);
                                        const received = sq._meta?.received || {};
                                        const sentSizes = Object.entries(sq).filter(([k]) => k !== '_meta');
                                        const totalSent: number = sentSizes.reduce((a, [_, q]: any) => a + Number(q), 0);
                                        const totalReceived: number = Object.values(received).reduce((a: number, b: any) => a + Number(b), 0);
                                        const remaining: number = totalSent - totalReceived;

                                        return (
                                            <tr key={job.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm leading-tight">{job.article_name}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">{job.org_name}</span>
                                                            <span className="text-[10px] text-gray-300">•</span>
                                                            <span className="text-[10px] font-bold text-gray-400">{getBranchName(job.order_branch)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-4 text-center">
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-none font-black text-[10px]">
                                                        {totalSent}
                                                    </Badge>
                                                </td>
                                                <td className="px-2 py-4 text-center">
                                                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">
                                                        {totalReceived}
                                                    </Badge>
                                                </td>
                                                <td className="px-2 py-4 text-center">
                                                    <Badge className={cn(
                                                        "border-none font-black text-[10px]",
                                                        remaining > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400"
                                                    )}>
                                                        {remaining}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {remaining === 0 ? (
                                                            <div className="flex items-center gap-1.5 text-emerald-600">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Completed</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/80 border border-amber-200/50">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">In Progress</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={receiveModalOpen}
                onClose={() => setReceiveModalOpen(false)}
                title="Record Receipt from Fabricator"
                size="lg" // Make it larger to fit the table
            >
                <div className="space-y-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-[#f8fafc] border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 text-center">
                                        <Checkbox
                                            className="border-gray-200"
                                            checked={selectedJobsForReceive.length > 0 && selectedJobsForReceive.length === filteredJobs.filter(j => j.status !== 'Processed').length}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    const pendingJobs = filteredJobs.filter(j => j.status !== 'Processed');
                                                    setSelectedJobsForReceive(pendingJobs.map(j => j.id));

                                                    // Autofill quantities & rates for ALL pending jobs
                                                    const allAutoFill: any = {};
                                                    const allRates: any = {};

                                                    pendingJobs.forEach(job => {
                                                        const sq = parseSq(job.sq);
                                                        const pendingSizes = Object.entries(sq).filter(([size, sent]: [string, any]) => {
                                                            if (size === '_meta') return false;
                                                            const prevRecv = sq._meta?.received?.[size] || 0;
                                                            return (Number(sent) - Number(prevRecv)) > 0;
                                                        });

                                                        const jobAutoFill: { [size: string]: number } = {};
                                                        pendingSizes.forEach(([size, sent]: [string, any]) => {
                                                            const prevRecv = sq._meta?.received?.[size] || 0;
                                                            jobAutoFill[size] = Number(sent) - Number(prevRecv);
                                                        });

                                                        allAutoFill[job.id] = jobAutoFill;
                                                        allRates[job.id] = job.processing_rate?.toString() || "";
                                                    });

                                                    setBulkReceivedQty(allAutoFill);
                                                    setBulkReceivedRate(allRates);
                                                } else {
                                                    setSelectedJobsForReceive([]);
                                                    setBulkReceivedQty({});
                                                    setBulkReceivedRate({});
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/3">Product</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Size & Quantity</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Rate (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredJobs.filter(j => j.status !== 'Processed').length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-xs font-bold text-gray-400">No pending jobs to receive.</td></tr>
                                ) : (
                                    filteredJobs.filter(j => j.status !== 'Processed').map(job => {
                                        const sq = parseSq(job.sq);
                                        const entries = Object.entries(sq).filter(([size]) => size !== '_meta');
                                        const isSelected = selectedJobsForReceive.includes(job.id);
                                        const pendingSizes = entries.filter(([size, sent]) => {
                                            const prevRecv = sq._meta?.received?.[size] || 0;
                                            return (Number(sent) - Number(prevRecv)) > 0;
                                        });

                                        return (
                                            <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-4 text-center align-top">
                                                    <Checkbox
                                                        className="border-gray-200 mt-1"
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedJobsForReceive(prev => [...prev, job.id]);
                                                                // Autofill quantities
                                                                const autoFill: { [size: string]: number } = {};
                                                                pendingSizes.forEach(([size, sent]: [string, any]) => {
                                                                    const prevRecv = sq._meta?.received?.[size] || 0;
                                                                    autoFill[size] = Number(sent) - Number(prevRecv);
                                                                });
                                                                setBulkReceivedQty(prev => ({ ...prev, [job.id]: autoFill }));
                                                                setBulkReceivedRate(prev => ({ ...prev, [job.id]: job.processing_rate?.toString() || "" }));
                                                            } else {
                                                                setSelectedJobsForReceive(prev => prev.filter(id => id !== job.id));
                                                                setBulkReceivedQty(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[job.id];
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <p className="font-black text-gray-900 text-xs">{job.article_name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase">{job.org_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top space-y-2">
                                                    {pendingSizes.length === 0 ? (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Fully Received</span>
                                                    ) : (
                                                        pendingSizes.map(([size, sent]: [string, any]) => {
                                                            const prevRecv = sq._meta?.received?.[size] || 0;
                                                            const currentRecv = bulkReceivedQty[job.id]?.[size] || 0;
                                                            const maxRecv = Number(sent) - Number(prevRecv);

                                                            return (
                                                                <div key={size} className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 shrink-0 bg-white rounded-lg flex items-center justify-center font-black text-gray-700 text-[10px] border border-gray-200 shadow-sm">
                                                                        {size}
                                                                    </div>
                                                                    <div className="flex-1 flex items-center gap-2">
                                                                        {isSelected ? (
                                                                            <Input
                                                                                type="number"
                                                                                className="w-16 h-8 bg-white font-bold text-center text-xs"
                                                                                placeholder="0"
                                                                                max={maxRecv}
                                                                                value={currentRecv || ''}
                                                                                onChange={(e) => {
                                                                                    const val = Math.min(Number(e.target.value), maxRecv);
                                                                                    setBulkReceivedQty(prev => ({
                                                                                        ...prev,
                                                                                        [job.id]: {
                                                                                            ...(prev[job.id] || {}),
                                                                                            [size]: Math.max(0, val)
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span className="w-16 h-8 flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-xs rounded-md border border-gray-200">
                                                                                -
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                                                            / {maxRecv} <span className="text-[9px] font-medium text-gray-300 ml-1">(Sent: {sent})</span>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    {isSelected ? (
                                                        <Input
                                                            type="number"
                                                            className="w-20 h-8 bg-white font-bold text-center text-xs"
                                                            placeholder="0"
                                                            value={bulkReceivedRate[job.id] ?? (job.processing_rate?.toString() || '')}
                                                            onChange={(e) => {
                                                                setBulkReceivedRate(prev => ({
                                                                    ...prev,
                                                                    [job.id]: e.target.value
                                                                }));
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400 text-center block bg-gray-50 rounded-lg py-1 border border-gray-100">
                                                            ₹{job.processing_rate || 0}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setReceiveModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleReceive}
                            disabled={submitting || selectedJobsForReceive.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                            {submitting ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : "Confirm Selected Receipts"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={inboxModalOpen}
                onClose={() => setInboxModalOpen(false)}
                title="Fabricator Inbox"
                size="lg"
            >
                <div className="px-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                        Allocate unassigned jobs to workers
                    </p>
                    <FabricatorTracking
                        onSuccess={() => {
                            fetchJobs();
                            fetchInboxCount();
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
}
