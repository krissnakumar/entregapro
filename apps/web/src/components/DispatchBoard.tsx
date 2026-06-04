import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Package, Truck, User, Clock, Search, MapPin, AlertCircle, Zap } from 'lucide-react';
import { OrderStatus } from '@entregapro/shared-types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface DeliveryCardProps {
  id: string;
  customerName: string;
  customerAddress: string;
  status: OrderStatus;
  materialType: string;
  driverId: string | null;
}

const DeliveryCard = ({
  delivery,
  isDragging = false,
  isOverlay = false,
  dragHandlers = {},
  style = {},
}: {
  delivery: DeliveryCardProps;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandlers?: any;
  style?: React.CSSProperties;
}) => {
  const handleTriggerSmartAssign = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/deliveries/${delivery.id}/smart-assign`, {});
      toast.success(`Entrega #${delivery.id.split('-')[0]} atribuída com sucesso`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atribuir entrega');
    }
  };

  const isPending = delivery.status === 'PENDING';

  return (
    <div
      style={style}
      {...dragHandlers}
      className={cn(
        "bg-white p-4 rounded-xl shadow-sm border mb-3 transition-all relative overflow-hidden select-none",
        isOverlay 
          ? "cursor-grabbing shadow-2xl ring-2 ring-indigo-600/30 border-indigo-600 scale-[1.02] rotate-1 z-50" 
          : "cursor-grab active:cursor-grabbing hover:border-indigo-600/50",
        isDragging && "opacity-25 border-dashed border-slate-200 bg-slate-50/50 shadow-none",
        isPending && "border-l-4 border-l-amber-500"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black text-indigo-600 bg-indigo-600/5 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-600/10 font-mono">
          #{delivery.id.split('-')[0]}
        </span>
        <div className="flex items-center gap-1.5">
          {isPending && (
            <span className="text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
              Unassigned
            </span>
          )}
          <div className={cn(
            "w-2 h-2 rounded-full",
            delivery.status === 'DELIVERED' ? "bg-green-500" : 
            delivery.status === 'IN_TRANSIT' ? "bg-blue-500" : "bg-amber-500"
          )} />
        </div>
      </div>
      
      <h4 className="font-black text-xs text-slate-900 truncate tracking-tight">{delivery.customerName}</h4>
      <div className="flex items-center gap-1 mt-1 text-slate-500">
        <MapPin size={10} className="text-indigo-600/60 shrink-0" />
        <p className="text-[10px] font-medium truncate">{delivery.customerAddress}</p>
      </div>

      {isPending ? (
        <div className="mt-2.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleTriggerSmartAssign}
            className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 shadow-sm"
          >
            <Zap size={10} /> Smart Assign Match
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-2.5 pt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
          <span>{delivery.materialType}</span>
          <span className="text-slate-600 flex items-center gap-1">
            <Truck size={10} className="text-indigo-600" /> Active Route
          </span>
        </div>
      )}
    </div>
  );
};

const SortableDeliveryCard = ({ delivery }: { delivery: DeliveryCardProps }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: delivery.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DeliveryCard 
        delivery={delivery} 
        isDragging={isDragging} 
        dragHandlers={{ ...attributes, ...listeners }} 
      />
    </div>
  );
};

