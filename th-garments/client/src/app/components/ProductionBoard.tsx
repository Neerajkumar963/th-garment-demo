import { Clock, User, AlertCircle, CheckCircle2, Loader2, ArrowRight, Trash2, Eye, Pencil, Info, Plus } from "lucide-react";
import { cn, getBranchName } from "./ui/utils.tsx";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { MultiEmployeeAssignmentPanel, ProcessingJob } from "./panels/MultiEmployeeAssignmentPanel";
import { processingAPI } from "../../services/api";
import { Search, Filter, History, ChevronDown, Download, Calendar } from "lucide-react";




function JobCardComponent({
  job,
  onRefresh,
  onMove,
  onViewDetails,
  onEditRate,
  isNextAssigned
}: {
  job: ProcessingJob,
  onRefresh: () => void,
  onMove: (job: ProcessingJob) => void,
  onViewDetails: (job: ProcessingJob) => void,
  onEditRate: (job: ProcessingJob) => void,
  isNextAssigned?: boolean
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/processing/${job.id}/complete-stage`, {});
      toast.success("Stage completed. Available for next assignment.");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete stage");
    } finally {
      setIsSubmitting(false);
    }
  };



  // Parse SQ
  const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
  const totalPieces = Object.entries(sq)
    .filter(([key]) => key !== '_meta')
    .reduce((a: number, [_, qty]: any) => a + (parseInt(qty) || 0), 0);

  const isProcessed = job.status === 'processed';

  return (
    <div className={cn(
      "bg-white rounded-lg border-2 p-4 hover:shadow-md transition-shadow relative group",
      isProcessed ? "border-green-100 bg-green-50/20" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Job Ticket</span>
            {/* <span className="font-bold text-gray-900 leading-none">#{job.id}</span> */}
          </div>

        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onViewDetails(job)}
            className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="View cloth details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <Badge variant="outline" className={cn(
            "text-[10px] h-5 border-gray-200",
            isProcessed ? "bg-green-100 text-green-700 border-green-200" : "text-gray-500"
          )}>
            {isProcessed ? "READY FOR NEXT" : `Order #${job.order_id}`}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-sm truncate capitalize">
            {job.org_name} {job.order_branch && `(${getBranchName(job.order_branch).toLowerCase()})`}
          </h4>
        </div>
        <p className="text-xs text-gray-600 truncate">{job.article_name}</p>
      </div>

      {/* Size Breakdown Snippet */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {Object.entries(sq)
          .filter(([key, qty]) => key !== '_meta' && Number(qty) > 0)
          .slice(0, 4)
          .map(([size, qty]) => (
            <div key={size} className="text-center p-1 bg-white/50 rounded border border-gray-100">
              <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">{size}</p>
              <p className="text-[10px] font-bold text-gray-900 leading-none mt-1">{qty as string}</p>
            </div>
          ))}
      </div>

      {/* Worker Info */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50/50 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-[11px] truncate leading-none mb-1">{job.worker_name}</p>
          <div className="flex items-center gap-1.5">
            {!isProcessed && (
              <button
                onClick={() => onEditRate(job)}
                className="group/rate flex items-center gap-1 hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-gray-100 transition-colors"
                title="Edit processing rate"
              >
                <span className="text-[10px] font-bold text-gray-400 group-hover/rate:text-indigo-600">₹{job.processing_rate}/pc</span>
                <Pencil className="w-2.5 h-2.5 text-gray-300 group-hover/rate:text-indigo-400" />
              </button>
            )}
            <span className="text-[10px] text-gray-500">• {totalPieces} items</span>
          </div>
        </div>
      </div>      {/* Action */}
      {job.stage_id < 16 && (
        isProcessed ? (
          (
            <Button
              size="sm"
              className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => {
                // If it's the last stage, it should handleComplete but logically isProcessed means it's done here.
                // We open the move panel to send it to the next active workshop.
                onMove(job);
              }}
              disabled={isSubmitting}
            >
              <ArrowRight className="w-3 h-3 mr-2" />
              Assign Next Stage
            </Button>
          )
        ) : (
          <Button
            size="sm"
            className="w-full h-8 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
            onClick={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
            Complete Stage
          </Button>
        )
      )}

      {/* Footer Meta */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {new Date(job.created_on).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="font-bold uppercase tracking-widest text-indigo-300">{job.stage_name}</span>
      </div>
    </div>
  );
}



interface Stage {
  id: number;
  name: string;
  jobs: ProcessingJob[];
}

export function ProductionBoard() {
  const [view, setView] = useState<"processing" | "history">("processing");
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [availableStock, setAvailableStock] = useState<any[]>([]);

  // Transition Modal State
  const [transitionJob, setTransitionJob] = useState<ProcessingJob | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New States for Details and Rate Edit
  const [viewingJob, setViewingJob] = useState<ProcessingJob | null>(null);
  const [fabricDetails, setFabricDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [editingAssignmentJob, setEditingAssignmentJob] = useState<ProcessingJob | null>(null);
  const [newRate, setNewRate] = useState<string>("");
  const [newEmpId, setNewEmpId] = useState<string>("");

  // History States
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [workerFilter, setWorkerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [isExportingAll, setIsExportingAll] = useState(false);

  const fetchBoard = async () => {
    try {
      const data = await api.get('/processing/board');
      setStages(data.stages || []);
      // Refresh helpers (stock and employees) alongside board
      fetchHelpers();
    } catch (error) {
      toast.error("Failed to load production board");
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpers = async () => {
    try {
      const empData = await api.get('/employees');
      // Use ALL employees (Fabricators needed for Stage 1)
      setEmployees(empData.employees || []);

      const stockData = await api.get('/processing/available-stock');
      setAvailableStock(stockData.availableStock || []);
    } catch (error) {
      console.error("Failed to load helper data");
    }
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const params: any = {
        search: searchQuery,
        worker: workerFilter !== 'all' ? workerFilter : undefined,
        stage: (stageFilter === "fabrication" || stageFilter === "1_pasting") ? "1" : (stageFilter === "all" ? undefined : stageFilter),
        fromDate: dateRange.from || undefined,
        toDate: dateRange.to || undefined
      };
      const data = await processingAPI.getHistory(params);

      // Client-side filtering for specific stage types if the API doesn't handle them directly
      const filteredData = data.history.filter((row: any) => {
        const matchesStage = stageFilter === "all" ||
          (stageFilter === "fabrication" ? (row.stage_id === 1 && row.worker_role === 'Fabricator') :
            stageFilter === "1_pasting" ? (row.stage_id === 1 && row.worker_role !== 'Fabricator') :
              row.stage_id.toString() === stageFilter);
        return matchesStage;
      });

      setHistoryData(filteredData || []);
    } catch (error) {
      toast.error("Failed to load production history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const exportToCSV = (data: any[], filenamePrefix: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Job ID", "Master Order", "Organization", "Product", "Worker", "Stage", "Quantity (pcs)", "Rate", "Total Amount", "Date", "Time"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => {
        let sq = {};
        try {
          sq = typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq;
        } catch (e) { }

        const total = Object.entries(sq)
          .filter(([key]) => key !== '_meta')
          .reduce((a: any, b: any) => Number(a) + Number(b[1]), 0);

        return [
          row.id,
          row.master_order_id,
          `"${row.org_name}"`,
          `"${row.article_name}"`,
          `"${row.worker_name}"`,
          row.worker_role === 'Fabricator' ? 'Fabrication' : row.stage_name,
          total,
          row.processing_rate,
          (total * row.processing_rate).toFixed(2),
          new Date(row.updated_on).toLocaleDateString(),
          new Date(row.updated_on).toLocaleTimeString()
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFiltered = () => {
    exportToCSV(historyData, "filtered_production_history");
  };

  const handleExportAllData = async () => {
    setIsExportingAll(true);
    try {
      // Fetch all history without filters
      const data = await processingAPI.getHistory({});
      exportToCSV(data.history || [], "all_production_history");
      toast.success("All data exported successfully");
    } catch (error) {
      toast.error("Failed to export all data");
    } finally {
      setIsExportingAll(false);
    }
  };

  useEffect(() => {
    if (view === "processing") {
      fetchBoard();
      fetchHelpers();
    } else {
      fetchHistory();
    }
  }, [view, searchQuery, workerFilter, stageFilter, dateRange]);

  const handleAssign = async (stockId: number, empId: number, stageId: number, rate: number, sq: any) => {
    setIsSubmitting(true);
    try {
      await api.post('/processing/assign', {
        cut_stock_id: stockId,
        emp_id: empId,
        stage_id: stageId,
        sq: sq,
        processing_rate: rate
      });
      toast.success("Worker assigned to floor");
      setTransitionJob(null);
      setSelectedEmpId("");
      fetchBoard();
    } catch (error: any) {
      toast.error(error.message || "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignmentJob) return;
    setIsSubmitting(true);
    try {
      await api.put(`/processing/${editingAssignmentJob.id}/assignment`, {
        processing_rate: parseFloat(newRate) || 0,
        emp_id: parseInt(newEmpId) || undefined
      });
      toast.success("Assignment updated successfully");
      setEditingAssignmentJob(null);
      fetchBoard();
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchFabricDetails = async (jobId: number) => {
    setIsLoadingDetails(true);
    try {
      const data = await api.get(`/processing/${jobId}/fabric-details`);
      setFabricDetails(data.details || []);
    } catch (error) {
      toast.error("Failed to load fabric details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const totalActive = stages.reduce((acc, stage) => acc + stage.jobs.length, 0);

  return (
    <div className="flex-1 overflow-hidden bg-[#f8fafc] flex flex-col">
      {/* Dynamic Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            Production Floor
          </h1>
          <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">
            {view === "processing" ? "Real-time stage tracking" : "Completed Job History"} • <span className="text-indigo-600">{totalActive} Jobs Active</span>
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
            <Button
              variant={view === "processing" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("processing")}
              className={cn(
                "text-xs px-6 font-bold h-8 transition-all duration-200",
                view === "processing"
                  ? "bg-white text-indigo-600 shadow-sm hover:bg-white border border-gray-100"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Processing
            </Button>
            <Button
              variant={view === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("history")}
              className={cn(
                "text-xs px-6 font-bold h-8 transition-all duration-200",
                view === "history"
                  ? "bg-white text-indigo-600 shadow-sm hover:bg-white border border-gray-100"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              History
            </Button>
          </div>

          {view === "processing" && (
            <Button variant="outline" size="sm" onClick={fetchBoard} className="text-xs h-9 font-bold border-gray-200 shadow-sm">
              Refresh Board
            </Button>
          )}
        </div>
      </div>

      {view === "processing" ? (
        /* Kanban Board */
        <div className="flex-1 overflow-x-auto p-6 flex gap-6">
          {loading ? (
            <div className="min-w-full flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Floor Data...</p>
              </div>
            </div>
          ) : stages.length === 0 ? (
            <div className="min-w-full flex items-center justify-center py-20 bg-white/50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold uppercase tracking-widest">Floor is empty. Assign workers to start.</p>
            </div>
          ) : (
            stages
              .filter(stage => stage.id !== 0) // Hide "YET TO PROCESS"
              .map((stage) => (
                <div key={stage.id} className="flex-shrink-0 w-[300px] flex flex-col h-full">
                  {/* Column Header */}
                  <div className="mb-4 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                      <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                        {stage.name}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="bg-white text-gray-600 border-gray-100 text-[10px] h-5 px-2">
                      {stage.jobs.length}
                    </Badge>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 bg-gray-100/30 rounded-lg p-3 space-y-4 overflow-y-auto border border-gray-200/50 hover:bg-gray-100/50 transition-colors scrollbar-hide">
                    {stage.jobs.length > 0 ? (
                      stage.jobs.map((job) => {
                        // Logic Simplified:
                        // Backend now DEDUCTS quantity from the current job when assigning to next stage.
                        // So 'isNextAssigned' logic (checking if next stage has total >= current) is no longer needed.
                        // If the current job exists in the list (handled by backend filter), it has remaining quantity.
                        // Therefore, the button should always be visible (isNextAssigned = false).

                        const nextStage = stages.find(s => s.id === stage.id + 1);
                        const isNextAssigned = false;

                        // We keep 'nextStage' var if needed for other logic, but for button visibility, 
                        // we rely on the fact that if this card is here, it has quantity to move.

                        return (
                          <JobCardComponent
                            key={job.id}
                            job={job}
                            onRefresh={fetchBoard}
                            onMove={(job) => setTransitionJob(job)}
                            onViewDetails={(job) => {
                              setViewingJob(job);
                              fetchFabricDetails(job.id);
                            }}
                            onEditRate={(job) => {
                              setEditingAssignmentJob(job);
                              setNewRate(job.processing_rate.toString());
                              setNewEmpId(employees.find(e => e.name === job.worker_name)?.id?.toString() || "");
                            }}
                            isNextAssigned={isNextAssigned}
                          />
                        );
                      })
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center opacity-40">
                        <User className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Wait for assignment</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        /* History View Implementation */
        <div className="flex-1 flex flex-col p-8 overflow-hidden">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search Product or ID..."
                className="pl-10 h-10 border-gray-100 rounded-lg bg-gray-50/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="w-[180px] h-10 border-gray-100 rounded-lg bg-gray-50/50 font-bold">
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px] h-10 border-gray-100 rounded-lg bg-gray-50/50 font-bold">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.length > 0 ? (
                  <>
                    <SelectItem value="fabrication">Fabrication</SelectItem>
                    <SelectItem value="1_pasting">Pasting and Elastic</SelectItem>
                    {stages
                      .filter(s => s.id !== 0 && s.id !== 1 && s.id !== 8) // Hide "YET TO PROCESS", Stage 1 (handled above), and "Processed"
                      .map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                  </>
                ) : (
                  <>
                    <SelectItem value="fabrication">Fabrication</SelectItem>
                    <SelectItem value="1_pasting">Pasting and Elastic</SelectItem>
                    {[2, 3, 4, 5, 6, 7].map(s => (
                      <SelectItem key={s} value={s.toString()}>Stage {s}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 bg-gray-50/50 border border-gray-100 rounded-lg px-3 h-10">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                className="bg-transparent border-none text-xs font-bold text-gray-600 focus:outline-none"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <span className="text-gray-300">→</span>
              <input
                type="date"
                className="bg-transparent border-none text-xs font-bold text-gray-600 focus:outline-none"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>

            <Button variant="ghost" size="sm" className="h-10 text-xs font-bold rounded-lg" onClick={() => {
              setSearchQuery("");
              setWorkerFilter("all");
              setStageFilter("all");
              setDateRange({ from: "", to: "" });
            }}>Reset</Button>

            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-[11px] font-bold border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm rounded-lg"
                onClick={handleExportFiltered}
              >
                <Download className="w-4 h-4 mr-2" /> Export Filtered
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-[11px] font-bold border-gray-200 bg-white hover:bg-gray-50 text-indigo-600 shadow-sm rounded-lg relative overflow-hidden"
                onClick={handleExportAllData}
                disabled={isExportingAll}
              >
                {isExportingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export All Data
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Job #</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Worker / Stage</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SQ (Items)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Fetching production logs...</p>
                      </td>
                    </tr>
                  ) : historyData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <History className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-xs italic">No matching production records found.</p>
                      </td>
                    </tr>
                  ) : (
                    historyData.map((row, index) => {
                      const sq = typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq;
                      const total = Object.entries(sq)
                        .filter(([key]) => key !== '_meta')
                        .reduce((a: number, [_, qty]: any) => a + Number(qty), 0);

                      return (
                        <tr key={row.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none font-bold">Job #{historyData.length - index}</Badge>
                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Master #{row.master_order_id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900 leading-tight">{row.org_name}</p>
                            <p className="text-xs text-gray-500">{row.article_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-700 text-xs leading-none">{row.worker_name}</p>
                                  {row.worker_role === 'Fabricator' && (
                                    <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-[9px] font-black px-1.5 py-0">
                                      FABRICATOR
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                  {row.worker_role === 'Fabricator' ? 'Fabrication' : row.stage_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">
                            {total} <span className="text-[10px] text-gray-400">pcs</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-gray-700">₹{row.processing_rate}</p>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">₹{(total * row.processing_rate).toFixed(2)} total</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[11px] font-bold text-gray-600">
                              {new Date(row.updated_on).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                              {new Date(row.updated_on).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Summary Footer */}
            <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Showing {historyData.length} Recent Records</p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Employee Assignment Modal */}
      <Modal
        isOpen={!!transitionJob}
        onClose={() => setTransitionJob(null)}
        title="Assign Next Production Stage"
        size="sm"
      >
        {transitionJob && (() => {
          return <MultiEmployeeAssignmentPanel
            transitionJob={transitionJob}
            employees={employees}
            onCancel={() => setTransitionJob(null)}
            onSubmit={async (assignments, stockUsed) => {
              setIsSubmitting(true);
              try {
                // 1. Assign multiple (with stockUsed for the first assignment if needed, or separate call?)
                // The backend 'assignMultipleWorkers' doesn't support stockUsed yet? 
                // Wait, I only updated 'assignWorker' (single).
                // I need to update 'assignMultipleWorkers' in backend too if I want multi-assignment + stock.
                // BUT, user requirement: "If Internal Stock used... Remaining quantity continues...".
                // If we use stock, we likely process it immediately/deduct it.
                // If partial stock + partial production?
                // "Remaining quantity goes directly to Fabricator or Tailor."

                // Simplification: If stock is used, we treat it as a separate "assignment" (auto-completed).
                // The backend 'assignWorker' handles stockUsed.
                // Does 'assignMultipleWorkers'? No.

                // Strategy:
                // If stock matches requirement fully -> Call 'assignWorker' with stockUsed (no emp).
                // If partial ->
                // We need to call 'assignWorker' for the stock part? Or pass stockUsed to one of the assignments?
                // 'assignWorker' takes 'stockUsed' and deducts it.
                // If I use 'assignMultipleWorkers', I need to add stock support there too.

                // Let's stick to 'assignWorker' for now if Stock is being used? 
                // Or update 'assignMultipleWorkers'.

                // I'll update 'assignMultipleWorkers' in backend to accept 'stockUsed' global param.

                // Calculate next stage using bitwise logic
                const currentStageId = transitionJob.stage_id;
                const stageCode = transitionJob.stage_code !== undefined && transitionJob.stage_code !== null 
                    ? Number(transitionJob.stage_code) 
                    : 131071;

                let nextStageId = 16; // Default to Processed
                for (let s = currentStageId + 1; s < 16; s++) {
                    if ((stageCode & (1 << s)) !== 0) {
                        nextStageId = s;
                        break;
                    }
                }

                await api.post('/processing/assign-multiple', {
                  cut_stock_id: transitionJob.cut_stock_id || 0,
                  parent_job_id: transitionJob.id,
                  stage_id: nextStageId,
                  assignments,
                  stockUsed
                });

                toast.success(`Assignments created successfully`);
                setTransitionJob(null);
                fetchBoard();
                fetchHelpers();
              } catch (error: any) {
                if (error.response?.status === 422) {
                  toast.error(error.response.data.message || "Over-assignment detected");
                } else {
                  toast.error(error.message || "Assignment failed");
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            isSubmitting={isSubmitting}
          />
        })()}
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingJob}
        onClose={() => setViewingJob(null)}
        title="Cloth & Fabric Usage Detail"
        size="lg"
      >
        {viewingJob && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Source Job</p>
                <h4 className="font-bold text-gray-900">{viewingJob.org_name}</h4>
                <p className="text-xs text-gray-600">{viewingJob.article_name}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-indigo-600 text-white font-bold uppercase text-[9px]">#{viewingJob.id}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Cut Fabric Logs</h5>
              {isLoadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Fetching usage history...</p>
                </div>
              ) : fabricDetails.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 italic">No fabric logs found for this assignment.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100/50">
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-tighter">Fabric Type</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-tighter">Variant</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-tighter">Used Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {fabricDetails.map((d, i) => (
                        <tr key={i} className="bg-white hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 mt-1">
                            <p className="font-bold text-gray-900">{d.cloth_type}</p>
                            <p className="text-[10px] text-gray-400">{d.quality_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-700">{d.color_name}</p>
                            <p className="text-[10px] text-gray-400">{d.design_name}</p>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 bg-indigo-50/20">
                            {d.used_qty}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setViewingJob(null)} className="h-10 px-8 font-bold">Close Details</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        isOpen={!!editingAssignmentJob}
        onClose={() => setEditingAssignmentJob(null)}
        title="Update Job Assignment"
        size="md"
      >
        {editingAssignmentJob && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reassign Worker</Label>
              <Select value={newEmpId} onValueChange={setNewEmpId}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Select new worker..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.role_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate (per piece)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                <Input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="pl-7 h-12 bg-gray-50/50 border-gray-100 rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-3">
              <Button variant="ghost" className="flex-1 font-bold" onClick={() => setEditingAssignmentJob(null)}>Cancel</Button>
              <Button
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 font-bold"
                onClick={handleUpdateAssignment}
                disabled={isSubmitting || !newRate || !newEmpId}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize Change"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div >
  );
}

