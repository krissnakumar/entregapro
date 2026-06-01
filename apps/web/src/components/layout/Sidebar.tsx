import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { navigation } from './navigation';
import { ShieldCheck, ChevronDown, Menu, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ isOpen, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-30 h-screen bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
          isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0",
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className={cn("flex items-center gap-2.5", !isOpen && "lg:justify-center lg:w-full")}>
            <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0">
              <ShieldCheck size={20} />
            </div>
            {(isOpen || window.innerWidth >= 1024) && (
              <div className={cn("flex-col", !isOpen && "lg:hidden")}>
                <h2 className="text-xs font-bold text-slate-900 leading-none">EntregaPRO</h2>
                <span className="text-[8px] font-bold text-indigo-600 tracking-widest">SAAS</span>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 lg:flex hidden cursor-pointer"
          >
            {isOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navigation.map((group) => {
            const isExpanded = expandedGroups.includes(group.title);
            const hasActiveChild = group.items.some(
              item => item.path && location.pathname === item.path
            );

            return (
              <div key={group.title}>
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors",
                    hasActiveChild ? "text-indigo-600" : "text-slate-400 hover:text-slate-600",
                    !isOpen && "lg:justify-center"
                  )}
                >
                  {isOpen && <span className="truncate">{group.title}</span>}
                  <ChevronDown
                    size={12}
                    className={cn(
                      "transition-transform ml-auto shrink-0",
                      isExpanded && "rotate-180",
                      !isOpen && "lg:hidden"
                    )}
                  />
                </button>

                {(isExpanded || hasActiveChild) && (
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.path!}
                          onClick={onMobileClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                            !isOpen && "lg:justify-center lg:px-2"
                          )}
                        >
                          <Icon size={18} className={cn("shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
                          {isOpen && <span className="truncate">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
