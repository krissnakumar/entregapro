import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Bell, Check, Clock, Info, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-primary hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-card border rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <h3 className="font-bold text-sm">Notifications</h3>
              <button 
                onClick={() => markAllReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllReadMutation.isPending}
                className="text-[10px] uppercase font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Mark all as read
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {notifications?.length ? (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "p-4 border-b last:border-0 hover:bg-slate-50 transition-colors relative group",
                      !notif.isRead && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "mt-1 p-1.5 rounded-full shrink-0",
                        notif.isRead ? "bg-white text-slate-400 border border-slate-100" : "bg-primary/20 text-primary"
                      )}>
                        {notif.title.includes('Alert') ? <AlertCircle size={14} /> : <Info size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate pr-6">{notif.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                        <p className="text-[9px] text-muted-foreground flex items-center mt-2">
                          <Clock size={10} className="mr-1" />
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsReadMutation.mutate(notif.id)}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded"
                      >
                        <Check size={14} className="text-primary" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground italic text-sm">
                  No new notifications
                </div>
              )}
            </div>
            
            <div className="p-3 bg-white border-t text-center">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  navigate('/dashboard/reports');
                }}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                View All Activity
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsDropdown;
