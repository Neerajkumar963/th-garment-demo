import { Search, Plus, Trash2, AlertCircle, Loader2, Package, Layers, Scissors, ArrowUp, ArrowDown, Filter, ChevronDown, Check, ChevronsUpDown, X, CheckCircle2, Eye, Tag } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"; // Keeping for other popovers (filters)
import { Button } from "./ui/button";
import { useConfirm } from "./ui/WindowsConfirm";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useState, useEffect, useMemo, memo } from "react";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils.tsx";

import { StockHistoryModal } from "./StockHistoryModal";

interface FabricItem {
  id: number;
  cloth_type: string;
  color_name: string;
  design_name: string;
  quality_name: string;
  total_quantity: number;
  roll_count: number;
  status: "in" | "low" | "out";
  unit: string;
  updated_on: string;
}

interface SellingStockItem {
  article_id: number;
  article_name: string;
  org_name: string;
  size: string;
  price: number;
  brand: string;
  remarks: string;
  available_qty: number;
}

const FabricRow = memo(({ f, onCutting, onSell, onShowRolls, onAddRolls }: {
  f: FabricItem;
  onCutting: (f: FabricItem) => void;
  onSell: (f: FabricItem) => void;
  onShowRolls: (f: FabricItem) => void;
  onAddRolls: (f: FabricItem) => void;
}) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <td className="px-8 py-5">
        <div>
          <p className="font-bold text-gray-900 text-sm uppercase tracking-wide">{f.color_name} <span className="text-gray-300 mx-1">/</span> {f.design_name}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{f.quality_name} • {f.cloth_type}</p>
        </div>
      </td>

      <td className="px-8 py-5">
        <div
          className="flex items-center gap-3 cursor-pointer group/qty"
          onClick={() => onShowRolls(f)}
          title="Click to view roll breakdown"
        >
          <div className="flex items-baseline gap-1 group-hover/qty:text-indigo-600 transition-colors">
            <span className="text-lg font-black font-mono">{Number(f.total_quantity).toFixed(2)}</span>
            <span className="text-[10px] font-black opacity-40 uppercase">{f.unit || 'Mtr.'}</span>
          </div>
          <span className="text-gray-300 font-light mx-1">/</span>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 group-hover/qty:bg-indigo-50 group-hover/qty:text-indigo-600 border-none px-2 py-0.5 font-bold text-xs shadow-none transition-all">
            {f.roll_count} Rolls
          </Badge>
        </div>
      </td>
      <td className="px-8 py-5">
        <Badge
          className={`font-black uppercase tracking-tighter text-[10px] ${f.status === 'in' ? 'bg-green-50 text-green-600' :
            f.status === 'low' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
            }`}
        >
          {f.status === 'in' ? 'Available' : f.status === 'low' ? 'Low Stock' : 'Out of Stock'}
        </Badge>
      </td>
      <td className="px-8 py-5">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600 transition-colors"
            onClick={() => onAddRolls(f)}
            title="Add Rolls to this Fabric"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
            onClick={() => onCutting(f)}
            title="Production Cutting"
          >
            <Scissors className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors"
            onClick={() => onSell(f)}
            title="Retail Sale"
          >
            <Tag className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

const FinishedStockRow = memo(({ s, onHistory }: { s: SellingStockItem; onHistory: (s: SellingStockItem) => void }) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <td className="px-8 py-5">
        <p className="font-bold text-gray-900 text-sm">{s.article_name}</p>

        {s.brand && <p className="text-[10px] font-black text-indigo-500 mt-1 uppercase tracking-widest">{s.brand}</p>}
        {s.remarks && s.remarks !== 'Produced' && (
          <p className="text-[10px] text-gray-400 mt-0.5 italic">"{s.remarks}"</p>
        )}
      </td>
      <td className="px-8 py-5 text-xs font-bold text-gray-600">{s.org_name}</td>
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

export function Inventory() {
  const [view, setView] = useState<"fabric" | "finished">("fabric");
  const [fabrics, setFabrics] = useState<FabricItem[]>([]);
  const [finishedStock, setFinishedStock] = useState<SellingStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Column Filters
  const [clothTypeFilter, setClothTypeFilter] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Popover Open States
  const [isSpecsFilterOpen, setIsSpecsFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Add Fabric Modal state
  const [isAddFabricModalOpen, setIsAddFabricModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [metadata, setMetadata] = useState<{
    clothTypes: any[];
    colors: any[];
    designs: any[];
    qualities: any[];
    dresses: any[];
    cutters: any[];
  }>({ clothTypes: [], colors: [], designs: [], qualities: [], dresses: [], cutters: [] });


  const [isCuttingModalOpen, setIsCuttingModalOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedFabricForCutting, setSelectedFabricForCutting] = useState<FabricItem | null>(null);
  const [localSizes, setLocalSizes] = useState<{ id: string; size: string; qty: number }[]>([]);
  const [cuttingForm, setCuttingForm] = useState({
    article_id: "",
    order_id: "",
    emp_id: "",
    pattern_series: "",
    sq: {} as { [key: string]: number },
  });
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  const [fabricForm, setFabricForm] = useState({
    clothType: "",
    colorName: "",
    designName: "",
    qualityName: "",
    rolls: [] as { quantity: number; unit: 'Kg.' | 'Mtr.' }[]
  });
  const [selectedUnit, setSelectedUnit] = useState<'Kg.' | 'Mtr.'>('Mtr.');
  const [rollQuickEntry, setRollQuickEntry] = useState("");

  // Stock History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState<SellingStockItem | null>(null);
  const confirm = useConfirm();

  // Sell Fabric State
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedFabricForSell, setSelectedFabricForSell] = useState<FabricItem | null>(null);
  const [availableRolls, setAvailableRolls] = useState<any[]>([]);
  const [sellForm, setSellForm] = useState({
    rollId: "",
    soldLength: ""
  });

  // Roll Breakdown State
  const [isRollBreakdownModalOpen, setIsRollBreakdownModalOpen] = useState(false);
  const [selectedFabricForRolls, setSelectedFabricForRolls] = useState<FabricItem | null>(null);
  const [rollsBreakdown, setRollsBreakdown] = useState<any[]>([]);
  const [loadingRolls, setLoadingRolls] = useState(false);

  // Add Rolls to Existing Fabric State
  const [isAddRollsModalOpen, setIsAddRollsModalOpen] = useState(false);
  const [selectedFabricForAddRolls, setSelectedFabricForAddRolls] = useState<FabricItem | null>(null);
  const [addRollsQuickEntry, setAddRollsQuickEntry] = useState("");
  const [addRollsList, setAddRollsList] = useState<{ quantity: number; unit: 'Kg.' | 'Mtr.' }[]>([]);

  const handleOpenHistory = (item: SellingStockItem) => {
    setSelectedStockForHistory(item);
    setIsHistoryModalOpen(true);
  };

  const fetchMetadata = async () => {
    try {
      const [ct, c, d, q, dresses, emps] = await Promise.all([
        api.get('/fabric/cloth-types'),
        api.get('/fabric/colors'),
        api.get('/fabric/designs'),
        api.get('/fabric/qualities'),
        api.get('/clients/all-products'), // Correct endpoint for all products
        api.get('/employees') // Correct endpoint for employees
      ]);

      // Show specific roles for cutting by name
      const allowedRoles = ['self', 'cutting master', 'fabricator'];
      const employeesList = (emps.success ? emps.employees : []).filter(
        (e: any) => e.role_name && allowedRoles.includes(e.role_name.toLowerCase())
      );

      setMetadata({
        clothTypes: ct,
        colors: c,
        designs: d,
        qualities: q,
        dresses: dresses.success ? dresses.products : [],
        cutters: employeesList
      });
    } catch (error) {
      console.error("Failed to fetch metadata", error);
    }
  };

  useEffect(() => {
    if (cuttingForm.article_id) {
      const fetchOrders = async () => {
        try {
          const res = await api.get(`/cutting/pending-orders?article_id=${cuttingForm.article_id}`);
          setPendingOrders(res.pending_orders || []);
        } catch (error) {
          console.error("Failed to fetch pending orders", error);
        }
      };
      fetchOrders();
    } else {
      setPendingOrders([]);
      setCuttingForm(prev => ({ ...prev, order_id: "" }));
    }
  }, [cuttingForm.article_id]);

  const handleAddFabric = async () => {
    if (!fabricForm.clothType || !fabricForm.colorName || !fabricForm.designName || !fabricForm.qualityName) {
      return toast.error("Please fill all required fields");
    }
    if (fabricForm.rolls.length === 0) {
      return toast.error("Please add at least one roll");
    }

    setIsSubmitting(true);
    try {
      await api.post('/fabric', {
        ...fabricForm,
        rolls: fabricForm.rolls.map(r => ({
          quantity: Number(Number(r.quantity).toFixed(2)),
          unit: r.unit
        }))
      });
      toast.success("Fabric and rolls added successfully!");
      setIsAddFabricModalOpen(false);
      setFabricForm({ clothType: "", colorName: "", designName: "", qualityName: "", rolls: [] });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add fabric");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddRolls = () => {
    if (!rollQuickEntry.trim()) return;

    // Parse comma separated values
    const newRolls = rollQuickEntry
      .split(',')
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v) && v > 0);

    if (newRolls.length === 0) {
      toast.error("No valid roll lengths found. Use commas like: 30,50,60");
      return;
    }

    setFabricForm(prev => ({
      ...prev,
      rolls: [...prev.rolls, ...newRolls.map(v => ({ quantity: v, unit: selectedUnit }))]
    }));
    setRollQuickEntry("");
    toast.success(`Added ${newRolls.length} rolls`);
  };



  const handleOpenCuttingModal = (f: FabricItem) => {
    setSelectedFabricForCutting(f);
    setCuttingForm({
      article_id: "",
      order_id: "",
      emp_id: "",
      pattern_series: "",
      sq: {},
    });
    setLocalSizes([]);
    setIsCuttingModalOpen(true);
  };

  const handleStartCuttingStock = async () => {
    if (!cuttingForm.article_id || !cuttingForm.emp_id) {
      return toast.error("Please select both product and cutter");
    }

    setIsSubmitting(true);
    try {

      // Convert localSizes to sq object
      const sqPayload = localSizes.reduce((acc, item) => {
        if (item.size.trim()) {
          acc[item.size.trim()] = item.qty;
        }
        return acc;
      }, {} as Record<string, number>);

      if (Object.keys(sqPayload).length === 0) {
        toast.error("Please add at least one production size");
        setIsSubmitting(false);
        return;
      }

      // POST to /cutting (Order-less or Order-linked)
      const payload: any = {
        ...cuttingForm,
        sq: sqPayload,
        remarks: selectedFabricForCutting
          ? `Planned Fabric ID: ${selectedFabricForCutting.id} | ${selectedFabricForCutting.cloth_type} ${selectedFabricForCutting.color_name} ${selectedFabricForCutting.design_name}`
          : ""
      };
      if (!payload.order_id) {
        delete payload.order_id;
      } else {
        payload.order_id = parseInt(payload.order_id);
      }

      await api.post('/cutting', payload);
      toast.success("Cutting job started");
      setIsCuttingModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to start cutting job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSellModal = async (f: FabricItem) => {
    setSelectedFabricForSell(f);
    setSellForm({ rollId: "", soldLength: "" });
    try {
      const res = await api.get(`/fabric/${f.id}`);
      const sortedRolls = (res.rolls || []).sort((a: any, b: any) => Number(a.roll_quantity) - Number(b.roll_quantity));
      setAvailableRolls(sortedRolls.filter((r: any) => Number(r.roll_quantity) > 0));
      setIsSellModalOpen(true);
    } catch (error) {
      toast.error("Failed to load fabric rolls");
    }
  };

  const handleShowRolls = async (f: FabricItem) => {
    setSelectedFabricForRolls(f);
    setIsRollBreakdownModalOpen(true);
    setLoadingRolls(true);
    try {
      const res = await api.get(`/fabric/${f.id}`);
      const sortedRolls = (res.rolls || []).sort((a: any, b: any) => Number(a.roll_quantity) - Number(b.roll_quantity));
      setRollsBreakdown(sortedRolls);
    } catch (error) {
      toast.error("Failed to load rolls breakdown");
    } finally {
      setLoadingRolls(false);
    }
  };

  const handleOpenAddRolls = (f: FabricItem) => {
    setSelectedFabricForAddRolls(f);
    setAddRollsQuickEntry("");
    setAddRollsList([]);
    setIsAddRollsModalOpen(true);
  };

  const handleAddRollsQuickEntry = () => {
    if (!addRollsQuickEntry.trim()) return;
    const newRolls = addRollsQuickEntry
      .split(',')
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v) && v > 0);
    if (newRolls.length === 0) {
      toast.error("No valid lengths. Use commas: 30,50,60");
      return;
    }
    setAddRollsList(prev => [...prev, ...newRolls.map(q => ({ quantity: q, unit: selectedUnit }))]);
    setAddRollsQuickEntry("");
    toast.success(`${newRolls.length} roll(s) added to list`);
  };

  const handleSubmitAddRolls = async () => {
    if (!selectedFabricForAddRolls || addRollsList.length === 0) {
      return toast.error("Please add at least one roll");
    }
    setIsSubmitting(true);
    try {
      await api.post(`/fabric/${selectedFabricForAddRolls.id}/rolls`, {
        rolls: addRollsList.map(r => ({
          quantity: Number(Number(r.quantity).toFixed(2)),
          unit: r.unit
        }))
      });
      toast.success(`${addRollsList.length} roll(s) added to ${selectedFabricForAddRolls.color_name} / ${selectedFabricForAddRolls.design_name}`);
      setIsAddRollsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add rolls");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellFabric = async () => {
    if (!sellForm.rollId || !sellForm.soldLength) {
      return toast.error("Please select a roll and enter quantitiy");
    }

    const length = parseFloat(sellForm.soldLength);
    if (isNaN(length) || length <= 0) {
      return toast.error("Please enter a valid quantity");
    }

    setIsSubmitting(true);
    try {
      await api.post(`/fabric/${selectedFabricForSell?.id}/sell`, {
        rollId: sellForm.rollId,
        soldLength: length
      });
      toast.success("Fabric sold successfully!");
      setIsSellModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to process sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (view === "fabric") {
        const data = await api.get('/fabric');
        setFabrics(data.fabrics || []);
      } else {
        const data = await api.get('/sales/stock');
        setFinishedStock(data.stock || []);
      }
    } catch (error) {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (view === "fabric") fetchMetadata();
  }, [view]);

  // Filtering
  // Filtering
  const uniqueClothTypes = Array.from(new Set(fabrics.map(f => f.cloth_type))).filter(Boolean).sort();
  const uniqueQualities = Array.from(new Set(fabrics.map(f => f.quality_name))).filter(Boolean).sort();
  const uniqueStatuses = ["in", "low", "out"];

  const filteredFabrics = useMemo(() => fabrics.filter(f => {
    const matchesSearch =
      f.cloth_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.color_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.design_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClothType = clothTypeFilter ? f.cloth_type === clothTypeFilter : true;
    const matchesQuality = qualityFilter ? f.quality_name === qualityFilter : true;
    const matchesStatus = statusFilter ? f.status === statusFilter : true;

    return matchesSearch && matchesClothType && matchesQuality && matchesStatus;
  }), [fabrics, searchQuery, clothTypeFilter, qualityFilter, statusFilter]);

  const filteredFinished = useMemo(() => finishedStock.filter(s =>
    s.article_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.org_name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [finishedStock, searchQuery]);

  return (
    <div className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Inventory Master</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">
              {view === "fabric" ? "Raw Material: Fabric & Rolls" : "Finished Goods: Ready for Sale"}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Button
                variant={view === "fabric" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("fabric")}
                className={`text-xs px-4 ${view === "fabric" ? "bg-white text-indigo-600 shadow-sm hover:bg-white" : "text-gray-500"}`}
              >
                <Layers className="w-3 h-3 mr-2" /> Fabric
              </Button>
              <Button
                variant={view === "finished" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("finished")}
                className={`text-xs px-4 ${view === "finished" ? "bg-white text-indigo-600 shadow-sm hover:bg-white" : "text-gray-500"}`}
              >
                <Package className="w-3 h-3 mr-2" /> Finished
              </Button>
            </div>
            <Button
              className="bg-[#e94560] hover:bg-[#d13a52] text-xs font-bold px-6"
              onClick={() => setIsAddFabricModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add {view === "fabric" ? "Fabric" : "Stock"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">


        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={`Search ${view === "fabric" ? "color, type or design..." : "dress or client..."}`}
                className="pl-11 h-12 border-none bg-gray-50 focus:bg-white transition-all font-medium placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {view === "fabric" ? (
                    <>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest relative group">
                        <div className="flex items-center gap-2">
                          Color / Design
                          <div className="relative">
                            <Popover open={isSpecsFilterOpen} onOpenChange={setIsSpecsFilterOpen}>
                              <PopoverTrigger asChild>
                                <span
                                  className={`cursor-pointer hover:text-indigo-600 transition-colors ${clothTypeFilter || qualityFilter ? 'text-indigo-600' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Filter className="w-3 h-3" />
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-3" align="start">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Cloth Type</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {uniqueClothTypes.map(type => (
                                        <div
                                          key={type}
                                          className={`text-xs px-2 py-1.5 rounded cursor-pointer ${clothTypeFilter === type ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                                          onClick={() => {
                                            setClothTypeFilter(clothTypeFilter === type ? null : type);
                                            // Don't close yet if they might want to select quality too, or close? 
                                            // User requested "select option... disappear". Let's close it.
                                            setIsSpecsFilterOpen(false);
                                          }}
                                        >
                                          {type}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="border-t border-gray-50 pt-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Quality</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {uniqueQualities.map(q => (
                                        <div
                                          key={q}
                                          className={`text-xs px-2 py-1.5 rounded cursor-pointer ${qualityFilter === q ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                                          onClick={() => {
                                            setQualityFilter(qualityFilter === q ? null : q);
                                            setIsSpecsFilterOpen(false);
                                          }}
                                        >
                                          {q}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {(clothTypeFilter || qualityFilter) && (
                                    <div className="pt-2 border-t border-gray-50">
                                      <button
                                        className="text-[10px] text-red-500 font-bold w-full text-left hover:underline"
                                        onClick={() => {
                                          setClothTypeFilter(null);
                                          setQualityFilter(null);
                                          setIsSpecsFilterOpen(false);
                                        }}
                                      >
                                        Clear Filters
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {(clothTypeFilter || qualityFilter) && (
                            <Badge className="h-4 p-0 px-1 text-[8px] bg-indigo-100 text-indigo-700 border-none">
                              {clothTypeFilter && !qualityFilter ? '1' : !clothTypeFilter && qualityFilter ? '1' : '2'}
                            </Badge>
                          )}
                        </div>
                      </th>

                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level / Rolls</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          Status
                          <div className="relative">
                            <Popover open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen}>
                              <PopoverTrigger asChild>
                                <span
                                  className={`cursor-pointer hover:text-indigo-600 transition-colors ${statusFilter ? 'text-indigo-600' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Filter className="w-3 h-3" />
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-32 p-2" align="end">
                                <div className="space-y-1">
                                  {uniqueStatuses.map(s => (
                                    <div
                                      key={s}
                                      className={`text-xs px-2 py-1.5 rounded cursor-pointer uppercase font-bold flex items-center justify-between ${statusFilter === s ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-500'}`}
                                      onClick={() => {
                                        setStatusFilter(statusFilter === s ? null : s);
                                        setIsStatusFilterOpen(false);
                                      }}
                                    >
                                      {s === 'in' ? 'Available' : s === 'low' ? 'Low Stock' : 'Out'}
                                      {statusFilter === s && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                  ))}
                                  {statusFilter && (
                                    <div className="pt-2 border-t border-gray-50">
                                      <button
                                        className="text-[10px] text-red-500 font-bold w-full text-left hover:underline px-1"
                                        onClick={() => {
                                          setStatusFilter(null);
                                          setIsStatusFilterOpen(false);
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product / Dress</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Size</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">MRP</th>
                    </>
                  )}
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={view === "fabric" ? 5 : 6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold text-gray-400 uppercase">Synchronizing...</span>
                      </div>
                    </td>
                  </tr>
                ) : view === "fabric" ? (
                  filteredFabrics.map((f) => (
                    <FabricRow
                      key={f.id}
                      f={f}
                      onCutting={handleOpenCuttingModal}
                      onSell={handleOpenSellModal}
                      onShowRolls={handleShowRolls}
                      onAddRolls={handleOpenAddRolls}
                    />
                  ))
                ) : (
                  filteredFinished.map((s, idx) => (
                    <FinishedStockRow
                      key={idx}
                      s={s}
                      onHistory={handleOpenHistory}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddFabricModalOpen}
        onClose={() => setIsAddFabricModalOpen(false)}
        title="Register New Fabric Entry"
        size="md"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cloth Type</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, clothType: val })}>
                <SelectTrigger className="h-10 border-gray-200 bg-white rounded-lg font-medium text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.clothTypes.map(t => <SelectItem key={t.id} value={t.type} className="text-xs">{t.type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Color Variant</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, colorName: val })}>
                <SelectTrigger className="h-10 border-gray-200 bg-white rounded-lg font-medium text-xs">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.colors.map(c => <SelectItem key={c.id} value={c.color_name} className="text-xs">{c.color_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Design Pattern</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, designName: val })}>
                <SelectTrigger className="h-10 border-gray-200 bg-white rounded-lg font-medium text-xs">
                  <SelectValue placeholder="Select design" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.designs.map(d => <SelectItem key={d.id} value={d.design_name} className="text-xs">{d.design_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Fabric Quality</Label>
              <Select onValueChange={(val) => setFabricForm({ ...fabricForm, qualityName: val })}>
                <SelectTrigger className="h-10 border-gray-200 bg-white rounded-lg font-medium text-xs">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.qualities.map(q => <SelectItem key={q.id} value={q.quality_name} className="text-xs">{q.quality_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Roll Breakdown</Label>
              <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setSelectedUnit('Mtr.')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${selectedUnit === 'Mtr.' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Mtr.
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnit('Kg.')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${selectedUnit === 'Kg.' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Kg.
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder={`Enter roll ${selectedUnit === 'Mtr.' ? 'lengths' : 'quantities'} (e.g. 30,50,60)`}
                className="h-10 text-xs border-gray-200 bg-white rounded-lg font-medium focus:border-indigo-500"
                value={rollQuickEntry}
                onChange={(e) => setRollQuickEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAddRolls();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 px-4 text-[11px] font-bold border-gray-200 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                onClick={handleQuickAddRolls}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {fabricForm.rolls.map((roll, idx) => (
              <div key={idx} className="relative group">
                <div className="h-10 flex flex-col items-center justify-center font-bold text-gray-700 bg-gray-50 border border-transparent group-hover:border-indigo-100 rounded-lg transition-all pt-1">
                  <span className="text-sm font-black font-mono leading-none">{Number(roll.quantity).toFixed(2)}</span>
                  <span className="text-[8px] font-black text-gray-400 uppercase mt-0.5">{roll.unit}</span>
                </div>
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm transition-all z-10"
                  onClick={() => {
                    if (window.confirm('Remove this roll?')) {
                      const newRolls = fabricForm.rolls.filter((_, i) => i !== idx);
                      setFabricForm({ ...fabricForm, rolls: newRolls });
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {fabricForm.rolls.length === 0 && (
              <div className="col-span-full py-10 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50/30">
                <Package className="w-6 h-6 text-gray-300 mb-2" />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">No rolls added yet</p>
              </div>
            )}
          </div>

          {fabricForm.rolls.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-4 bg-indigo-50/40 border border-indigo-100/50 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold text-indigo-500 uppercase tracking-wider">Total Rolls</span>
                <span className="text-base font-bold text-indigo-700 leading-none mt-1">{fabricForm.rolls.length}</span>
              </div>
              <div className="w-px h-8 bg-indigo-100/50" />
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold text-indigo-500 uppercase tracking-wider">Total Quantity</span>
                <span className="text-base font-bold text-indigo-700 leading-none mt-1">
                  {fabricForm.rolls.reduce((a, b: any) => a + (Number(b.quantity) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 shrink-0">
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 shrink-0">
            <Button
              variant="ghost"
              className="h-10 px-6 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsAddFabricModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFabric}
              className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg shadow-md disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
              Save to Inventory
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sell Fabric Modal */}
      <Modal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        title="Fabric Retail Sale"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Selling Fabric</p>
            <h3 className="font-bold text-rose-900 text-lg uppercase tracking-wide">
              {selectedFabricForSell?.color_name} / {selectedFabricForSell?.cloth_type}
            </h3>
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">
              {selectedFabricForSell?.design_name} • {selectedFabricForSell?.quality_name}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Roll</Label>
              <Select onValueChange={(val) => setSellForm({ ...sellForm, rollId: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Which roll are you cutting from?" />
                </SelectTrigger>
                <SelectContent>
                  {availableRolls.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {Number(r.roll_quantity).toFixed(2)} {r.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sold Length / Quantity</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-mono font-bold pl-3 pr-10"
                  value={sellForm.soldLength}
                  onChange={(e) => setSellForm({ ...sellForm, soldLength: e.target.value })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
                  {availableRolls.find(r => r.id.toString() === sellForm.rollId)?.unit || 'Qty'}
                </span>
              </div>
              {sellForm.rollId && (
                <p className="text-[10px] font-bold text-gray-400 italic px-1">
                  Remaining in this roll: {Number(availableRolls.find(r => r.id.toString() === sellForm.rollId)?.roll_quantity).toFixed(2)} {availableRolls.find(r => r.id.toString() === sellForm.rollId)?.unit}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 shrink-0">
              <Button
                variant="ghost"
                className="h-10 px-6 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsSellModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSellFabric}
                className="h-10 px-8 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg shadow-md disabled:bg-gray-100 disabled:text-gray-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Tag className="w-3.5 h-3.5 mr-2" />}
                Confirm Sale
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      {/* Stock History Modal */}
      < StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        stockItem={selectedStockForHistory}
      />



      <Modal
        isOpen={isCuttingModalOpen}
        onClose={() => setIsCuttingModalOpen(false)}
        title="Send Fabric to Production"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fabric Source</p>
            <h3 className="font-bold text-indigo-900 text-lg uppercase tracking-wide">{selectedFabricForCutting?.color_name} / {selectedFabricForCutting?.cloth_type}</h3>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{selectedFabricForCutting?.design_name} • {selectedFabricForCutting?.quality_name}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Production Item</Label>
              <Button
                variant="outline"
                className="h-12 w-full justify-between border-gray-100 bg-gray-50/50 rounded-lg font-bold hover:bg-white hover:text-indigo-600"
                onClick={() => setOpenCombobox(true)}
              >
                {cuttingForm.article_id
                  ? (() => {
                    const selected = metadata.dresses.find((d: any) => d.id.toString() === cuttingForm.article_id);
                    if (!selected) return "Search product to make...";
                    return `${selected.item_name}${selected.article_name && selected.article_name !== selected.item_name ? ` • ${selected.article_name}` : ''} (${selected.org_name})`;
                  })()
                  : "Search product to make..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

              <CommandDialog open={openCombobox} onOpenChange={setOpenCombobox}>
                <CommandInput placeholder="Search dress or client..." />
                <CommandList>
                  <CommandEmpty>No product found.</CommandEmpty>
                  <CommandGroup heading="Available Products" className="max-h-[300px] overflow-y-auto">
                    {(() => {
                      const fab = selectedFabricForCutting as any;
                      const matchingDresses = metadata.dresses.filter((d: any) => {
                        if (!fab) return true;
                        if (d.cloth_detail_id && fab.id) {
                          return d.cloth_detail_id.toString() === fab.id.toString();
                        }
                        const normalize = (val: any) => (!val || val.toString() === "0" ? "" : val.toString());
                        return (
                          normalize(d.color_id) === normalize(fab.color_id) &&
                          normalize(d.cloth_type_id) === normalize(fab.cloth_type_id) &&
                          normalize(d.design_id) === normalize(fab.design_id) &&
                          normalize(d.quality_id) === normalize(fab.quality_id)
                        );
                      });
                      return matchingDresses.map((d: any) => (
                        <CommandItem
                          key={d.id}
                          value={`${d.item_name} ${d.article_name} ${d.org_name} ${d.id}`}
                          onSelect={() => {
                            setCuttingForm({ ...cuttingForm, article_id: d.id.toString() });
                            setOpenCombobox(false);
                          }}
                          className="cursor-pointer py-3"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              cuttingForm.article_id === d.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">
                              {d.item_name}
                              {d.article_name && d.article_name !== d.item_name && (
                                <span className="font-normal text-gray-500 ml-1">• {d.article_name}</span>
                              )}
                              <span className="text-gray-400 text-xs font-normal ml-1">({d.org_name})</span>
                            </span>
                          </div>
                        </CommandItem>
                      ));
                    })()}
                  </CommandGroup>
                </CommandList>
              </CommandDialog>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Link Order (Optional)</Label>
              <Select
                value={cuttingForm.order_id}
                onValueChange={(val) => setCuttingForm({ ...cuttingForm, order_id: val })}
                disabled={!cuttingForm.article_id}
              >
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="None (Stock Production)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-gray-500 italic">None (Stock Production)</SelectItem>
                  {pendingOrders.map(o => (
                    <SelectItem key={o.id} value={o.id.toString()}>
                      Order #{o.id} - {o.org_name} ({o.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assign Cutter</Label>
              <Select onValueChange={(val) => setCuttingForm({ ...cuttingForm, emp_id: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Select master cutter" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.cutters.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} ({c.role_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Production Size Matrix</h5>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200">
              <div className="flex gap-3 min-w-max">
                {/* Static Row Labels */}
                <div className="flex flex-col gap-3 pr-4 border-r border-gray-200">
                  <div className="h-10 flex items-center justify-end">
                    <span className="text-lg font-black text-gray-400 italic">S</span>
                  </div>
                  <div className="h-12 flex items-center justify-end gap-1 relative group/bulk">
                    <div className="flex flex-col -gap-1 transition-all">
                      <button
                        onClick={() => {
                          setLocalSizes(prev => prev.map(item => ({ ...item, qty: (item.qty || 0) + 1 })));
                        }}
                        className="p-0.5 hover:bg-indigo-50 rounded text-indigo-400 transition-all"
                        title="Increase all by 1"
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => {
                          setLocalSizes(prev => prev.map(item => ({ ...item, qty: Math.max(0, (item.qty || 0) - 1) })));
                        }}
                        className="p-0.5 hover:bg-indigo-50 rounded text-indigo-400 transition-all"
                        title="Decrease all by 1"
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-lg font-black text-gray-400 italic">Q</span>
                  </div>
                </div>

                {/* Dynamic Size Columns */}
                {localSizes.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 group relative">
                    {/* Size Name Entry */}
                    <div className="relative">
                      <Input
                        value={item.size}
                        placeholder="SIZE"
                        className="h-10 w-18 text-center font-black uppercase text-[11px] bg-white border-gray-200 focus:border-indigo-300 focus:ring-indigo-500/10"
                        onChange={(e) => {
                          const newSize = e.target.value.toUpperCase();
                          setLocalSizes(prev => prev.map(p => p.id === item.id ? { ...p, size: newSize } : p));
                        }}
                      />
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-rose-100 flex items-center justify-center text-rose-400 hover:text-rose-600 shadow-sm transition-opacity z-10"
                        onClick={async () => {
                          const isConfirmed = await confirm({
                            title: "Delete Size Entry",
                            description: "Are you sure you want to remove this size from the production list?",
                            confirmText: "Remove",
                            variant: "destructive"
                          });
                          if (isConfirmed) {
                            setLocalSizes(prev => prev.filter(p => p.id !== item.id));
                          }
                        }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Quantity Entry */}
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={item.qty === 0 ? '' : item.qty}
                      placeholder="0"
                      className="h-12 w-18 text-center font-black text-lg bg-white border-gray-200 focus:border-indigo-300 focus:ring-indigo-500/10"
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                        const val = parseInt(rawValue) || 0;
                        setLocalSizes(prev => prev.map(p => p.id === item.id ? { ...p, qty: val } : p));
                      }}
                    />
                  </div>
                ))}

                {/* Inline Add Button Box */}
                <button
                  onClick={() => {
                    setLocalSizes(prev => [
                      ...prev,
                      { id: Date.now().toString(), size: "", qty: 0 }
                    ]);
                  }}
                  className="w-24 h-[100px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:bg-white hover:border-indigo-200 transition-all group shrink-0"
                >
                  <Plus className="w-6 h-6 text-gray-300 group-hover:text-indigo-400 group-hover:scale-110 transition-transform" />
                </button>

                {/* Empty State Instructions */}
                {localSizes.length === 0 && (
                  <div className="flex items-center px-4">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Click plus to add production sizes</span>
                  </div>
                )}
              </div>
            </div>

            {localSizes.length > 0 && (
              <div className="mt-4 flex items-center justify-end gap-2 text-gray-400">
                <span className="text-[10px] font-black uppercase">Batch Total:</span>
                <span className="text-xl font-black text-gray-900 tracking-tighter">
                  {localSizes.reduce((a, b) => a + (b.qty || 0), 0)}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] font-sans">Pcs</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 shrink-0">
            <Button
              variant="ghost"
              className="h-10 px-6 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsCuttingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg shadow-md disabled:bg-gray-100 disabled:text-gray-400"
              onClick={handleStartCuttingStock}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                <>
                  <Scissors className="w-4 h-4 mr-2" />
                  Initiate Production
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Roll Breakdown Modal */}
      <Modal
        isOpen={isRollBreakdownModalOpen}
        onClose={() => setIsRollBreakdownModalOpen(false)}
        title="Roll Breakdown"
        size="sm"
      >
        {selectedFabricForRolls && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Fabric Specs</p>
                <h3 className="text-xs font-black text-gray-900 uppercase">
                  {selectedFabricForRolls.color_name} / {selectedFabricForRolls.design_name}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Length</p>
                <span className="text-sm font-black text-indigo-600 font-mono">
                  {Number(selectedFabricForRolls.total_quantity).toFixed(2)} M
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f8fafc] border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Roll UID</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Quantity</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Units</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingRolls ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-1" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Fetching rolls...</span>
                      </td>
                    </tr>
                  ) : rollsBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[10px] font-bold text-gray-400 uppercase">No rolls found</td>
                    </tr>
                  ) : (
                    rollsBreakdown.map((roll) => {
                      const isNew = roll.created_on === roll.updated_on;
                      return (
                        <tr key={roll.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-4 py-3 text-[11px] font-bold text-gray-600 font-mono">
                            {roll.uid}
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-gray-900 font-mono text-center">
                            {Number(roll.roll_quantity).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase text-center">
                            {roll.unit || 'Mtr.'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${isNew
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                              {isNew ? 'New' : 'Used'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 font-black text-[9px] uppercase tracking-widest"
                onClick={() => setIsRollBreakdownModalOpen(false)}
              >
                Close Breakdown
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Rolls to Existing Fabric Modal */}
      <Modal
        isOpen={isAddRollsModalOpen}
        onClose={() => setIsAddRollsModalOpen(false)}
        title="Add New Rolls"
        size="sm"
      >
        <div className="space-y-5">
          {selectedFabricForAddRolls && (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
              <p className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                {selectedFabricForAddRolls.color_name} / {selectedFabricForAddRolls.design_name}
              </p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">
                {selectedFabricForAddRolls.quality_name} · {selectedFabricForAddRolls.cloth_type}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Add Rolls</Label>
              <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setSelectedUnit('Mtr.')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${selectedUnit === 'Mtr.' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Mtr.
                </button>
                <button
                  onClick={() => setSelectedUnit('Kg.')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${selectedUnit === 'Kg.' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Kg.
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder={`e.g. 30,50,60...`}
                className="h-10 text-xs border-gray-200 bg-white rounded-lg font-medium focus:border-emerald-500"
                value={addRollsQuickEntry}
                onChange={(e) => setAddRollsQuickEntry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRollsQuickEntry()}
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 text-[11px] font-bold border-gray-200 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                onClick={handleAddRollsQuickEntry}
              >
                Add
              </Button>
            </div>
            <p className="text-[10px] text-gray-400">Enter multiple lengths separated by commas</p>
          </div>

          {addRollsList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {addRollsList.length} Roll(s) — {addRollsList.reduce((a, b) => a + (Number(b.quantity) || 0), 0).toFixed(2)} total
                </Label>
                <button
                  className="text-[10px] text-red-400 font-bold hover:text-red-600"
                  onClick={() => setAddRollsList([])}
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {addRollsList.map((roll, idx) => (
                  <div key={idx} className="relative group">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                      <span className="text-sm font-black text-emerald-800 font-mono">{roll.quantity.toFixed(2)}</span>
                      <span className="text-[9px] font-bold text-emerald-500 ml-1">{roll.unit}</span>
                    </div>
                    <button
                      className="absolute -top-1.5 -right-1.5 flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[10px] font-black leading-none"
                      onClick={() => setAddRollsList(prev => prev.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              className="h-9 px-5 text-xs font-bold text-gray-500 hover:bg-gray-100"
              onClick={() => setIsAddRollsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              onClick={handleSubmitAddRolls}
              disabled={isSubmitting || addRollsList.length === 0}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Save {addRollsList.length > 0 ? `(${addRollsList.length})` : ''} Rolls
            </Button>
          </div>
        </div>
      </Modal>

      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        stockItem={selectedStockForHistory}
      />
    </div >
  );
}
