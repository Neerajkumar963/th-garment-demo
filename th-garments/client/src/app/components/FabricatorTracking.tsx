import { useState, useEffect } from "react";
import { Loader2, UserPlus, Bell } from "lucide-react";
import { api } from "../../services/api";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import toast from "react-hot-toast";
import { getBranchName } from "./ui/utils";

interface FabricatorTrackingProps {
    onSuccess?: () => void;
}

export function FabricatorTracking({ onSuccess }: FabricatorTrackingProps) {
    const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
    const [selectedFabricator, setSelectedFabricator] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [jobsRes, empsRes] = await Promise.all([
                api.get('/processing/queued-fabricator'),
                api.get('/employees')
            ]);
            setQueuedJobs(jobsRes.jobs || []);
            setEmployees((empsRes.employees || []).filter((e: any) => e.role_name === 'Fabricator'));
        } catch (error) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectJob = (id: number) => {
        setSelectedJobIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedJobIds(queuedJobs.map(j => j.id));
        } else {
            setSelectedJobIds([]);
        }
    };

    const handleBulkAssign = async () => {
        if (selectedJobIds.length === 0) {
            toast.error("Please select at least one item");
            return;
        }
        if (!selectedFabricator) {
            toast.error("Please select a fabricator");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/processing/bulk-assign-fabricator', {
                job_ids: selectedJobIds,
                emp_id: selectedFabricator,
                processing_rate: 0
            });
            toast.success("Fabricator assigned successfully");
            setSelectedJobIds([]);
            setSelectedFabricator("");
            fetchData();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Bulk assignment failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (selectedJobIds.length === 0) return;

        setIsSubmitting(true);
        try {
            await api.post('/processing/cancel-queued-fabricator', {
                job_ids: selectedJobIds
            });
            toast.success("Items moved back to Cut Stock");
            setSelectedJobIds([]);
            setSelectedFabricator("");
            fetchData();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Cancellation failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px]">
            <div className="flex-1 overflow-auto py-4">
                <div className="bg-white rounded-[5px] border border-gray-200 shadow-sm overflow-hidden mb-4">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                <TableHead className="w-[50px] text-center">
                                    <Checkbox
                                        checked={selectedJobIds.length === queuedJobs.length && queuedJobs.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase pl-6">Org Name</TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase">Branch / Details</TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase">Size / Quantity</TableHead>
                                <TableHead className="font-bold text-gray-900 text-xs uppercase text-center w-[120px]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Fetching inbox...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : queuedJobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center italic text-gray-400 text-sm">
                                        Inbox is empty.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                queuedJobs.map((job) => {
                                    const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                                    return (
                                        <TableRow key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={selectedJobIds.includes(job.id)}
                                                    onCheckedChange={() => handleSelectJob(job.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-black text-gray-900 pl-6 text-xs">
                                                {job.article_name}
                                            </TableCell>
                                            <TableCell className="text-[10px]">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700 capitalize">
                                                        {job.org_name} {job.order_branch && `(${getBranchName(job.order_branch).toLowerCase()})`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(sq)
                                                        .filter(([key]) => key !== '_meta')
                                                        .map(([size, qty]) => (
                                                            <Badge key={size} variant="outline" className="text-[9px] bg-white text-gray-600 font-bold border-gray-200 px-1 py-0">
                                                                {size}: {qty as string}
                                                            </Badge>
                                                        ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-[9px] font-black uppercase text-pink-600">
                                                Yet to Allocate
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Action Bar */}
            <div className="sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">
                        {selectedJobIds.length} items selected
                    </span>
                    <select
                        value={selectedFabricator}
                        onChange={(e) => setSelectedFabricator(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-pink-500 focus:border-pink-500 block w-48 p-2 font-bold"
                    >
                        <option value="">Select Fabricator</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={selectedJobIds.length === 0 || isSubmitting}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs h-9 px-4 border border-rose-100"
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleBulkAssign}
                        disabled={selectedJobIds.length === 0 || !selectedFabricator || isSubmitting}
                        className="bg-gray-900 hover:bg-black text-white px-6 font-black text-xs gap-2 rounded-lg h-9"
                    >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        SEND TO FABRICATOR
                    </Button>
                </div>
            </div>
        </div>
    );
}
