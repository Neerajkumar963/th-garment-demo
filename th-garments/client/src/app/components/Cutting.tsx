import { Scissors, Clock, AlertCircle, CheckCircle2, User, Loader2, Plus, Ruler, Package, Eye, History, LayoutDashboard, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { format, isToday, isYesterday, subDays, startOfMonth, isAfter } from "date-fns";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { useState, useEffect, useMemo } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Modal } from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RecordFabricModal } from "./modals/RecordFabricModal";
import { CompleteJobModal } from "./modals/CompleteJobModal";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface CuttingJob {
  id: number;
  order_id: number;
  article_id: number;
  org_name: string;
  article_name: string;
  sq: any; // JSON object {S: 10, M: 20...}
  status: string;
  cutter_name: string;
  created_on: string;
  fabric_usage_logs?: any[];
  assigned_fabric_id?: string;
  product_color_id?: number;
  product_remarks?: string;
  item_name?: string;
  remarks?: string;
  updated_on?: string;
}

// Replaces CuttingJobCard - behaves as a detail view
function JobDetailsModal({ job, isOpen, onClose, onRefresh, masterData }: {
  job: CuttingJob | null,
  isOpen: boolean,
  onClose: () => void,
  onRefresh: () => void,
  masterData: any
}) {
  // If no job selected, return nothing
  if (!job) return null;

  // Parse SQ to get total pieces
  const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
  const totalPieces = Object.values(sq).reduce((a: any, b: any) => a + (parseInt(b) || 0), 0) as number;

  const hasFabricRecorded = job.fabric_usage_logs && job.fabric_usage_logs.length > 0;
  const progress = job.status === 'Completed' ? 100 : (hasFabricRecorded ? 50 : 10);

  const getLabel = (type: string, id: any) => {
    if (!id) return 'N/A';
    const list = masterData[type] || [];
    const item = list.find((i: any) => i.id.toString() === id.toString());
    if (type === 'clothTypes') return item?.type || `ID:${id}`;
    if (type === 'colors') return item?.color_name || `ID:${id}`;
    if (type === 'designs') return item?.design_name || `ID:${id}`;
    if (type === 'qualities') return item?.quality_name || `ID:${id}`;
    return `Ref:${id}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Job Details`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Job Info Header */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{job.article_name}</h3>
              <p className="text-sm text-gray-500">{job.org_name}</p>
            </div>
          </div>
          <Badge
            className={
              job.status === "Completed"
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }
          >
            {job.status.toUpperCase()}
          </Badge>
        </div>

        {/* Progress */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Progress Status</span>
            <span className="text-sm font-bold text-gray-900">{totalPieces} Pieces Planned</span>
          </div>
          <Progress value={progress} className="h-2 mb-4" />
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Order Reference</Label>
            <p className="font-bold text-indigo-600">ORDER #{job.order_id}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Fabric Requirements</Label>
            {job.product_remarks ? (
              <div className="mt-2">
                {(() => {
                  try {
                    const reqs = JSON.parse(job.product_remarks);
                    const color = getLabel('colors', job.product_color_id);
                    const type = getLabel('clothTypes', reqs.ct);
                    const design = getLabel('designs', reqs.d);
                    const quality = getLabel('qualities', reqs.q);

                    return (
                      <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/60 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Product Unit</p>
                            <p className="text-sm font-extrabold text-slate-900 tracking-tight">{job.article_name}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold bg-white border-slate-200 text-slate-600 px-2 py-0 border-2">
                            {job.item_name || 'Item'}
                          </Badge>
                        </div>

                        <div className="h-0.5 bg-slate-100 rounded-full w-full"></div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.1em]">Fabric Specification</p>
                          <p className="text-sm font-bold text-indigo-700 font-sans flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></span>
                            {type} · {design} · {color} · {quality}
                          </p>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return <span className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded">Config Load Error</span>;
                  }
                })()}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-gray-400 italic bg-gray-50 p-2 rounded border border-dashed border-gray-200">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">No specific fabric linked</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Assigned Operator</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200">
                <User className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-700">{job.cutter_name}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Deployment Date</Label>
            <div className="flex items-center gap-2 mt-1 text-gray-600 font-medium">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{new Date(job.created_on).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Quantity Breakdown */}
        <div>
          <Label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Quantity Breakdown</Label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(sq).filter(([key]) => key !== '_meta').map(([size, qty]: any) => (
              <Badge key={size} variant="outline" className="bg-white text-gray-700 border-gray-200">
                <span className="font-bold mr-1">{size}:</span> {qty}
              </Badge>
            ))}
          </div>
        </div>

        {/* Fabric Usage Logs */}
        {job.fabric_usage_logs && job.fabric_usage_logs.length > 0 && (
          <div>
            <Label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Fabric Usage Log</Label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="h-8 text-xs font-bold">Roll ID</TableHead>
                    <TableHead className="h-8 text-xs font-bold">Color · Quality</TableHead>
                    <TableHead className="h-8 text-xs font-bold text-right">Used</TableHead>
                    <TableHead className="h-8 text-xs font-bold text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.fabric_usage_logs.map((log: any, idx: number) => {
                    // Calculate usage logic (reused from old component)
                    let used = 0;
                    let metaFabric: any = {};
                    try {
                      const sqObj = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                      if (sqObj && sqObj._meta && sqObj._meta.fabric) {
                        metaFabric = sqObj._meta.fabric;
                      }
                    } catch (e) { }
                    used = metaFabric[log.cloth_quantity_id] || metaFabric[String(log.cloth_quantity_id)];
                    if (used === undefined || used === null) {
                      used = parseFloat(log.original_roll_quantity) - parseFloat(log.bal_cloth);
                    }

                    return (
                      <TableRow key={idx}>
                        <TableCell className="py-2 text-xs font-mono">#{log.cloth_quantity_id}</TableCell>
                        <TableCell className="py-2 text-xs">
                          <span className="font-bold text-gray-900">{log.color_name}</span>
                          <span className="mx-1 text-gray-300">|</span>
                          <span className="text-gray-500">{log.cloth_type}</span>
                        </TableCell>
                        <TableCell className="py-2 text-xs font-bold text-red-600 text-right">{used ? `${Number(used).toFixed(2)}m` : '-'}</TableCell>
                        <TableCell className="py-2 text-xs font-bold text-green-600 text-right">{Number(log.bal_cloth).toFixed(2)}m</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Remarks */}
        {job.remarks && (
          <div>
            <Label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Remarks</Label>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono text-gray-500">{job.remarks}</p>
          </div>
        )}


      </div>
    </Modal>
  );
}

// New Info Card for Pending Order Item (Kept as is)
function PendingOrderItem({ order, item, employees, onAssign }: { order: any, item: any, employees: any[], onAssign: (empId: string) => void }) {
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (employees.length === 1) {
      setSelectedEmpId(employees[0].id.toString());
    }
  }, [employees]);

  const handleAssign = async () => {
    if (!selectedEmpId) {
      toast.error("Please select a tailor first");
      return;
    }
    setIsAssigning(true);
    await onAssign(selectedEmpId);
    setIsAssigning(false);
  };

  return (
    <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order #{order.id}</p>
          {item.assigned_fabric_id && (
            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">Fabric Locked</Badge>
          )}
        </div>
        <p className="font-bold text-gray-900 mb-1">{order.org_name}</p>
        <p className="text-xs text-gray-500 mb-4">{item.article_name} ({Object.values(typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq).reduce((a: any, b: any) => a + b, 0)} pcs)</p>
      </div>

      <div className="space-y-2 mt-auto">
        <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
          <SelectTrigger className="h-9 text-xs bg-white">
            <SelectValue placeholder="Tailor selection" />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-full h-9 text-xs bg-slate-900 hover:bg-slate-800"
          onClick={handleAssign}
          disabled={!selectedEmpId || isAssigning}
        >
          {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : "Select"}
        </Button>
      </div>
    </div>
  );
}

export function Cutting() {
  const [activeTab, setActiveTab] = useState("current");
  const [jobs, setJobs] = useState<CuttingJob[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const [masterData, setMasterData] = useState({
    clothTypes: [],
    colors: [],
    designs: [],
    qualities: []
  });

  // Selection for Detail  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // Selected Data States
  const [selectedJob, setSelectedJob] = useState<CuttingJob | null>(null);
  const [recordingJob, setRecordingJob] = useState<CuttingJob | null>(null);
  const [completingJob, setCompletingJob] = useState<CuttingJob | null>(null);

  const fetchMasters = async () => {
    try {
      const [ct, c, d, q] = await Promise.all([
        api.get('/fabric/cloth-types'),
        api.get('/fabric/colors'),
        api.get('/fabric/designs'),
        api.get('/fabric/qualities')
      ]);
      setMasterData({
        clothTypes: Array.isArray(ct) ? ct : (ct.cloth_types || []),
        colors: Array.isArray(c) ? c : (c.colors || []),
        designs: Array.isArray(d) ? d : (d.designs || []),
        qualities: Array.isArray(q) ? q : (q.qualities || [])
      });
    } catch (e) {
      console.error("Failed to fetch master data", e);
    }
  };

  const fetchFabrics = async () => {
    try {
      const data = await api.get('/fabric');
      setFabrics(data.fabrics || []);
    } catch (error) {
      console.error("Failed to fetch fabrics");
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees');
      const allowedRoles = ['self', 'cutting master', 'fabricator'];
      const filtered = (data.employees || []).filter(
        (e: any) => e.role_name && allowedRoles.includes(e.role_name.toLowerCase())
      );
      setEmployees(filtered);
    } catch (error) {
      console.error("Failed to fetch employees");
    }
  };

  const [collapsedCurrentGroups, setCollapsedCurrentGroups] = useState<Record<string, boolean>>({
    "In Queue": false,
    "In Process": false,
  });

  const toggleCurrentGroup = (groupName: string) => {
    setCollapsedCurrentGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const fetchJobs = async () => {
    try {
      const data = await api.get('/cutting');
      setJobs(data.jobs || []);
    } catch (error) {
      toast.error("Failed to load cutting jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      const data = await api.get('/cutting/pending-orders');
      setPendingOrders(data.pending_orders || []);
    } catch (error) {
      console.error("Failed to load pending orders");
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchPending();
    fetchEmployees();
    fetchFabrics();
    fetchMasters();
  }, []);

  const handleStartJob = async (orderId: number, item: any, empId: string) => {
    try {
      await api.post('/cutting', {
        order_id: orderId,
        article_id: item.article_id,
        pattern_series: "Standard",
        assignments: [{
          emp_id: parseInt(empId),
          sq: typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq,
        }]
      });

      toast.success(`Job assigned successfully`);
      fetchJobs();
      fetchPending();
    } catch (error: any) {
      toast.error(error.message || "Failed to start job");
    }
  };

  const handleOpenCompleteModal = (job: CuttingJob) => {
    setCompletingJob(job);
    setIsCompleteModalOpen(true);
  };

  const handleRecordFabric = (job: CuttingJob) => {
    setRecordingJob(job);
    setIsRecordModalOpen(true);
  };

  const openDetails = (job: CuttingJob) => {
    setSelectedJob(job);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cutting Department</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest leading-none">Monitor and manage fabric cutting operations</p>
          </div>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52] font-black px-6 h-12 rounded-lg shadow-lg shadow-rose-200 transition-all"
            onClick={() => setShowNewJobModal(!showNewJobModal)}
          >
            {showNewJobModal ? "Close Panel" : (
              <>
                <Scissors className="w-5 h-5 mr-2" />
                Pending Orders for Cutting
              </>
            )}
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'current' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('current')}
            className={`h-10 px-6 rounded-lg font-bold transition-all ${activeTab === 'current' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Current Floor
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className={`h-10 px-6 rounded-lg font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <History className="w-4 h-4 mr-2" />
            Cutting History
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* New Job Assignment Panel */}
        {showNewJobModal && (
          <div className="mb-8 p-6 bg-white rounded-lg border-2 border-primary/20 shadow-lg animate-in slide-in-from-top duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-primary" />
              Pending Orders for Cutting
            </h2>
            {pendingOrders.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No pending orders available for cutting.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.flatMap((order) =>
                  order.items.map((item: any, idx: number) => (
                    <PendingOrderItem
                      key={`${order.id}-${item.id || idx}`}
                      order={order}
                      item={item}
                      employees={employees}
                      onAssign={(empId) => handleStartJob(order.id, item, empId)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}



        {/* Jobs Table */}
        {activeTab === 'current' ? (
          <div className="space-y-8">
            {/* In Process Section */}
            <div className="border border-slate-300 rounded-md overflow-hidden bg-white">
              <button
                onClick={() => toggleCurrentGroup("In Process")}
                className="w-full flex items-center justify-between p-4 bg-[#f8fafc] hover:bg-slate-50 transition-colors text-left border-b border-slate-300"
              >
                <div className="flex items-center gap-2">
                  {collapsedCurrentGroups["In Process"] ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    In Process <span className="text-xs ml-2 bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{jobs.filter(j => j.status === 'In Process').length}</span>
                  </h3>
                </div>
              </button>

              {!collapsedCurrentGroups["In Process"] && (
                <div className="bg-white overflow-hidden">
                  {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : jobs.filter(j => j.status === 'In Process').length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/50">
                      <Scissors className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-bold text-sm">No jobs currently in process.</p>
                      {/* In Queue Section */}
                      <div className="border border-slate-300 rounded-md overflow-hidden bg-white">
                        <button
                          onClick={() => toggleCurrentGroup("In Queue")}
                          className="w-full flex items-center justify-between p-4 bg-[#f8fafc] hover:bg-slate-50 transition-colors text-left border-b border-slate-300"
                        >
                          <div className="flex items-center gap-2">
                            {collapsedCurrentGroups["In Queue"] ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                              In Queue <span className="text-xs ml-2 bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{jobs.filter(j => j.status === 'Pending').length}</span>
                            </h3>
                          </div>
                        </button>

                        {!collapsedCurrentGroups["In Queue"] && (
                          <div className="bg-white overflow-hidden">
                            {loading ? (
                              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                            ) : jobs.filter(j => j.status === 'Pending').length === 0 ? (
                              <div className="text-center py-12 bg-gray-50/50">
                                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-bold text-sm">No jobs waiting in queue.</p>
                              </div>
                            ) : (
                              <Table>
                                <TableHeader className="bg-gray-50/50 border-b border-gray-100">
                                  <TableRow>
                                    <TableHead className="w-[100px] font-black text-[10px] uppercase text-gray-400 tracking-widest pl-8 py-5">Ref</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Article Name</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Size : Quantity</TableHead>
                                    <TableHead className="w-[220px] pl-6 font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Status</TableHead>
                                    <TableHead className="w-[300px] pl-8 font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-50">
                                  {jobs.filter(j => j.status === 'Pending').map((job, index) => {
                                    const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                                    const sqSummary = Object.entries(sq)
                                      .filter(([k]) => k !== '_meta')
                                      .map(([s, q]) => `${s}:${q}`)
                                      .join(", ");

                                    return (
                                      <TableRow key={job.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <TableCell className="font-mono text-xs font-black text-gray-500 pl-8 py-5">#{jobs.length - index}</TableCell>
                                        <TableCell className="py-5">
                                          <div className="space-y-0.5">
                                            <span className="font-extrabold text-sm text-gray-900 block">{job.article_name}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{job.org_name}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                          <div className="flex flex-wrap gap-1.5">
                                            {sqSummary.split(', ').map((s, i) => (
                                              <Badge key={i} variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-gray-200 text-gray-600 bg-white shadow-sm">
                                                {s}
                                              </Badge>
                                            ))}
                                          </div>
                                        </TableCell>
                                        <TableCell className="pl-6 py-5">
                                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm font-black uppercase tracking-widest text-[10px] px-3 py-1">
                                            PENDING
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="pl-8 py-5">
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 shadow-sm transition-all"
                                              onClick={() => handleRecordFabric(job)}
                                            >
                                              <Ruler className="w-3.5 h-3.5 mr-1.5" />
                                              Record Fabric
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-xs font-bold text-gray-400 hover:text-gray-900 h-8 px-2"
                                              onClick={() => openDetails(job)}
                                            >
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-gray-50/50 border-b border-gray-100">
                        <TableRow>
                          <TableHead className="w-[100px] font-black text-[10px] uppercase text-gray-400 tracking-widest pl-8 py-5">Ref</TableHead>
                          <TableHead className="font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Article Name</TableHead>
                          <TableHead className="font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Size : Quantity</TableHead>
                          <TableHead className="w-[220px] pl-6 font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Status</TableHead>
                          <TableHead className="w-[300px] pl-8 font-black text-[10px] uppercase text-gray-400 tracking-widest py-5">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-50">
                        {jobs.filter(j => j.status === 'In Process').map((job, index) => {
                          const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                          const sqSummary = Object.entries(sq)
                            .filter(([k]) => k !== '_meta')
                            .map(([s, q]) => `${s}:${q}`)
                            .join(", ");

                          return (
                            <TableRow key={job.id} className="hover:bg-blue-50/30 transition-colors group">
                              <TableCell className="font-mono text-xs font-black text-gray-500 pl-8 py-5">#{job.id}</TableCell>
                              <TableCell className="py-5">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-sm text-gray-900 block">{job.article_name}</span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{job.org_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5">
                                <div className="flex flex-wrap gap-1.5">
                                  {sqSummary.split(', ').map((s, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-gray-200 text-gray-600 bg-white shadow-sm">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="pl-6 py-5">
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-black uppercase tracking-widest text-[10px] px-3 py-1">
                                  IN PROCESS
                                </Badge>
                              </TableCell>
                              <TableCell className="pl-8 py-5">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className={`h-8 text-xs font-bold px-4 transition-all ${completingJob?.id === job.id ? 'bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200'}`}
                                    onClick={() => handleOpenCompleteModal(job)}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                    Complete
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs font-bold text-gray-400 hover:text-gray-900 h-8 px-2"
                                    onClick={() => openDetails(job)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <CuttingHistoryView jobs={jobs} openDetails={openDetails} />
        )}
      </div>

      {/* Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onRefresh={() => {
          fetchJobs();
        }}
        masterData={masterData}
      />

      {/* Record Fabric Modal for Table Actions */}
      {recordingJob && (
        <RecordFabricModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setRecordingJob(null);
          }}
          jobId={recordingJob.id}
          articleId={recordingJob.article_id}
          onSuccess={() => {
            fetchJobs();
            setIsRecordModalOpen(false);
            setRecordingJob(null);
          }}
          fabrics={fabrics}
          productColorId={recordingJob.product_color_id}
          productRemarks={recordingJob.product_remarks}
          initialFabricId={recordingJob.assigned_fabric_id || ""}
          targetSq={typeof recordingJob.sq === 'string' ? JSON.parse(recordingJob.sq) : recordingJob.sq}
        />
      )}

      {/* Complete Job Modal */}
      {completingJob && (
        <CompleteJobModal
          isOpen={isCompleteModalOpen}
          onClose={() => {
            setIsCompleteModalOpen(false);
            setCompletingJob(null);
          }}
          jobId={completingJob.id}
          assignedRolls={(() => {
            let assigned: number[] = [];
            try {
              const sq = typeof completingJob.sq === 'string' ? JSON.parse(completingJob.sq) : completingJob.sq;
              if (sq?._meta?.assigned_rolls) {
                assigned = sq._meta.assigned_rolls;
              }
            } catch (e) { }
            return assigned;
          })()}
          onSuccess={() => {
            fetchJobs();
            setIsCompleteModalOpen(false);
            setCompletingJob(null);
          }}
        />
      )}
    </div>
  );
}

function CuttingHistoryView({ jobs, openDetails }: { jobs: CuttingJob[], openDetails: (job: CuttingJob) => void }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "Today": false,
    "Yesterday": false,
    "Last Week": true,
    "Earlier this Month": false,
    "Last Month": true,
    "A Long Time Ago": true
  });

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // 1. Filter completed jobs
  const completedJobs = jobs.filter(j => j.status === 'Completed');

  // 2. Group by Date
  const grouped = useMemo(() => {
    const groups: Record<string, CuttingJob[]> = {
      "Today": [],
      "Yesterday": [],
      "Last Week": [],
      "Earlier this Month": [],
      "Last Month": [],
      "A Long Time Ago": []
    };

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const lastMonthStart = startOfMonth(subDays(startOfCurrentMonth, 1));

    completedJobs.forEach(job => {
      // Priority: updated_on (completion time), fallback to created_on
      const jobDateStr = job.updated_on || job.created_on;
      const d = new Date(jobDateStr);

      // Safety check for invalid dates
      if (isNaN(d.getTime())) {
        groups["A Long Time Ago"].push(job);
        return;
      }

      if (isToday(d)) {
        groups["Today"].push(job);
      } else if (isYesterday(d)) {
        groups["Yesterday"].push(job);
      } else if (isAfter(d, subDays(now, 7))) {
        groups["Last Week"].push(job);
      } else if (isAfter(d, startOfCurrentMonth)) {
        groups["Earlier this Month"].push(job);
      } else if (isAfter(d, lastMonthStart)) {
        groups["Last Month"].push(job);
      } else {
        groups["A Long Time Ago"].push(job);
      }
    });

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, arr]) => arr.length > 0));
  }, [completedJobs]);

  if (completedJobs.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-bold">No completed cutting jobs yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([groupName, groupJobs]) => (
        <div key={groupName} className="border border-slate-300 rounded-md overflow-hidden bg-white">
          <button
            onClick={() => toggleGroup(groupName)}
            className="w-full flex items-center justify-between p-4 bg-[#f8fafc] hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {collapsedGroups[groupName] ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">
                {groupName} <span className="ml-2 bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{groupJobs.length}</span>
              </h3>
            </div>
          </button>

          {!collapsedGroups[groupName] && (
            <div className="bg-white border-t border-slate-300">
              <Table>
                {/* ... TABLE REMAINS SAME ... */}
                <TableHeader className="bg-slate-50/50 border-b border-gray-100 hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="w-[100px] font-black text-[10px] uppercase text-gray-400 tracking-widest pl-8 py-4">Ref</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-gray-400 tracking-widest py-4">Article Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-gray-400 tracking-widest py-4">Size : Quantity</TableHead>
                    <TableHead className="w-[200px] font-black text-[10px] uppercase text-gray-400 tracking-widest py-4">Completed On</TableHead>
                    <TableHead className="w-[100px] pr-8 font-black text-[10px] uppercase text-gray-400 tracking-widest py-4 text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                  {groupJobs.map((job) => {
                    const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                    const sqSummary = Object.entries(sq)
                      .filter(([k]) => k !== '_meta')
                      .map(([s, q]) => `${s}:${q}`)
                      .join(", ");

                    const dateToShow = job.updated_on ? new Date(job.updated_on) : new Date(job.created_on);

                    return (
                      <TableRow key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-mono text-xs font-black text-gray-400 pl-8 py-4">#{job.id}</TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-sm text-slate-800 block">{job.article_name}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{job.org_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {sqSummary.split(', ').map((s, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-slate-200 text-slate-500 bg-white">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">{format(dateToShow, 'MMM dd, yyyy')}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(dateToShow, 'hh:mm a')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-8 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 text-slate-400 hover:text-slate-900 transition-colors"
                            onClick={() => openDetails(job)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
