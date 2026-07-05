import { useState, useEffect } from "react";
import { Search, Plus, Loader2, Edit, Trash2, Layers, Tag, IndianRupee, X, ChevronDown } from "lucide-react";
import { useConfirm } from "./ui/WindowsConfirm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import { Modal } from "./ui/modal";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "./ui/command";
import { Check } from "lucide-react";
import { cn } from "./ui/utils.tsx";

interface Article {
  id: number;
  item_id: number;
  item_name: string;
  cloth_detail_id: number;
  color_name: string;
  cloth_type: string;
  design_name: string;
  quality_name: string;
  created_at: string;
}

function FabricCombobox({ 
  value, 
  onChange, 
  items, 
  globalList,
  placeholder = "Select Fabric",
  disabled = false
}: { 
  value: string; 
  onChange: (val: string) => void; 
  items: any[];
  globalList: any[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find(cd => cd.id.toString() === value) || globalList.find(cd => cd.id.toString() === value);
  const selectedIndex = selected ? globalList.findIndex(c => c.id === selected.id) : -1;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 bg-white text-xs font-bold border-slate-200 hover:text-indigo-600 hover:bg-slate-50 transition-all text-left font-sans"
          disabled={disabled}
        >
          <span className="truncate">
            {selected ? (
              <><span className="text-indigo-600 mr-1.5">[{(selectedIndex + 1).toString().padStart(2, '0')}]</span>{selected.cloth_type} • {selected.color_name} • {selected.design_name}</>
            ) : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-lg shadow-indigo-100 border-slate-100" align="start">
        <Command>
           <CommandInput placeholder="Search fabric..." className="text-xs h-9 border-none focus:ring-0" />
           <CommandList>
             <CommandEmpty className="text-xs p-4 text-center text-slate-500 font-bold">No fabric found.</CommandEmpty>
             <CommandGroup className="max-h-[250px] overflow-y-auto w-full p-1 scrollbar-thin scrollbar-thumb-slate-200">
                {items.map((cd) => {
                  const gIndex = globalList.findIndex(c => c.id === cd.id);
                  const displayIndex = gIndex + 1;
                  return (
                    <CommandItem
                      key={cd.id}
                      value={`${displayIndex} ${cd.cloth_type} ${cd.color_name} ${cd.design_name} ${cd.id} sr-${displayIndex}`}
                      onSelect={() => {
                        onChange(cd.id.toString());
                        setOpen(false);
                      }}
                      className={cn(
                        "cursor-pointer py-1.5 px-2 rounded-md mb-0.5",
                        value === cd.id.toString() ? "bg-indigo-50" : "hover:bg-slate-50"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5 shrink-0 transition-all",
                          value === cd.id.toString() ? "opacity-100 text-indigo-600" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col truncate w-full pr-2">
                        <span className="font-bold text-slate-700 text-xs truncate">
                          <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-sm px-1 min-w-[20px] mr-2 text-[9px] font-black">{displayIndex}</span>
                          {cd.cloth_type} • {cd.color_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate ml-7">
                          {cd.design_name} • {cd.quality_name}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
             </CommandGroup>
           </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function Articles() {
  const confirm = useConfirm();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [masterData, setMasterData] = useState({
    items: [] as any[],
    colors: [] as any[],
    clothTypes: [] as any[],
    designs: [] as any[],
    qualities: [] as any[],
    extensionTypes: [] as any[]
  });
  const [clothDetails, setClothDetails] = useState<any[]>([]);

  const [form, setForm] = useState({
    item_id: "",
    cloth_detail_id: "",
    color_id: "",
    cloth_type_id: "",
    design_id: "",
    quality_id: "",
    extensions: [] as { cloth_detail_id: number; extension_type_id: number }[]
  });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/articles');
      if (res.success) setArticles(res.articles);
    } catch (error) {
      toast.error("Failed to fetch articles");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [itemsRes, colorsRes, ctRes, designsRes, qualitiesRes, cdRes, extensionTypesRes] = await Promise.all([
        api.get('/items'),
        api.get('/fabric/colors'),
        api.get('/fabric/cloth-types'),
        api.get('/fabric/designs'),
        api.get('/fabric/qualities'),
        api.get('/fabric/cloth-details'),
        api.get('/extensions')
      ]);
      setMasterData({
        items: itemsRes.items || [],
        colors: Array.isArray(colorsRes) ? colorsRes : (colorsRes.colors || []),
        clothTypes: ctRes || [],
        designs: designsRes || [],
        qualities: qualitiesRes || [],
        extensionTypes: extensionTypesRes.data || []
      });
      setClothDetails(cdRes || []);
    } catch (error: any) {
      toast.error("Failed to load fabric/item metadata");
      console.error("Failed to load master data", error);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchMasterData();
  }, []);

  const handleSave = async () => {
    if (!form.item_id || !form.cloth_detail_id) {
      return toast.error("Please fill all required fields (Item, Fabric)");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        extensions: form.extensions
      };
      if (isEdit && editingId) {
        await api.put(`/articles/${editingId}`, payload);
        toast.success("Article updated");
      } else {
        await api.post('/articles', payload);
        toast.success("Article created");
      }
      setIsModalOpen(false);
      fetchArticles();
    } catch (error: any) {
      toast.error(error.message || "Failed to save article");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Delete Global Article?",
      description: "Note: This will not delete the Article, but it will prevent further linking. (Logic depends on backend implementation)",
      variant: "destructive"
    });
    if (ok) {
      try {
        await api.delete(`/articles/${id}`);
        toast.success("Article deleted");
        fetchArticles();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete article");
      }
    }
  };

  const filteredArticles = articles.filter(a =>
    a.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.color_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvailable = (excludeField: string) => {
    if (!clothDetails.length) return null;
    return clothDetails.filter((cd: any) => {
      const checks: Record<string, string> = {
        color_id: form.color_id,
        cloth_type_id: form.cloth_type_id,
        design_id: form.design_id,
        quality_id: form.quality_id,
      };
      delete checks[excludeField];
      return Object.entries(checks).every(([k, v]) => !v || cd[k]?.toString() === v);
    }).map((cd: any) => cd[excludeField]?.toString());
  };

  const makeChangeHandler = (field: string) => (v: string) => {
    const update: any = { [field]: v };
    const allFields = ['color_id', 'cloth_type_id', 'design_id', 'quality_id'];
    const newForm = { ...form, [field]: v };

    allFields.filter(f => f !== field).forEach(f => {
      const recomputed = clothDetails.filter((cd: any) => {
        return Object.entries({ ...newForm, [f]: undefined })
          .filter(([k]) => k !== f && allFields.includes(k))
          .every(([k, val]: any) => !val || cd[k]?.toString() === val);
      }).map((cd: any) => cd[f]?.toString());

      if (newForm[f as keyof typeof newForm] && recomputed.length > 0 && !recomputed.includes(newForm[f as keyof typeof newForm] as string)) {
        update[f] = "";
      }
    });

    const finalSelections = { ...newForm, ...update };
    const matching = clothDetails.find((cd: any) =>
      allFields.every(k => !finalSelections[k as keyof typeof finalSelections] || cd[k]?.toString() === finalSelections[k as keyof typeof finalSelections])
    );

    const isAllSelected = allFields.every(k => !!finalSelections[k as keyof typeof finalSelections]);
    if (isAllSelected && matching) {
      update.cloth_detail_id = matching.id.toString();
    } else {
      update.cloth_detail_id = "";
    }

    setForm(prev => ({ ...prev, ...update }));
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-600" /> Master Articles
          </h1>
          <p className="text-slate-500 font-medium">Manage the global database of your garment products.</p>
        </div>
        <Button
          onClick={() => {
            setIsEdit(false);
            setForm({
              item_id: "", cloth_detail_id: "",
              color_id: "", cloth_type_id: "", design_id: "", quality_id: "",
              extensions: []
            });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6 rounded-xl shadow-lg shadow-indigo-100 font-bold uppercase tracking-widest text-[10px]"
        >
          <Plus className="w-4 h-4 mr-2" /> New Article
        </Button>
      </div>

      <div className="relative group max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <Input
          placeholder="Search by name, item, or color..."
          className="pl-12 h-14 bg-white border-slate-200 text-slate-900 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500/10 placeholder:text-slate-400 font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Article Database...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <Layers className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">No Master Articles Found</h3>
            <p className="text-slate-500">Add global articles to link them with your clients.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/4">Fabric Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Extension Details</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 w-80">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredArticles.map(article => (
                <tr key={article.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-black text-slate-400">
                    #{article.id}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border-indigo-100">
                      {article.item_name}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-orange-50 flex items-center justify-center text-orange-600">
                        <Tag className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {article.color_name} • {article.cloth_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {((article as any).extensions || []).map((ext: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[9px] bg-slate-50 text-slate-600 border-slate-200">
                          {ext.extension_type}
                        </Badge>
                      ))}
                      {((article as any).extensions || []).length === 0 && (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => {
                          setIsEdit(true);
                          setEditingId(article.id);
                          const cd = clothDetails.find(c => c.id === article.cloth_detail_id);
                          setForm({
                            item_id: article.item_id.toString(),
                            cloth_detail_id: article.cloth_detail_id.toString(),
                            color_id: (cd?.color_id || "").toString(),
                            cloth_type_id: (cd?.cloth_type_id || "").toString(),
                            design_id: (cd?.design_id || "").toString(),
                            quality_id: (cd?.quality_id || "").toString(),
                            extensions: (article as any).extensions || []
                          });
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEdit ? "Edit Article" : "Create New Article"}
        size="lg"
      >
        <div className="space-y-6">

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Internal Model (Item)</Label>
            <Select value={form.item_id} onValueChange={v => setForm({ ...form, item_id: v })}>
              <SelectTrigger className="h-12 border-slate-200 font-bold"><SelectValue placeholder="Select Item Type" /></SelectTrigger>
              <SelectContent>
                {masterData.items.filter((i: any) => i.item_type === 'tailor_made').map((i: any) => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Fabric Combination</Label>
            <p className="text-[10px] text-slate-400 -mt-1 italic font-medium">Combination must exist in inventory</p>
            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">Cloth Type</Label>
                  {form.cloth_type_id && (
                    <button
                      onClick={() => makeChangeHandler('cloth_type_id')("")}
                      className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                    >
                      <X className="w-2 h-2" /> clear
                    </button>
                  )}
                </div>
                <Select value={form.cloth_type_id} onValueChange={makeChangeHandler('cloth_type_id')}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {masterData.clothTypes.filter(t => !getAvailable('cloth_type_id') || getAvailable('cloth_type_id')?.includes(t.id.toString())).map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">Color Variant</Label>
                  {form.color_id && (
                    <button
                      onClick={() => makeChangeHandler('color_id')("")}
                      className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                    >
                      <X className="w-2 h-2" /> clear
                    </button>
                  )}
                </div>
                <Select value={form.color_id} onValueChange={makeChangeHandler('color_id')}>
                  <SelectTrigger><SelectValue placeholder="Color" /></SelectTrigger>
                  <SelectContent>
                    {masterData.colors.filter(c => !getAvailable('color_id') || getAvailable('color_id')?.includes(c.id.toString())).map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.color_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">Design Pattern</Label>
                  {form.design_id && (
                    <button
                      onClick={() => makeChangeHandler('design_id')("")}
                      className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                    >
                      <X className="w-2 h-2" /> clear
                    </button>
                  )}
                </div>
                <Select value={form.design_id} onValueChange={makeChangeHandler('design_id')}>
                  <SelectTrigger><SelectValue placeholder="Design" /></SelectTrigger>
                  <SelectContent>
                    {masterData.designs.filter(d => !getAvailable('design_id') || getAvailable('design_id')?.includes(d.id.toString())).map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.design_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">Fabric Quality</Label>
                  {form.quality_id && (
                    <button
                      onClick={() => makeChangeHandler('quality_id')("")}
                      className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1 hover:bg-rose-100"
                    >
                      <X className="w-2 h-2" /> clear
                    </button>
                  )}
                </div>
                <Select value={form.quality_id} onValueChange={makeChangeHandler('quality_id')}>
                  <SelectTrigger><SelectValue placeholder="Quality" /></SelectTrigger>
                  <SelectContent>
                    {masterData.qualities.filter(q => !getAvailable('quality_id') || getAvailable('quality_id')?.includes(q.id.toString())).map(q => <SelectItem key={q.id} value={q.id.toString()}>{q.quality_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Extensions & Fabric Setup</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase tracking-widest"
                onClick={() => {
                  setForm({
                    ...form,
                    extensions: [...form.extensions, { cloth_detail_id: 0, extension_type_id: 0 }]
                  });
                }}
                disabled={!form.cloth_detail_id}
              >
                <Plus className="w-3 h-3 mr-2" /> Add Extension
              </Button>
            </div>

            <div className="space-y-3">
              {form.extensions.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-[10px] text-slate-400 italic">No extensions added yet. Extensions like Collar/Cuff are linked to specific fabric details.</p>
                </div>
              ) : (
                form.extensions.map((ext, idx) => {
                  const currentCd = clothDetails.find(cd => cd.id === ext.cloth_detail_id);
                  return (
                    <div key={idx} className="flex flex-col gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl relative group/ext">
                      <button
                        onClick={() => setForm({ ...form, extensions: form.extensions.filter((_, i) => i !== idx) })}
                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover/ext:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-black text-slate-400">Extension Type</Label>
                          <Select
                            value={ext.extension_type_id.toString()}
                            onValueChange={(v) => {
                              const newExts = [...form.extensions];
                              newExts[idx].extension_type_id = parseInt(v);
                              setForm({ ...form, extensions: newExts });
                            }}
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-bold border-slate-200">
                              <SelectValue placeholder="Select Part" />
                            </SelectTrigger>
                            <SelectContent>
                              {masterData.extensionTypes.filter((et: any) => et.item_id === parseInt(form.item_id)).map((et: any) => (
                                <SelectItem key={et.id} value={et.id.toString()}>{et.extension_type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-black text-slate-400">Apply to Fabric</Label>
                          <FabricCombobox
                            value={ext.cloth_detail_id ? ext.cloth_detail_id.toString() : ""}
                            onChange={(v) => {
                              const newExts = [...form.extensions];
                              newExts[idx].cloth_detail_id = parseInt(v);
                              setForm({ ...form, extensions: newExts });
                            }}
                            items={clothDetails}
                            globalList={clothDetails}
                            placeholder="Search extension fabric..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t font-black uppercase text-[10px] tracking-widest">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Article"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      variant === "outline" ? "border border-slate-200 text-slate-700" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
}
