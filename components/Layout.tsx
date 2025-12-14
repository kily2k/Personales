import React from 'react';
import { LayoutDashboard, Package, ChefHat, ShoppingCart, CalendarDays, Users, FileText, Database, Sparkles } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex flex-col items-center justify-center min-w-[70px] p-2 transition-colors shrink-0 ${
      active 
        ? 'text-indigo-600 bg-indigo-50 lg:bg-transparent lg:border-r-4 lg:border-indigo-600' 
        : 'text-slate-500 hover:text-slate-800'
    } lg:flex-row lg:justify-start lg:w-full lg:px-6 lg:py-4 lg:gap-3 lg:shrink-1`}
  >
    <Icon size={24} className={active ? 'fill-current opacity-20' : ''} />
    <span className="text-[10px] mt-1 lg:text-sm lg:mt-0 font-medium truncate w-full text-center lg:text-left">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col h-screen bg-slate-50 lg:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-full">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800">Pastelería<span className="text-indigo-600">PRO</span></h1>
          <p className="text-xs text-slate-500 mt-1">Gestión Integral v1.2</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Operativo</div>
          <NavItem id="dashboard" label="Resumen" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={onTabChange} />
          <NavItem id="orders" label="Pedidos" icon={ShoppingCart} active={activeTab === 'orders'} onClick={onTabChange} />
          <NavItem id="production" label="Producción" icon={CalendarDays} active={activeTab === 'production'} onClick={onTabChange} />
          <NavItem id="inventory" label="Inventario" icon={Package} active={activeTab === 'inventory'} onClick={onTabChange} />
          <NavItem id="recipes" label="Recetas" icon={ChefHat} active={activeTab === 'recipes'} onClick={onTabChange} />
          <NavItem id="ai-assistant" label="Chef IA" icon={Sparkles} active={activeTab === 'ai-assistant'} onClick={onTabChange} />
          
          <div className="mt-4 px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gestión</div>
          <NavItem id="customers" label="Clientes" icon={Users} active={activeTab === 'customers'} onClick={onTabChange} />
          <NavItem id="reports" label="Reportes" icon={FileText} active={activeTab === 'reports'} onClick={onTabChange} />
          <NavItem id="database" label="Base de Datos" icon={Database} active={activeTab === 'database'} onClick={onTabChange} />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 relative print:pb-0 print:overflow-visible">
        <div className="max-w-5xl mx-auto p-4 md:p-8 print:p-0 print:max-w-none">
          {children}
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center z-50 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
        <div className="flex w-full px-2">
           <NavItem id="dashboard" label="Inicio" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={onTabChange} />
           <NavItem id="orders" label="Pedidos" icon={ShoppingCart} active={activeTab === 'orders'} onClick={onTabChange} />
           <NavItem id="production" label="Prod." icon={CalendarDays} active={activeTab === 'production'} onClick={onTabChange} />
           <NavItem id="inventory" label="Inv." icon={Package} active={activeTab === 'inventory'} onClick={onTabChange} />
           <NavItem id="ai-assistant" label="Chef IA" icon={Sparkles} active={activeTab === 'ai-assistant'} onClick={onTabChange} />
           <NavItem id="recipes" label="Recetas" icon={ChefHat} active={activeTab === 'recipes'} onClick={onTabChange} />
        </div>
      </nav>
    </div>
  );
};