import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'new_client' | 'update' | 'system' | 'client_updated' | 'status_changed';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  clientId?: string;
  clientName?: string;
  changedBy?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  
  constructor() {
    this.loadNotifications();
  }

  getNotifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };
    
    this.notifications.unshift(newNotification);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
    
    // Play notification sound
    this.playNotificationSound();
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
  }

  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.notificationsSubject.next([]);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  private loadNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        this.notifications = JSON.parse(saved);
        // Convert string dates back to Date objects
        this.notifications = this.notifications.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notificationsSubject.next([...this.notifications]);
      } catch (e) {
        console.error('Error loading notifications', e);
        this.notifications = [];
      }
    }
  }

  // Clear notifications for current user only
  clearAllForUser(userId: string, userRole: string) {
    // Store the current user's lastVisit timestamp to filter out their notifications
    const now = new Date().toISOString();
    const lastVisitKey = `lastVisit_${userRole}_${userId}`;
    localStorage.setItem(lastVisitKey, now);
    
    // Don't actually remove notifications from localStorage
    // The filtering will be handled by the component based on lastVisit timestamp
    this.notificationsSubject.next([...this.notifications]);
  }

  private playNotificationSound() {
    const audio = new Audio('assets/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(e => console.warn('Could not play notification sound', e));
  }

  // Helper methods for common notification types
  notifyNewClient(clientName: string, clientId: string) {
    this.addNotification({
      type: 'new_client',
      title: 'New Client Added',
      message: `A new client "${clientName}" has been added`,
      data: { clientId }
    });
  }

  notifyClientUpdate(clientName: string, clientId: string, updateType: string) {
    this.addNotification({
      type: 'update',
      title: 'Client Updated',
      message: `Client "${clientName}" has been ${updateType}`,
      data: { clientId }
    });
  }

  notifyStatusChange(clientName: string, clientId: string, newStatus: string, adminName: string) {
    this.addNotification({
      type: 'status_changed',
      title: 'Status Updated',
      message: `Client "${clientName}" status changed to ${newStatus} by ${adminName}`,
      data: { clientId, status: newStatus, changedBy: adminName }
    });
  }

  notifyAdminAction(actionType: string, clientName: string, clientId: string, adminName: string, details?: string) {
    this.addNotification({
      type: 'system',
      title: `Admin Action: ${actionType}`,
      message: `${adminName} ${actionType.toLowerCase()} client "${clientName}"${details ? ': ' + details : ''}`,
      data: { clientId, actionType, adminName }
    });
  }

  // Clear individual notification
  clearNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
  }
}
