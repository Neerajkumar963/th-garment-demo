import { useState, useEffect } from "react";
import { Search, Phone, Mail, MapPin, Building2, Plus, DollarSign, Package, TrendingUp, Loader2, ArrowRightLeft, Edit, Trash2, ArrowUp, ArrowDown, Eye, ClipboardCheck, X, Check, ChevronDown } from "lucide-react";
import { useConfirm } from "./ui/WindowsConfirm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils.tsx";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { labelAPI, extensionAPI } from "../../services/api";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface Client {
  id: number;
  org_name: string;
  name: string;
  phone: string;
  email: string;
  org_type: string;
  current_balance: number;
  branch: Branch[];
  gstin?: string;
  adhaar?: string;
}

interface ArticleLink {
  id: number;
  article_name: string;
  item_name: string;
  color_name: string;
  cloth_type?: string;
  design_name?: string;
  quality_name?: string;
  prices: { size: string, price: number }[];
  item_id: number;
  cloth_detail_id: number;
  article_id?: number;
  labels?: { label_type_id: number, stockable: boolean, label_type: string }[];
  extensions?: { 
    extension_type_id: number, 
    cloth_detail_id: number, 
    extension_type: string,
    color_name: string,
    cloth_type: string,
    design_name: string,
    quality_name: string
  }[];
}

interface LedgerEntry {
  id: number;
  datetime: string;
  transaction: 'DR' | 'CR';
  mode: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  remarks?: string;
  balance: number;
}

