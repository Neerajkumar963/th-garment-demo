import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Users, Package, Clock, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../../services/api";
import { toast } from "sonner";
import { cn } from "./ui/utils.tsx";
import { Badge } from "./ui/badge";
import { PageHeader } from "./ui/PageHeader";

interface PLData {
  revenue: number;
  labor_cost: number;
  fabric_cost: number;
  net_profit: number;
  month: string;
  year: string;
}

interface InventoryValue {
  fabric_stock: number;
  finished_goods_value: number;
}

interface ProductionStageSummary {
  stage_name: string;
  completed: number;
}

const BLINKIT_GREEN = "#0C831F";
const BLINKIT_YELLOW = "#F8CB46";

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [pl, setPl] = useState<PLData | null>(null);
  const [inv, setInv] = useState<InventoryValue | null>(null);
  const [prod, setProd] = useState<ProductionStageSummary[]>([]);
  const [outstanding, setOutstanding] = useState<any>(null);

  const fetchData = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [plRes, invRes, prodRes, outRes] = await Promise.all([
        api.get(`/reports/profit-loss?month=${month}&year=${year}`),
        api.get('/reports/inventory-value'),
        api.get(`/reports/production-summary?month=${month}&year=${year}`),
        api.get('/reports/outstanding')
      ]);

      setPl(plRes);
      setInv(invRes);
      setProd(prodRes.summary || []);
      setOutstanding(outRes);
    } catch (error) {
      toast.error("Failed to sync business intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInvValue = (inv?.fabric_stock || 0) + (inv?.finished_goods_value || 0);

  return (
    <div className="flex-1 overflow-auto bg-[#F5F7F9]">
      <PageHeader
        title="Business Intelligence"
        subtitle="Operational Performance & Profitability Tracking"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EAF5EB] text-[#0C831F] rounded-full text-[11px] font-extrabold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#0C831F] animate-pulse" />
          Live Cloud Sync
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] opacity-40">
          <Loader2 className="w-10 h-10 animate-spin text-[#0C831F] mb-4" />
          <p className="text-[11px] font-bold text-[#1F1F1F] uppercase tracking-[0.1em]">Crunching Master Data...</p>
        </div>
      ) : (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Financial P&L Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-[#F8CB46] opacity-10 rounded-full group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-extrabold text-[#666] uppercase tracking-wider mb-1">Monthly Revenue</p>
              <h3 className="text-2xl font-black text-[#1F1F1F]">₹{pl?.revenue.toLocaleString()}</h3>
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#EAF5EB] text-[#0C831F] text-[9px] font-black rounded uppercase">Cash Inflow</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-[#EE4D4D] opacity-10 rounded-full group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-extrabold text-[#666] uppercase tracking-wider mb-1">Labor Expense</p>
              <h3 className="text-2xl font-black text-[#EE4D4D]">₹{pl?.labor_cost.toLocaleString()}</h3>
              <p className="text-[10px] font-bold text-[#EE4D4D]/60 mt-3 uppercase">Production Wages</p>
            </div>

            <div className="bg-[#0C831F] p-5 rounded-2xl shadow-lg relative overflow-hidden group">
              <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-extrabold text-white/70 uppercase tracking-wider mb-1">Net Earnings (P/L)</p>
              <h3 className="text-2xl font-black text-[#F8CB46]">₹{pl?.net_profit.toLocaleString()}</h3>
              <div className="mt-3">
                <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-black rounded uppercase">
                  {(pl?.net_profit || 0) > 0 ? 'Surplus Gained' : 'Operating Loss'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-gray-100 opacity-60 rounded-full group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-extrabold text-[#666] uppercase tracking-wider mb-1">Inventory Value</p>
              <h3 className="text-2xl font-black text-[#1F1F1F]">₹{totalInvValue.toLocaleString()}</h3>
              <p className="text-[10px] font-bold text-[#0C831F] mt-3 uppercase">Asset Net Worth</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[11px] font-extrabold text-[#1F1F1F] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-4 bg-[#F8CB46] rounded-sm" /> Production Efficacy
                </h4>
                <div className="text-[9px] font-black text-[#0C831F] bg-[#EAF5EB] px-2 py-1 rounded">UNITS COMPLETED</div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={prod} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="stage_name" type="category" stroke="#666" fontSize={10} width={90} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F5F7F9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E8E8E8', fontSize: '12px' }} />
                  <Bar dataKey="completed" fill={BLINKIT_GREEN} radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[11px] font-extrabold text-[#1F1F1F] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-4 bg-[#0C831F] rounded-sm" /> Asset Allocation
                </h4>
                <span className="text-[9px] font-black text-[#666] uppercase">Stock Value Split</span>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Fabric Stock', value: inv?.fabric_stock || 0 },
                        { name: 'Finished Goods', value: inv?.finished_goods_value || 0 }
                      ]}
                      cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={8} dataKey="value"
                    >
                      <Cell fill={BLINKIT_GREEN} stroke="none" />
                      <Cell fill={BLINKIT_YELLOW} stroke="none" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Outstanding Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#EAF5EB] border-b border-[#D4EAD7]">
                <h4 className="text-[11px] font-extrabold text-[#0C831F] uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Receivables (Clients)
                </h4>
              </div>
              <div className="p-5 space-y-3">
                {outstanding?.receivables_from_clients?.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#F5F7F9] last:border-0">
                    <span className="text-[13px] font-semibold text-[#1F1F1F]">{c.org_name}</span>
                    <span className="text-[13px] font-extrabold text-[#0C831F]">₹{c.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center border-t border-dashed border-gray-200">
                  <span className="text-[10px] font-extrabold text-[#666] uppercase">Total Target</span>
                  <span className="text-md font-black text-[#1F1F1F]">₹{outstanding?.receivables_from_clients?.reduce((a: any, b: any) => a + Number(b.balance), 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#FFF5F5] border-b border-[#FED7D7]">
                <h4 className="text-[11px] font-extrabold text-[#EE4D4D] uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> Payables (Staff Wages)
                </h4>
              </div>
              <div className="p-5 space-y-3">
                {outstanding?.payables_to_employees?.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#F5F7F9] last:border-0">
                    <span className="text-[13px] font-semibold text-[#1F1F1F]">{e.name}</span>
                    <span className="text-[13px] font-extrabold text-[#EE4D4D]">₹{Number(e.balance).toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center border-t border-dashed border-gray-200">
                  <span className="text-[10px] font-extrabold text-[#666] uppercase">Total Liability</span>
                  <span className="text-md font-black text-[#1F1F1F]">₹{outstanding?.payables_to_employees?.reduce((a: any, b: any) => a + Number(b.balance), 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
