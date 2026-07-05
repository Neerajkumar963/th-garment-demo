import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Loader2, Shirt, Layers, MoreHorizontal, RefreshCcw, Archive, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { api, itemAPI } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils";
import { useConfirm } from "./ui/WindowsConfirm";

interface MasterItem {
  id: number;
  name: string;
  item_type: string;
  gender: string;
  symbol: string | null;
  material_required: string | null;
}

export function ItemsMaster() {
  const confirm = useConfirm();
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "archive">("active");
  const [archivedCount, setArchivedCount] = useState(0);

  // Add Item Modal state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    symbol: "",
    item_type: "tailor_made",
    gender: "U",
    material_required: ""
  });

  // Edit/Delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    symbol: "",
    item_type: "",
    gender: "",
    material_required: ""
  });

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.symbol) {
      return toast.error("Please fill all required fields");
    }
    if (itemForm.symbol.length < 3 || itemForm.symbol.length > 4) {
      return toast.error("Symbol must be between 3 and 4 characters");
    }

    setIsSubmitting(true);
    try {
      await api.post('/items', itemForm);
      toast.success("New model registered in catalog!");
      setIsAddItemModalOpen(false);
      setItemForm({ name: "", symbol: "", item_type: "tailor_made", gender: "U", material_required: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await api.put(`/items/${editingItem.id}`, editForm);
      toast.success("Item updated successfully");
      setIsEditModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = viewMode === "active" ? await itemAPI.getAll() : await itemAPI.getArchived();
      setItems(res.items || []);

      // Also fetch counts
      if (viewMode === "active") {
        const arch = await itemAPI.getArchived();
        setArchivedCount(arch.items?.length || 0);
      } else {
        const act = await itemAPI.getAll();
        setArchivedCount(items.length); // Fallback logic if needed, but better to update based on current state
      }
    } catch (error) {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const handleArchiveItem = async (id: number) => {
    const isConfirmed = await confirm({
      title: "Archive Item",
      description: "Are you sure you want to move this item to Archive?",
      confirmText: "Yes, Archive",
      cancelText: "No, Cancel",
      variant: "destructive"
    });

    if (!isConfirmed) return;
    try {
      await api.delete(`/items/${id}`);
      toast.success("Item moved to archive");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive item");
    }
  };

  const handleRestoreItem = async (id: number) => {
    try {
      const res = await itemAPI.restore(id);
      if (res.success) {
        toast.success("Item restored to catalog");
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to restore item");
    }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.item_type.toLowerCase().includes(search.toLowerCase())
  );



  return (
    <div className="flex-1 overflow-auto bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white/40 backdrop-blur-md border-b border-white px-10 py-10 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">Master Catalog</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-1 w-12 bg-indigo-600 rounded-full" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Global Product Registry & Configurations</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("active")}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === "active" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Active Catalog
              </button>
              <button
                onClick={() => setViewMode("archive")}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  viewMode === "archive" ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Archive {archivedCount > 0 && <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">{archivedCount}</span>}
              </button>
            </div>
            <Button
              className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-xl shadow-2xl shadow-slate-200 group transition-all"
              onClick={() => setIsAddItemModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
              Build New Model
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shirt className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Models</p>
              <h2 className="text-2xl font-black text-gray-900">{items.length}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variant Categories</p>
              <h2 className="text-2xl font-black text-gray-900">{new Set(items.map(i => i.item_type)).size} Styles</h2>
            </div>
          </div>
        </div>

        {/* Search & Browser */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/20">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by name, type, or gender..."
                className="pl-12 h-14 border-none bg-white shadow-sm rounded-lg font-bold text-gray-700"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-40 text-center opacity-30">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Streaming Catalog Data...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-black text-slate-400 uppercase italic tracking-widest">No models match your search</h3>
              <p className="text-sm text-slate-300 font-bold mt-1">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="w-1/4 pl-10 font-black text-xs uppercase tracking-wider text-gray-500">Symbol</TableHead>
                      <TableHead className="w-1/4 font-black text-xs uppercase tracking-wider text-gray-500">Name (Gender)</TableHead>
                      <TableHead className="w-1/4 font-black text-xs uppercase tracking-wider text-gray-500">Item Type</TableHead>
                      <TableHead className="w-1/4 pr-10 text-right font-black text-xs uppercase tracking-wider text-gray-500">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-10 font-mono font-bold text-slate-600">
                          {item.symbol || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900">
                            {item.name} <span className="text-slate-400 font-normal">({item.gender})</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "border-none font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
                            item.item_type === 'tailor_made'
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-orange-50 text-orange-700"
                          )}>
                            {item.item_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex items-center justify-end gap-2 text-right">
                            {viewMode === "active" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setEditForm({
                                      name: item.name,
                                      symbol: item.symbol || "",
                                      item_type: item.item_type,
                                      gender: item.gender,
                                      material_required: item.material_required || ""
                                    });
                                    setIsEditModalOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleArchiveItem(item.id)}
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3"
                                onClick={() => handleRestoreItem(item.id)}
                              >
                                <RefreshCcw className="w-3 h-3 mr-2" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Stacked List View */}
              <div className="md:hidden space-y-4 p-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-[10px] text-slate-500 border-slate-200">
                          {item.symbol}
                        </Badge>
                        <Badge className={cn(
                          "border-none font-bold text-[10px] uppercase tracking-wider px-1.5 py-0",
                          item.item_type === 'tailor_made'
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-orange-50 text-orange-700"
                        )}>
                          {item.item_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.gender === 'M' ? 'Menswear' : item.gender === 'F' ? 'Womenswear' : 'Unisex'}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingItem(item);
                          setEditForm({
                            name: item.name,
                            symbol: item.symbol || "",
                            item_type: item.item_type,
                            gender: item.gender,
                            material_required: item.material_required || ""
                          });
                          setIsEditModalOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Model
                        </DropdownMenuItem>
                        {viewMode === "active" ? (
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700 focus:bg-rose-50" onClick={() => handleArchiveItem(item.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive Model
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50" onClick={() => handleRestoreItem(item.id)}>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Restore Model
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Register New Catalog Model"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</Label>
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="e.g. Classic Cotton Shirt"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model Symbol (Unique Code)</Label>
              <Input
                value={itemForm.symbol}
                onChange={(e) => setItemForm({ ...itemForm, symbol: e.target.value.toUpperCase() })}
                placeholder="ABC-1"
                maxLength={4}
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gender Target</Label>
              <Select defaultValue="U" onValueChange={(val) => setItemForm({ ...itemForm, gender: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male (M)</SelectItem>
                  <SelectItem value="F">Female (F)</SelectItem>
                  <SelectItem value="U">Unisex (U)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Production Type</Label>
            <Select defaultValue="tailor_made" onValueChange={(val) => setItemForm({ ...itemForm, item_type: val })}>
              <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tailor_made">Tailor Made (Custom)</SelectItem>
                <SelectItem value="ready_made">Ready Made (Bulk)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Material Required (Default)</Label>
            <Input
              value={itemForm.material_required}
              onChange={(e) => setItemForm({ ...itemForm, material_required: e.target.value })}
              placeholder="e.g. 2.5m Cotton, 4 Buttons"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
            />
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 italic">This will create a base entry in the master price list.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsAddItemModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-8 shadow-lg shadow-indigo-100"
                onClick={handleAddItem}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Registry"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Catalog Model"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</Label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. Classic Cotton Shirt"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Model Symbol</Label>
              <Input
                value={editForm.symbol}
                onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })}
                placeholder="ABC-1"
                maxLength={4}
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gender Target</Label>
              <Select value={editForm.gender} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male (M)</SelectItem>
                  <SelectItem value="F">Female (F)</SelectItem>
                  <SelectItem value="U">Unisex (U)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Production Type</Label>
            <Select value={editForm.item_type} onValueChange={(val) => setEditForm({ ...editForm, item_type: val })}>
              <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tailor_made">Tailor Made (Custom)</SelectItem>
                <SelectItem value="ready_made">Ready Made (Bulk)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Material Required (Default)</Label>
            <Input
              value={editForm.material_required}
              onChange={(e) => setEditForm({ ...editForm, material_required: e.target.value })}
              placeholder="e.g. 2.5m Cotton, 4 Buttons"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
            />
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="flex gap-3 ml-auto">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-8 shadow-lg shadow-indigo-100"
                onClick={handleEditItem}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Model"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