const ArticleCombobox = ({ 
  value, 
  onChange, 
  items,
  placeholder = "Select Article"
}: { 
  value: string; 
  onChange: (val: string) => void; 
  items: any[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = items.find(art => art.id.toString() === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 bg-white text-xs font-bold border-slate-200 hover:text-indigo-600 hover:bg-slate-50 transition-all text-left font-sans"
        >
          <span className="truncate">
            {selected ? (
              <><span className="text-indigo-600 mr-2">#{selected.id}</span>{selected.item_name} • {selected.color_name}</>
            ) : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0 shadow-lg shadow-indigo-100 border-slate-100" align="start">
        <Command>
           <CommandInput placeholder="Search by ID, name or fabric..." className="text-xs h-10 border-none focus:ring-0" />
           <CommandList>
             <CommandEmpty className="text-xs p-4 text-center text-slate-500 font-bold">No matching article found.</CommandEmpty>
             <CommandGroup className="max-h-[250px] overflow-y-auto w-full p-1 scrollbar-thin">
                {items.map((art) => (
                    <CommandItem
                      key={art.id}
                      value={`#${art.id} ${art.item_name} ${art.color_name} ${art.cloth_type}`}
                      onSelect={() => {
                        onChange(art.id.toString());
                        setOpen(false);
                      }}
                      className={cn(
                        "cursor-pointer py-2 px-3 rounded-md mb-0.5",
                        value === art.id.toString() ? "bg-indigo-50" : "hover:bg-slate-50"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0 transition-all",
                          value === art.id.toString() ? "opacity-100 text-indigo-600" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col truncate w-full pr-2">
                        <span className="font-bold text-slate-700 text-xs truncate">
                          <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-sm px-1.5 min-w-[24px] mr-2 text-[10px] font-black">#{art.id}</span>
                          {art.item_name} • {art.color_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate ml-9">
                          {art.cloth_type} {art.design_name ? `• ${art.design_name}` : ''}
                        </span>
                      </div>
                    </CommandItem>
                ))}
             </CommandGroup>
           </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function ClientManagement() {
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<ArticleLink[]>([]);
  const [globalArticles, setGlobalArticles] = useState<any[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Client Modal state
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: "",
    org_name: "",
    phone: "",
    email: "",
    gstin: "",
    adhaar: "",
    branch: [{ id: Date.now().toString(), name: "Main", address: "", phone: "" }] as Branch[],
    org_type: "Retail"
  });

  // Edit/Product Modals
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ArticleLink | null>(null);

  const [clientEditForm, setClientEditForm] = useState({
    name: "",
    org_name: "",
    phone: "",
    email: "",
    gstin: "",
    adhaar: "",
    branch: [] as Branch[],
    org_type: ""
  });

  // View Client Modal
  const [isViewClientModalOpen, setIsViewClientModalOpen] = useState(false);

  // Branch Management
  const [isBranchListModalOpen, setIsBranchListModalOpen] = useState(false);
  const [branchListOrg, setBranchListOrg] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    item_id: "",
    cloth_detail_id: "",
    color_id: "",
    cloth_type_id: "",
    design_id: "",
    quality_id: "",
    dress_name: "",
    labels: [] as { label_type_id: number, stockable: boolean }[],
    extensions: [] as { cloth_detail_id: number, extension_type_ids: number[] }[],
    stage_code: "131071"
  });

  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [filterType, setFilterType] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterDesign, setFilterDesign] = useState("");
  const [filterQuality, setFilterQuality] = useState("");

  const [itemLabelTypes, setItemLabelTypes] = useState<any[]>([]);
  const [clothDetails, setClothDetails] = useState<any[]>([]);

  useEffect(() => {
    const fetchDefaultMaterial = async () => {
      if (productForm.item_id && !isEditProductModalOpen) {
        try {
          const res = await api.get(`/items/material/${productForm.item_id}`);
          if (res.success && res.material) {
            // setProductForm(prev => ({ ...prev, material_req: res.material }));
          }
        } catch (error) {
          console.error("Failed to fetch default material", error);
        }
      }
    };
    fetchDefaultMaterial();
  }, [productForm.item_id, isEditProductModalOpen]);

  useEffect(() => {
    const fetchGlobalArticles = async () => {
      try {
        const res = await api.get('/articles');
        if (res.success) {
          setGlobalArticles(res.articles);
        }
      } catch (error) {
        console.error("Failed to fetch global articles", error);
      }
    };
    fetchGlobalArticles();
  }, []);

  useEffect(() => {
    const fetchItemLabels = async () => {
      if (productForm.item_id) {
        try {
          const res = await labelAPI.getTypesByItem(parseInt(productForm.item_id));
          if (res.success) {
            setItemLabelTypes(res.data);
          }
        } catch (error) {
          console.error("Failed to fetch label types", error);
        }
      } else {
        setItemLabelTypes([]);
      }
    };
    fetchItemLabels();
  }, [productForm.item_id]);


  useEffect(() => {
    const fetchClothDetails = async () => {
      try {
        const res = await api.get('/fabric/cloth-details');
        if (res) {
          setClothDetails(res);
        }
      } catch (error) {
        console.error("Failed to fetch cloth details", error);
      }
    };

    const fetchMasterData = async () => {
      try {
        const [items, colors, types, designs, qualities, stages] = await Promise.all([
          api.get('/items'),
          api.get('/fabric/colors'),
          api.get('/fabric/cloth-types'),
          api.get('/fabric/designs'),
          api.get('/fabric/qualities'),
          api.get('/processing/stages')
        ]);
        setMasterData({
           items: items.items || [],
           colors: Array.isArray(colors) ? colors : (colors.colors || []),
           clothTypes: types || [],
           designs: designs || [],
           qualities: qualities || [],
           processStages: stages.stages || []
        });
      } catch (err) {
        console.error("Failed to fetch master data", err);
      }
    };

    fetchClothDetails();
    fetchMasterData();
  }, []);

  const [masterData, setMasterData] = useState<{
    items: any[],
    colors: any[],
    clothTypes: any[],
    designs: any[],
    qualities: any[],
    processStages: any[]
  }>({
    items: [],
    colors: [],
    clothTypes: [],
    designs: [],
    qualities: [],
    processStages: []
  });

  const handleAddClient = async () => {
    if (!clientForm.org_name || !clientForm.phone) {
      return toast.error("Organization name and phone are required");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: clientForm.name,
        org_name: clientForm.org_name,
        phone: clientForm.phone,
        email: clientForm.email,
        gstin: clientForm.gstin,
        adhaar: clientForm.adhaar,
        branch: clientForm.branch,
        org_type: clientForm.org_type
      };

      await api.post('/clients', payload);
      toast.success("Client onboarded successfully");
      setIsAddClientModalOpen(false);
      fetchClients();

      // Reset form
      setClientForm({
        name: "",
        org_name: "",
        phone: "",
        email: "",
        gstin: "",
        adhaar: "",
        branch: [{ id: Date.now().toString(), name: "Main", address: "", phone: "" }],
        org_type: "Retail"
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      await api.put(`/clients/${selectedClient.id}`, clientEditForm);
      toast.success("Client updated successfully");
      setIsEditClientModalOpen(false);
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || "Failed to update client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...productForm,
        article_id: selectedArticleId === "new" ? null : parseInt(selectedArticleId),
        prices: [],
        labels: productForm.labels,
        extensions: productForm.extensions.flatMap(ext =>
          ext.extension_type_ids.map(etid => ({ extension_type_id: etid, cloth_detail_id: ext.cloth_detail_id }))
        )
      };
      await api.post(`/clients/${selectedClient.id}/products`, payload);
      toast.success("Article linked/created for client");
      setIsAddProductModalOpen(false);
      fetchDetails(selectedClient.id);
      // Refresh global articles if a new one was created
      if (selectedArticleId === "new") {
        const res = await api.get('/articles');
        if (res.success) setGlobalArticles(res.articles);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedClient || !editingProduct) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...productForm,
        prices: [],
        extensions: productForm.extensions.flatMap(ext =>
          ext.extension_type_ids.map(etid => ({ extension_type_id: etid, cloth_detail_id: ext.cloth_detail_id }))
        )
      };
      await api.put(`/clients/${selectedClient.id}/products/${editingProduct.id}`, payload);
      toast.success("Product updated successfully");
      setIsEditProductModalOpen(false);
      fetchDetails(selectedClient.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!selectedClient) return;
    const ok = await confirm({
      title: "Remove Linked Article",
      description: "Are you sure you want to remove this article from the client? It will be safely unlinked.",
      confirmText: "Remove",
      variant: "destructive"
    });
    if (ok) {
      try {
        setIsSubmitting(true);
        await api.delete(`/clients/${selectedClient.id}/products/${productId}`);
        toast.success("Product unlinked successfully");
        fetchDetails(selectedClient.id);
      } catch (error: any) {
        toast.error(error.message || "Failed to remove product");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const fetchMasterData = async () => {
    try {
      const [itemsRes, colorsRes, ctRes, designsRes, qualitiesRes, stagesRes] = await Promise.all([
        api.get('/items'),
        api.get('/fabric/colors'),
        api.get('/fabric/cloth-types'),
        api.get('/fabric/designs'),
        api.get('/fabric/qualities'),
        api.get('/processing/stages')
      ]);
      setMasterData({
        items: itemsRes.items || [],
        colors: Array.isArray(colorsRes) ? colorsRes : (colorsRes.colors || []),
        clothTypes: ctRes || [],
        designs: designsRes || [],
        qualities: qualitiesRes || [],
        processStages: stagesRes.stages || []
      });
    } catch (error) {
      console.error("Failed to load master data for products");
    }
  };

  const fetchClients = async () => {
    try {
      const data = await api.get('/clients');
      const externalClients = (data.clients || []).filter((c: any) => c.name !== 'INTERNAL_STOCK');

      // Safety: Parse branch if it's a string (mysql might return stringified JSON)
      const parsedClients = externalClients.map((c: any) => ({
        ...c,
        branch: typeof c.branch === 'string' ? JSON.parse(c.branch || '[]') : (c.branch || [])
      }));

      setClients(parsedClients);
      if (parsedClients.length > 0 && !selectedClient) {
        setSelectedClient(parsedClients[0]);
      }
    } catch (error) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (clientId: number) => {
    setDetailLoading(true);
    try {
      const [prodRes, ledgerRes] = await Promise.all([
        api.get(`/clients/${clientId}/products`),
        api.get(`/clients/${clientId}/account`)
      ]);
      setProducts(prodRes.products || []);
      setLedger(ledgerRes.ledger || []);
    } catch (error) {
      toast.error("Failed to load client details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchDetails(selectedClient.id);
    }
  }, [selectedClient?.id]);

  // No need to group anymore as each row is a unique brand
  const filteredClients = clients.filter(c =>
    c.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">CRM & Accounts</h1>
            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">Manage clients, price lists and payment ledgers</p>
          </div>
          <Button
            className="bg-[#e94560] hover:bg-[#d13a52] font-bold px-6"
            onClick={() => setIsAddClientModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Client List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search clients..."
                className="pl-9 h-11 border-gray-100 bg-gray-50 focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syncing CRM...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="py-20 text-center text-xs font-bold text-gray-400 uppercase">No clients found</p>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    "p-5 border-b border-gray-50 cursor-pointer transition-all hover:bg-indigo-50/30",
                    selectedClient?.id === client.id && "bg-indigo-50 border-l-4 border-l-indigo-600 shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{client.org_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] uppercase font-black bg-white border-gray-100">
                          {client.org_type || 'General'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold text-indigo-500 border-indigo-100 hover:bg-indigo-100 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(client);
                            setIsBranchListModalOpen(true);
                          }}
                        >
                          {client.branch?.length || 0} Branch{(client.branch?.length || 0) !== 1 ? 'es' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Total Balance</span>
                    <span
                      className={cn(
                        "text-sm font-black",
                        client.current_balance >= 0 ? "text-green-600" : "text-rose-600"
                      )}
                    >
                      ₹{Math.abs(client.current_balance).toLocaleString()}
                      {client.current_balance < 0 && <span className="text-[10px] ml-1">DR</span>}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Client Details */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {selectedClient ? (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
              {/* Client Header */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">{selectedClient.org_name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold uppercase text-[10px]">
                          {selectedClient.org_type}
                        </Badge>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID #{selectedClient.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200"
                      onClick={() => {
                        setClientEditForm({
                          name: selectedClient.name,
                          org_name: selectedClient.org_name,
                          phone: selectedClient.phone,
                          email: selectedClient.email || "",
                          gstin: (selectedClient as any).gstin || "",
                          adhaar: (selectedClient as any).adhaar || "",
                          branch: Array.isArray(selectedClient.branch) ? [...selectedClient.branch] : [],
                          org_type: selectedClient.org_type
                        });
                        setIsEditClientModalOpen(true);
                      }}
                    >
                      Edit Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200"
                      onClick={() => setIsViewClientModalOpen(true)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Overview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200"
                      onClick={() => {
                        setProductForm({
                          item_id: "",
                          cloth_detail_id: "",
                          color_id: "",
                          cloth_type_id: "",
                          design_id: "",
                          quality_id: "",
                          dress_name: "",
                          labels: [],
                          extensions: [],
                          stage_code: '131071'
                        });
                        setSelectedArticleId("");
                        setIsAddProductModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Link Articles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold h-9 bg-gray-50 border-gray-200 text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setIsBranchListModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Manage Branches
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Contact Details</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Phone className="w-4 h-4 text-indigo-600" /></div>
                        <span>{selectedClient.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Mail className="w-4 h-4 text-indigo-600" /></div>
                        <span className="truncate">{selectedClient.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Business Terms</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-indigo-600" /></div>
                        <span>{selectedClient.org_type} Pricing</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Package className="w-4 h-4 text-indigo-600" /></div>
                        <span>{products.length} Products Linked</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Account Summary</p>
                    <div className="p-4 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100 relative overflow-hidden group">
                      <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
                      <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-1">Current Balance</p>
                      <p className="text-2xl font-black text-white">₹{Math.abs(selectedClient.current_balance).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-indigo-200 mt-1">
                        {selectedClient.current_balance >= 0 ? "SURPLUS / ADVANCE" : "OUTSTANDING DUE"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Catalog */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-md font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" /> Product Matrix
                    </h3>
                    <Badge className="bg-gray-100 text-gray-500 font-bold border-none">{products.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {detailLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-10 text-indigo-200" /> :
                      products.length === 0 ? <p className="text-center py-10 text-xs font-bold text-gray-400 uppercase">No products configured</p> :
                        products.map((product) => (
                          <div key={product.id} className="p-4 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-bold text-gray-900">{product.article_name}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{product.item_name} • {product.color_name}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {product.labels?.map((l: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className={cn("text-[8px] font-bold uppercase", l.stockable ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-50 text-gray-400 border-gray-100")}>
                                      {l.label_type} {l.stockable && "• STOCKABLE"}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-opacity"
                                  onClick={() => {
                                    setEditingProduct(product);

                                    const cd = clothDetails.find((c: any) => c.id === product.cloth_detail_id);
                                    setSelectedArticleId(product.id?.toString() || "new");
                                    setProductForm({
                                      item_id: product.item_id.toString(),
                                      cloth_detail_id: product.cloth_detail_id.toString(),
                                      color_id: (cd?.color_id || "").toString(),
                                      cloth_type_id: (cd?.cloth_type_id || "").toString(),
                                      design_id: (cd?.design_id || "").toString(),
                                      quality_id: (cd?.quality_id || "").toString(),
                                      dress_name: product.article_name,
                                      labels: product.labels ? product.labels.map(l => ({ label_type_id: l.label_type_id, stockable: !!l.stockable })) : [],
                                      stage_code: (product as any).stage_code || 131071,
                                      extensions: (() => {
                                        if (!product.extensions) return [];
                                        const groups: Record<number, number[]> = {};
                                        product.extensions.forEach((e: any) => {
                                          if (!groups[e.cloth_detail_id]) groups[e.cloth_detail_id] = [];
                                          groups[e.cloth_detail_id].push(e.extension_type_id);
                                        });
                                        return Object.keys(groups).map(k => ({
                                          cloth_detail_id: parseInt(k),
                                          extension_type_ids: groups[parseInt(k)]
                                        }));
                                      })()
                                    });
                                    setIsEditProductModalOpen(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-opacity"
                                  onClick={() => handleDeleteProduct(product.id!)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-4">
                              {product.prices?.map((p, idx) => (
                                <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                  <p className="text-[8px] font-black text-gray-400 uppercase">{p.size}</p>
                                  <p className="text-xs font-black text-indigo-600">₹{p.price}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                  </div>
                </div>

                {/* Account Ledger */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-md font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Recent Ledger
                    </h3>
                    <Button variant="link" className="text-xs font-bold text-indigo-600 px-0 h-auto" onClick={() => toast.success(`Statement contains ${ledger.length} operations`)}>View Full Statement</Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    {detailLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-10 text-indigo-200" /> :
                      ledger.length === 0 ? <p className="text-center py-10 text-xs font-bold text-gray-400 uppercase">No transaction history</p> :
                        ledger.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-gray-800">{entry.description || entry.remarks || 'No description'}</p>
                              <p className="text-[10px] font-bold text-gray-400 capitalize">{new Date(entry.datetime).toLocaleDateString()} • {entry.mode}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-sm font-black",
                                entry.transaction === 'DR' ? "text-rose-600" : "text-green-600"
                              )}>
                                {entry.transaction === 'DR' ? `-₹${entry.amount}` : `+₹${entry.amount}`}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400">Bal: ₹{entry.balance}</p>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Building2 className="w-20 h-20 text-indigo-200 mb-4" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Select a client to manage</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        title={clientForm.org_name ? `Add New Branch for ${clientForm.org_name}` : "Onboard New Corporate Client"}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organization Name *</Label>
              <Input
                value={clientForm.org_name}
                onChange={(e) => setClientForm({ ...clientForm, org_name: e.target.value })}
                placeholder="Business Entity Name"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Contact Person</Label>
              <Input
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="Full Name"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number *</Label>
              <Input
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
              <Input
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="contact@business.com"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">GSTIN / Tax ID</Label>
              <Input
                value={clientForm.gstin}
                onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aadhaar / KYC ID</Label>
              <Input
                value={clientForm.adhaar}
                onChange={(e) => setClientForm({ ...clientForm, adhaar: e.target.value })}
                placeholder="XXXX XXXX XXXX"
                className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-mono"
              />
            </div>

            {/* Branch Management Section */}
            <div className="col-span-full space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Branch Locations ({clientForm.branch.length})</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-bold"
                  onClick={() => setClientForm({
                    ...clientForm,
                    branch: [...clientForm.branch, { id: Date.now().toString(), name: "", address: "", phone: "" }]
                  })}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Branch
                </Button>
              </div>

              <div className="space-y-4">
                {clientForm.branch.map((b, idx) => (
                  <div key={b.id} className="p-4 bg-gray-50/80 rounded-lg border border-gray-100 relative group/branch">
                    {clientForm.branch.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white shadow-sm text-rose-500 transition-opacity"
                        onClick={async () => {
                          const isConfirmed = await confirm({
                            title: "Remove Branch",
                            description: "Are you sure you want to remove this branch from the client?",
                            confirmText: "Remove",
                            variant: "destructive"
                          });
                          if (isConfirmed) {
                            setClientForm({
                              ...clientForm,
                              branch: clientForm.branch.filter((_, i) => i !== idx)
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-gray-500">Branch Name</Label>
                        <Input
                          value={b.name}
                          onChange={(e) => {
                            const newBranches = [...clientForm.branch];
                            newBranches[idx].name = e.target.value;
                            setClientForm({ ...clientForm, branch: newBranches });
                          }}
                          placeholder="e.g. Head Office"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1 col-span-1 md:col-span-1">
                        <Label className="text-[9px] font-bold text-gray-500">Address</Label>
                        <Input
                          value={b.address}
                          onChange={(e) => {
                            const newBranches = [...clientForm.branch];
                            newBranches[idx].address = e.target.value;
                            setClientForm({ ...clientForm, branch: newBranches });
                          }}
                          placeholder="Full Address"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-gray-500">Phone (Optional)</Label>
                        <Input
                          value={b.phone}
                          onChange={(e) => {
                            const newBranches = [...clientForm.branch];
                            newBranches[idx].phone = e.target.value;
                            setClientForm({ ...clientForm, branch: newBranches });
                          }}
                          placeholder="Branch Contact"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Client Category</Label>
              <Select
                value={clientForm.org_type}
                onValueChange={(val) => setClientForm({ ...clientForm, org_type: val })}
              >
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Distribution">Distribution</SelectItem>
                  <SelectItem value="Export">Export</SelectItem>
                  <SelectItem value="Job Work">Job Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 italic">Creating a client will automatically initialize their financial ledger.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="font-bold text-xs" onClick={() => setIsAddClientModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-8 shadow-lg shadow-indigo-100"
                onClick={handleAddClient}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Establish Relationship"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Branch List / Management Modal */}
      <Modal
        isOpen={isBranchListModalOpen}
        onClose={() => setIsBranchListModalOpen(false)}
        title={selectedClient?.org_name ? `Manage Branches - ${selectedClient.org_name}` : "Manage Branches"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Manage branch locations for this organization.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-xs font-bold"
                onClick={() => {
                  if (selectedClient) {
                    setClientEditForm({
                      name: selectedClient.name,
                      org_name: selectedClient.org_name,
                      phone: selectedClient.phone,
                      email: selectedClient.email || "",
                      gstin: (selectedClient as any).gstin || "",
                      adhaar: (selectedClient as any).adhaar || "",
                      branch: [...(selectedClient.branch || []), { id: Date.now().toString(), name: "", address: "", phone: "" }],
                      org_type: selectedClient.org_type
                    });
                    setIsEditClientModalOpen(true);
                    setIsBranchListModalOpen(false);
                  }
                }}
              >
                <Plus className="w-3 h-3 mr-2" />
                Add Branch
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold"
                onClick={() => {
                  if (selectedClient) {
                    setClientEditForm({
                      name: selectedClient.name,
                      org_name: selectedClient.org_name,
                      phone: selectedClient.phone,
                      email: selectedClient.email || "",
                      gstin: (selectedClient as any).gstin || "",
                      adhaar: (selectedClient as any).adhaar || "",
                      branch: [...(selectedClient.branch || [])],
                      org_type: selectedClient.org_type
                    });
                    setIsEditClientModalOpen(true);
                    setIsBranchListModalOpen(false);
                  }
                }}
              >
                <Edit className="w-3 h-3 mr-2" />
                Edit All
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {selectedClient?.branch?.map(branch => (
              <div key={branch.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{branch.name}</h4>
                    <p className="text-xs text-gray-500">{branch.address} {branch.phone && `• ${branch.phone}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className={`text-sm font-black text-gray-400`}>
                      ID: {branch.id}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* View Client Details Modal */}
      <Modal
        isOpen={isViewClientModalOpen}
        onClose={() => setIsViewClientModalOpen(false)}
        title="Client Overview"
        size="lg"
      >
        <div className="space-y-8">
          {selectedClient && (
            <>
              {/* Header Section */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <Building2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{selectedClient.org_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-indigo-100 text-indigo-600 bg-indigo-50">{selectedClient.org_type}</Badge>
                      <span className="text-xs font-bold text-gray-400">ID #{selectedClient.id}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Balance</p>
                  <p className={`text-2xl font-black ${selectedClient.current_balance >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
                    ₹{Math.abs(selectedClient.current_balance).toLocaleString()}
                    <span className="text-xs ml-1 text-gray-400">{selectedClient.current_balance >= 0 ? "CR" : "DR"}</span>
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Branches Configured ({selectedClient.branch.length})</p>
                  </div>
                  <div className="pl-6 space-y-2">
                    {selectedClient.branch.map(b => (
                      <div key={b.id}>
                        <p className="text-sm font-bold text-gray-900">{b.name}</p>
                        <p className="text-[10px] text-gray-500">{b.address}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Building2 className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Primary Contact</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.name}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Phone className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Phone Number</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.phone}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Mail className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Email Address</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 pl-6">{selectedClient.email || "Not Provided"}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <ClipboardCheck className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">GSTIN</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 pl-6">{selectedClient.gstin || "N/A"}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <ClipboardCheck className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Aadhaar / KYC</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 pl-6">{selectedClient.adhaar || "N/A"}</p>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100">
                <Button className="bg-gray-900 text-white font-bold" onClick={() => setIsViewClientModalOpen(false)}>Close Overview</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        title="Update Client Logistics"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Contact</Label>
              <Input
                value={clientEditForm.name}
                onChange={(e) => setClientEditForm({ ...clientEditForm, name: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organization Name</Label>
              <Input
                value={clientEditForm.org_name}
                onChange={(e) => setClientEditForm({ ...clientEditForm, org_name: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</Label>
              <Input
                value={clientEditForm.phone}
                onChange={(e) => setClientEditForm({ ...clientEditForm, phone: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</Label>
              <Input
                value={clientEditForm.email}
                onChange={(e) => setClientEditForm({ ...clientEditForm, email: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">GSTIN</Label>
              <Input
                value={clientEditForm.gstin}
                onChange={(e) => setClientEditForm({ ...clientEditForm, gstin: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aadhar / KYC</Label>
              <Input
                value={clientEditForm.adhaar}
                onChange={(e) => setClientEditForm({ ...clientEditForm, adhaar: e.target.value })}
                className="h-12 font-bold"
              />
            </div>
            {/* Branch Management Section */}
            <div className="col-span-full space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Branch Locations ({clientEditForm.branch.length})</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-bold"
                  onClick={() => setClientEditForm({
                    ...clientEditForm,
                    branch: [...clientEditForm.branch, { id: Date.now().toString(), name: "", address: "", phone: "" }]
                  })}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Branch
                </Button>
              </div>

              <div className="space-y-4">
                {clientEditForm.branch.map((b, idx) => (
                  <div key={b.id} className="p-4 bg-gray-50/80 rounded-lg border border-gray-100 relative group/branch">
                    {clientEditForm.branch.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white shadow-sm text-rose-500 transition-opacity"
                        onClick={async () => {
                          const isConfirmed = await confirm({
                            title: "Remove Branch",
                            description: "Are you sure you want to remove this branch? Any changes will be saved when you update the client.",
                            confirmText: "Remove",
                            variant: "destructive"
                          });
                          if (isConfirmed) {
                            setClientEditForm({
                              ...clientEditForm,
                              branch: clientEditForm.branch.filter((_, i) => i !== idx)
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-gray-500">Branch Name</Label>
                        <Input
                          value={b.name}
                          onChange={(e) => {
                            const newBranches = [...clientEditForm.branch];
                            newBranches[idx].name = e.target.value;
                            setClientEditForm({ ...clientEditForm, branch: newBranches });
                          }}
                          placeholder="e.g. Head Office"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-gray-500">Address</Label>
                        <Input
                          value={b.address}
                          onChange={(e) => {
                            const newBranches = [...clientEditForm.branch];
                            newBranches[idx].address = e.target.value;
                            setClientEditForm({ ...clientEditForm, branch: newBranches });
                          }}
                          placeholder="Full Address"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-gray-500">Phone</Label>
                        <Input
                          value={b.phone}
                          onChange={(e) => {
                            const newBranches = [...clientEditForm.branch];
                            newBranches[idx].phone = e.target.value;
                            setClientEditForm({ ...clientEditForm, branch: newBranches });
                          }}
                          placeholder="Branch Contact"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</Label>
              <Select
                value={clientEditForm.org_type}
                onValueChange={(val) => setClientEditForm({ ...clientEditForm, org_type: val })}
              >
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Distribution">Distribution</SelectItem>
                  <SelectItem value="Export">Export</SelectItem>
                  <SelectItem value="Job Work">Job Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsEditClientModalOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600" onClick={handleEditClient} disabled={isSubmitting}>Update Client</Button>
          </div>
        </div>
      </Modal>

      {/* Product Modal (Add/Edit) */}
      <Modal
        isOpen={isAddProductModalOpen || isEditProductModalOpen}
        onClose={() => { setIsAddProductModalOpen(false); setIsEditProductModalOpen(false); }}
        title={isEditProductModalOpen ? "Modify Article Link" : "Client Article Allocation"}
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">School Dress Name *</Label>
            <Input 
              value={productForm.dress_name || ""} 
              onChange={e => setProductForm({ ...productForm, dress_name: e.target.value })} 
              placeholder="e.g. BCM Summer Uniform (Primary)"
              className="h-12 border-gray-100 bg-gray-50/50 rounded-lg font-bold"
            />
          </div>

          {isEditProductModalOpen && editingProduct && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b pb-2">Reference Article Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Master Fabric</p>
                  <p className="text-sm font-bold text-gray-800">
                    {editingProduct.color_name} • {editingProduct.cloth_type}
                    <span className="block text-[10px] text-gray-500 font-medium">
                      {editingProduct.design_name} / {editingProduct.quality_name}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Item Category</p>
                  <p className="text-sm font-bold text-gray-800">{editingProduct.item_name}</p>
                </div>
              </div>
              {editingProduct.extensions && editingProduct.extensions.length > 0 && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Original Extensions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {editingProduct.extensions.map((ext, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-medium bg-white p-2 rounded border border-gray-50">
                        <span className="text-gray-900 font-bold">{ext.extension_type}</span>
                        <span className="text-gray-400">{ext.color_name} • {ext.cloth_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isEditProductModalOpen && (
            <div className="space-y-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <div className="flex items-center justify-between">
                <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Link Existing Article</Label>
                {(filterType || filterColor || filterDesign || filterQuality) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase"
                    onClick={() => {
                       setFilterType("");
                       setFilterColor("");
                       setFilterDesign("");
                       setFilterQuality("");
                       setSelectedArticleId("");
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[9px] font-bold text-gray-500 uppercase">Cloth Type</Label>
                      {filterType && (
                        <button 
                          onClick={() => setFilterType("")}
                          className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                        >
                          <X className="w-2 h-2" /> clear
                        </button>
                      )}
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        {masterData.clothTypes.map((ct: any) => <SelectItem key={ct.id} value={ct.id.toString()}>{ct.type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[9px] font-bold text-gray-500 uppercase">Color Variant</Label>
                      {filterColor && (
                        <button 
                          onClick={() => setFilterColor("")}
                          className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                        >
                          <X className="w-2 h-2" /> clear
                        </button>
                      )}
                    </div>
                    <Select value={filterColor} onValueChange={setFilterColor}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue placeholder="Select Color" /></SelectTrigger>
                      <SelectContent>
                        {masterData.colors.filter((c: any) => c.applicability === 1 || c.applicability === undefined).map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.color_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[9px] font-bold text-gray-500 uppercase">Design Pattern</Label>
                      {filterDesign && (
                        <button 
                          onClick={() => setFilterDesign("")}
                          className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                        >
                          <X className="w-2 h-2" /> clear
                        </button>
                      )}
                    </div>
                    <Select value={filterDesign} onValueChange={setFilterDesign}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue placeholder="Select Design" /></SelectTrigger>
                      <SelectContent>
                        {masterData.designs.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.design_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[9px] font-bold text-gray-500 uppercase">Fabric Quality</Label>
                      {filterQuality && (
                        <button 
                          onClick={() => setFilterQuality("")}
                          className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                        >
                          <X className="w-2 h-2" /> clear
                        </button>
                      )}
                    </div>
                    <Select value={filterQuality} onValueChange={setFilterQuality}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue placeholder="Select Quality" /></SelectTrigger>
                      <SelectContent>
                        {masterData.qualities.map((q: any) => <SelectItem key={q.id} value={q.id.toString()}>{q.quality_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-50">
                  <Label className="text-[9px] font-bold text-indigo-400 uppercase">Matching Master Articles</Label>
                <div className="mt-1">
                  <ArticleCombobox 
                    value={selectedArticleId}
                    onChange={(val) => {
                      setSelectedArticleId(val);
                      const art = globalArticles.find(a => a.id.toString() === val);
                      if (art) {
                        setProductForm({
                          ...productForm,
                          item_id: art.item_id.toString(),
                          dress_name: `${art.item_name} • ${art.color_name}`,
                          cloth_detail_id: art.cloth_detail_id.toString()
                        });
                      }
                    }}
                    items={globalArticles.filter((art: any) => {
                      const cloth = clothDetails.find(cd => cd.id === art.cloth_detail_id);
                      if (!cloth) return true;
                      if (filterType && cloth.cloth_type_id?.toString() !== filterType) return false;
                      if (filterColor && cloth.color_id?.toString() !== filterColor) return false;
                      if (filterDesign && cloth.design_id?.toString() !== filterDesign) return false;
                      if (filterQuality && cloth.quality_id?.toString() !== filterQuality) return false;
                      return true;
                    })}
                    placeholder="Search or select matching article..."
                  />
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase italic mt-1">Linking an existing article ensures shared configuration across clients.</p>
            </div>
          )}


          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Labelling Requirements</Label>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(val) => {
                    if (!val) return;
                    if (productForm.labels.some(l => l.label_type_id === parseInt(val))) return toast.error("Label already added");
                    setProductForm({
                      ...productForm,
                      labels: [...productForm.labels, { label_type_id: parseInt(val), stockable: false }]
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-[10px] w-48 bg-white border-indigo-100 text-indigo-600 font-bold">
                    <SelectValue placeholder="+ Add Label" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemLabelTypes.length === 0 ? (
                      <div className="p-3 text-[10px] text-gray-400 italic text-center">
                        No labels found for this item type
                      </div>
                    ) : (
                      itemLabelTypes.map((lt: any) => (
                        <SelectItem key={lt.id} value={lt.id.toString()}>{lt.label_type}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              {productForm.labels.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed text-center">No labels linked yet.</p>
              ) : (
                productForm.labels.map((l, lIdx) => {
                  const labelType = itemLabelTypes.find(lt => lt.id === l.label_type_id);
                  return (
                    <div key={lIdx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-sm group/label">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px]">L</div>
                          <div>
                            <p className="text-sm font-bold text-gray-700">{labelType?.label_type || 'Unknown Label'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                               <Checkbox
                                  id={`stockable-${lIdx}`}
                                  checked={l.stockable}
                                  onCheckedChange={(checked) => {
                                    const newLabels = [...productForm.labels];
                                    newLabels[lIdx].stockable = !!checked;
                                    setProductForm({ ...productForm, labels: newLabels });
                                  }}
                                  className="h-3 w-3 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                               />
                               <label htmlFor={`stockable-${lIdx}`} className="text-[9px] font-black text-gray-400 uppercase cursor-pointer">Stockable / Custom Label</label>
                            </div>
                          </div>
                       </div>
                       <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-400 transition-opacity"
                          onClick={() => {
                            setProductForm({
                              ...productForm,
                              labels: productForm.labels.filter((_, i) => i !== lIdx)
                            });
                          }}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Processing Stages Selection */}
          <div className="space-y-4 border-t pt-4">
             <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Processing Stages (Custom Route)</Label>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setProductForm({ ...productForm, stage_code: '131071' })}
                     className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline"
                   >
                     Select All
                   </button>
                   <span className="text-gray-300">|</span>
                   <button 
                     onClick={() => setProductForm({ ...productForm, stage_code: '0' })}
                     className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline"
                   >
                     Clear All
                   </button>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                {masterData.processStages.map((stage: any) => {
                  const code = BigInt(productForm.stage_code || 0);
                  const isChecked = (code & (1n << BigInt(stage.id))) !== 0n;
                  const isMandatory = stage.id === 0 || stage.id === 16;
                  
                  return (
                    <div key={stage.id} className={cn(
                      "flex items-center space-x-2 group",
                      isMandatory && "opacity-50"
                    )}>
                      <Checkbox 
                        id={`stage-${stage.id}`}
                        checked={isChecked}
                        disabled={isMandatory}
                        onCheckedChange={(checked) => {
                          if (isMandatory) return;
                          let newCode = BigInt(productForm.stage_code || 0);
                          if (checked) {
                            newCode |= (1n << BigInt(stage.id));
                          } else {
                            newCode &= ~(1n << BigInt(stage.id));
                          }
                          setProductForm({ ...productForm, stage_code: newCode.toString() });
                        }}
                        className="border-indigo-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <label 
                        htmlFor={`stage-${stage.id}`}
                        className={cn(
                          "text-[11px] font-medium leading-none cursor-pointer group-hover:text-indigo-600 transition-colors",
                          isMandatory && "cursor-default group-hover:text-gray-500"
                        )}
                      >
                        {stage.stage_name}
                      </label>
                    </div>
                  );
                })}
             </div>
             <p className="text-[10px] text-gray-400 italic font-bold">
               {BigInt(productForm.stage_code || 0) === 131071n ? "Full Process Flow Active" : 
                `Custom Route: ${masterData.processStages.filter((s: any) => (BigInt(productForm.stage_code || 0) & (1n << BigInt(s.id))) !== 0n).length} Stages active`}
             </p>
          </div>


          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="ghost" onClick={() => { setIsAddProductModalOpen(false); setIsEditProductModalOpen(false); }}>Cancel</Button>
            <Button className="bg-indigo-600" onClick={isEditProductModalOpen ? handleEditProduct : handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

