import {
  LayoutDashboard,
  Package,
  Shirt,
  Users,
  ShoppingCart,
  DollarSign,
  Scissors,
  Layers,
  UserCircle,
  Calendar,
  Wallet,
  BarChart3,
  Factory,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { cn } from "./ui/utils.tsx";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "./ui/dropdown-menu.tsx";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "stock",
    label: "Stock Management",
    icon: Package,
    subItems: [
      { id: "fabric-stock", label: "Fabric Stock", icon: Package },
      { id: "cut-stock", label: "Cut Stock", icon: Layers },
      { id: "finished-stock", label: "Finished Stock", icon: Package },
      { id: "sales", label: "Sales & Invoicing", icon: DollarSign, disabled: true },
      { id: "label-stock", label: "Label Stock", icon: Layers },
    ]
  },
  { id: "orders", label: "Orders & Booking", icon: BookOpen },
  { id: "cutting", label: "Cutting Floor", icon: Scissors },
  { id: "processing", label: "Production Floor", icon: ArrowRight },
  { id: "fabricator", label: "Fabricator", icon: Factory },
  { id: "items-master", label: "Items Master", icon: Shirt },
  { id: "articles", label: "Articles", icon: Layers },
  { id: "clients", label: "Clients", icon: Users },
  { id: "employees", label: "Employees", icon: UserCircle },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(
    navItems.find(item => item.id === "stock")?.subItems?.some(sub => sub.id === currentPage) || false
  );

  return (
    <div className={cn(
      "bg-[#1a1a2e] text-white h-full flex flex-col relative transition-[width] duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-[#e94560] text-white p-1 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Logo */}
      <div className={cn("p-6 border-b border-white/10 overflow-hidden transition-[padding,width] duration-300", isCollapsed && "px-4")}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#e94560] flex items-center justify-center flex-shrink-0">
            <Factory className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-xl font-bold text-white whitespace-nowrap">TH Garments</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isStockParent = item.id === "stock";
          const isChildActive = isStockParent && item.subItems?.some(sub => sub.id === currentPage);
          const isActive = currentPage === item.id || isChildActive;
          const isDisabled = (item as any).disabled;

          if (isStockParent) {
            if (isCollapsed) {
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center justify-center py-2.5 rounded-lg transition-all",
                        isActive
                          ? "bg-[#e94560] text-white shadow-lg"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="bg-[#1a1a2e] border-white/10 text-white min-w-[180px]">
                    <DropdownMenuLabel className="text-white/50 text-xs px-2 py-1.5 uppercase tracking-widest">{item.label}</DropdownMenuLabel>
                    {item.subItems?.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = currentPage === sub.id;
                      const isSubDisabled = (sub as any).disabled;
                      return (
                        <DropdownMenuItem
                          key={sub.id}
                          disabled={isSubDisabled}
                          onClick={() => onNavigate(sub.id)}
                          className={cn(
                            "flex items-center gap-3 px-2 py-2 cursor-pointer transition-all",
                            isSubActive ? "bg-[#e94560] text-white" : "text-white/70 hover:bg-white/10 focus:bg-white/10 focus:text-white"
                          )}
                        >
                          <SubIcon className="w-4 h-4" />
                          <span className="text-sm">{sub.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => setIsStockOpen(!isStockOpen)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all",
                    isActive && !isStockOpen
                      ? "bg-[#e94560] text-white shadow-lg"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm animate-in fade-in duration-300 whitespace-nowrap">{item.label}</span>
                  </div>
                  {isStockOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isStockOpen && (
                  <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {item.subItems?.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = currentPage === sub.id;
                      const isSubDisabled = (sub as any).disabled;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => !isSubDisabled && onNavigate(sub.id)}
                          disabled={isSubDisabled}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all",
                            isSubActive
                              ? "bg-[#e94560] text-white shadow-md font-medium"
                              : "text-white/50 hover:bg-white/5 hover:text-white",
                            isSubDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/50"
                          )}
                        >
                          <SubIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onNavigate(item.id)}
              disabled={isDisabled}
              title={isCollapsed ? item.label : ""}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all",
                isActive
                  ? "bg-[#e94560] text-white shadow-lg"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
                isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/70",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm animate-in fade-in duration-300 whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