const Column = ({ id, title, deliveries, isUnassigned = false }: { id: string, title: string, deliveries: DeliveryCardProps[], isUnassigned?: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "bg-white rounded-2xl p-4 flex flex-col h-full min-w-[300px] border transition-all duration-200",
        isUnassigned ? "border-dashed border-slate-200 bg-slate-50/20" : "border-slate-100",
        isOver ? "border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-600/5 scale-[1.01]" : "hover:border-slate-200"
      )}
    >
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            isUnassigned ? "bg-muted text-muted-foreground" : "bg-indigo-600/10 text-indigo-600"
          )}>
            {isUnassigned ? <AlertCircle size={16} /> : <User size={16} />}
          </div>
          <h3 className="font-bold text-sm tracking-tight text-slate-800">{title}</h3>
        </div>
        <span className="bg-white text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-sm">
          {deliveries.length}
        </span>
      </div>
      <SortableContext id={id} items={deliveries.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[180px] flex flex-col">
          {deliveries.map((delivery) => (
            <SortableDeliveryCard key={delivery.id} delivery={delivery} />
          ))}
          {deliveries.length === 0 && (
            <div className="flex-1 min-h-[120px] rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
              <Package size={24} className="mb-2 text-slate-300/80" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Drop here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

import MapView from './MapView';

const DispatchBoard = () => {
  const queryClient = useQueryClient();
  const [boardView, setBoardView] = useState<'kanban' | 'map'>('kanban');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalContainer, setOriginalContainer] = useState<string | null>(null);
  
  const { data: orders } = useQuery({
    queryKey: ['active-dispatch'],
    queryFn: () => api.get<any[]>('/dispatch'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ deliveryId, status }: { deliveryId: string, status: OrderStatus }) => 
      api.patch(`/deliveries/${deliveryId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-dispatch'] });
      toast.success('Status updated successfully');
    }
  });

  const groupedItems = useMemo(() => {
    const grouped: Record<string, any[]> = {
      [OrderStatus.PENDING]: [],
      [OrderStatus.ASSIGNED]: [],
      [OrderStatus.LOADING]: [],
      [OrderStatus.IN_TRANSIT]: [],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    
    if (orders) {
      orders.forEach(order => {
        order.deliveries?.forEach((delivery: any) => {
          const status = delivery.status as string;
          if (grouped[status]) {
            grouped[status].push({
              ...delivery,
              customerName: order.customerName || delivery.customer?.name || 'Unknown',
              orderNumber: order.orderNumber
            });
          }
        });
      });
    }
    return grouped;
  }, [orders]);

  const [items, setItems] = useState<Record<string, any[]>>(groupedItems);

  useEffect(() => {
    setItems(groupedItems);
  }, [groupedItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string, currentItems: Record<string, any[]>) => {
    if (id in currentItems) return id;
    return Object.keys(currentItems).find((key) => currentItems[key].find((item: any) => item.id === id));
  };

  const activeDelivery = useMemo(() => {
    if (!activeId) return null;
    for (const col of Object.keys(items)) {
      const found = items[col].find(item => item.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, items]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id as string;
    setActiveId(activeIdStr);
    const container = findContainer(activeIdStr, items);
    setOriginalContainer(container || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr === overIdStr) return;

    const activeContainer = findContainer(activeIdStr, items);
    const overContainer = overIdStr in items ? overIdStr : findContainer(overIdStr, items);

    if (!activeContainer || !overContainer) return;

    if (activeContainer !== overContainer) {
      setItems((prev) => {
        const activeItems = prev[activeContainer];
        const overItems = prev[overContainer];
        const activeIndex = activeItems.findIndex((item) => item.id === activeIdStr);
        const overIndex = overItems.findIndex((item) => item.id === overIdStr);

        let newIndex;
        if (overIdStr in prev) {
          newIndex = overItems.length;
        } else {
          const isBelowLastItem = overIndex === overItems.length - 1;
          const modifier = isBelowLastItem ? 1 : 0;
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
        }

        const movedItem = { ...prev[activeContainer][activeIndex], status: overContainer };

        return {
          ...prev,
          [activeContainer]: prev[activeContainer].filter((item) => item.id !== activeIdStr),
          [overContainer]: [
            ...prev[overContainer].slice(0, newIndex),
            movedItem,
            ...prev[overContainer].slice(newIndex),
          ],
        };
      });
    } else {
      // Sorting in the same container
      setItems((prev) => {
        const activeItems = prev[activeContainer];
        const activeIndex = activeItems.findIndex((item) => item.id === activeIdStr);
        const overIndex = activeItems.findIndex((item) => item.id === overIdStr);

        if (activeIndex === overIndex) return prev;

        return {
          ...prev,
          [activeContainer]: arrayMove(activeItems, activeIndex, overIndex),
        };
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOriginalContainer(null);

    if (!over) {
      setItems(groupedItems);
      return;
    }

    const overContainer = over.id in items ? (over.id as string) : findContainer(over.id as string, items);

    if (originalContainer && overContainer) {
      if (originalContainer !== overContainer) {
        updateStatusMutation.mutate({ 
          deliveryId: active.id as string, 
          status: overContainer as OrderStatus 
        }, {
          onError: () => {
            setItems(groupedItems);
          }
        });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOriginalContainer(null);
    setItems(groupedItems);
  };

  const columns = [
    { id: OrderStatus.PENDING, title: 'Pending' },
    { id: OrderStatus.ASSIGNED, title: 'Assigned' },
    { id: OrderStatus.LOADING, title: 'Loading' },
    { id: OrderStatus.IN_TRANSIT, title: 'In Transit' },
    { id: OrderStatus.DELIVERED, title: 'Delivered' },
    { id: OrderStatus.CANCELLED, title: 'Cancelled' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by customer or address..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none w-80 transition-all text-sm"
            />
          </div>
          <div className="flex bg-white border shadow-sm rounded-xl p-1">
            <button 
              onClick={() => setBoardView('kanban')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                boardView === 'kanban' ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"
              )}
            >
              Board
            </button>
            <button 
              onClick={() => setBoardView('map')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                boardView === 'map' ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"
              )}
            >
              Map
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest">
           <div className="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
             Real-time Active
           </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {boardView === 'kanban' ? (
          <div className="flex h-full space-x-6 pb-6 overflow-x-auto custom-scrollbar items-stretch">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {columns.map(col => (
                <Column 
                  key={col.id}
                  id={col.id} 
                  title={col.title} 
                  deliveries={items[col.id] || []} 
                  isUnassigned={col.id === OrderStatus.PENDING}
                />
              ))}
              <DragOverlay adjustScale={false}>
                {activeDelivery ? (
                  <DeliveryCard delivery={activeDelivery} isOverlay />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          <div className="h-full rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm relative">
            <MapView />
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchBoard;

