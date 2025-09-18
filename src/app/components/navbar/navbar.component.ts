import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('notificationPanel') notificationPanel!: ElementRef;
  
  currentUser: User | null = null;
  showNotifications = false;
  notifications: Notification[] = [];
  clients: Client[] = [];
  lastVisit: Date | null = null;
  private notificationSubscription: Subscription | null = null;
  private clientSubscription: Subscription | null = null;
  hasUnreadNotifications = false;
  lastNotificationCount = 0;
  isLoadingNotifications = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    console.log('=== NAVBAR INIT DEBUG ===');
    console.log('Initial token check:', localStorage.getItem('token'));
    console.log('Initial user check:', localStorage.getItem('currentUser'));
    
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('Auth service user subscription:', user);
      console.log('Is admin check:', this.authService.isAdmin());
      
      if (user && this.authService.isAdmin()) {
        console.log('Admin user detected, loading clients...');
        this.loadClients();
        this.setupAutoRefresh();
      } else {
        console.log('Not admin or no user, skipping client load');
      }
    });
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.clientSubscription) {
      this.clientSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.isLoadingNotifications = true;
    this.notificationSubscription = this.notificationService.getNotifications().subscribe(
      notifications => {
        this.notifications = notifications;
        this.hasUnreadNotifications = this.notifications.some(n => !n.read);
        this.isLoadingNotifications = false;
      },
      error => {
        console.error('Error loading notifications', error);
        this.isLoadingNotifications = false;
      }
    );
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAllNotifications(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const lastVisitKey = `lastVisit_${userRole}_${this.currentUser?.id || 'default'}`;
    localStorage.setItem(lastVisitKey, now);
    this.lastVisit = new Date(now);
    
    this.notificationService.clearAll();
    
    this.snackBar.open('All notifications cleared', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
    
    this.closeNotifications();
  }

  getNotificationCount(): number {
    if (this.isAdmin()) {
      return this.notifications.filter(n => !n.read).length + 
             this.getNewClients().length + 
             this.getUpdatedClients().length;
    } else {
      return this.notifications.filter(n => !n.read).length + 
             this.getNewClients().length + 
             this.getUpdatedClients().length + 
             this.getAdminStatusChanges().length;
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'new_client':
        return 'person_add';
      case 'update':
        return 'update';
      case 'system':
        return 'notifications';
      default:
        return 'notifications_none';
    }
  }

  getNotificationClass(type: string): string {
    switch (type) {
      case 'new_client':
        return 'new-client';
      case 'update':
        return 'update';
      case 'system':
        return 'system';
      default:
        return '';
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.data?.clientId) {
      this.router.navigate(['/clients', notification.data.clientId]);
    }
    this.toggleNotifications();
  }

  private setupAutoRefresh(): void {
    // Initial load
    this.loadClients();
    
    // Set up auto-refresh every 30 seconds
    this.notificationSubscription = interval(30000).subscribe(() => {
      const previousCount = this.getNotificationCount();
      this.loadClients(() => {
        const newCount = this.getNotificationCount();
        if (newCount > previousCount) {
          this.hasUnreadNotifications = true;
          this.lastNotificationCount = newCount - previousCount;
        }
      });
    });
  }

  initializeLastVisit(): void {
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const lastVisitKey = `lastVisit_${userRole}_${this.currentUser?.id || 'default'}`;
    const lastVisit = localStorage.getItem(lastVisitKey);
    
    if (lastVisit) {
      this.lastVisit = new Date(lastVisit);
    } else {
      // Set to 24 hours ago for first time users
      this.lastVisit = new Date(Date.now() - 24 * 60 * 60 * 1000);
      localStorage.setItem(lastVisitKey, this.lastVisit.toISOString());
    }
  }

  loadClients(callback?: () => void): void {
    console.log('=== NAVBAR LOAD CLIENTS DEBUG ===');
    console.log('Token in localStorage:', localStorage.getItem('token'));
    console.log('User in localStorage:', localStorage.getItem('currentUser'));
    console.log('Is authenticated:', this.authService.isAuthenticated());
    console.log('Is admin:', this.authService.isAdmin());
    console.log('Current user value:', this.authService.currentUserValue);
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        this.clients = response.clients;
        if (callback) callback();
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        if (callback) callback();
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  hasNewUpdates(): boolean {
    if (this.isAdmin()) {
      return this.getNewClients().length > 0 || this.getUpdatedClients().length > 0;
    } else {
      return this.getNewClients().length > 0 || this.getUpdatedClients().length > 0 || this.getAdminStatusChanges().length > 0;
    }
  }


  getNewClients(): Client[] {
    if (!this.lastVisit) return [];
    
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      return createdAt > this.lastVisit!;
    }).sort((a, b) => {
      const dateA = new Date(a.created_at!).getTime();
      const dateB = new Date(b.created_at!).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, 10); // Increased limit to show more items
  }

  getUpdatedClients(): Client[] {
    if (!this.lastVisit) return [];
    
    return this.clients.filter(client => {
      if (!client.updated_at || !client.created_at) return false;
      const updatedAt = new Date(client.updated_at);
      const createdAt = new Date(client.created_at);
      
      // Skip if this is a new client (handled by getNewClients)
      if (Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000) {
        return false;
      }
      
      // For admins, show all updates
      if (this.isAdmin()) {
        return updatedAt > this.lastVisit!;
      } else {
        // For regular users, only show their own updates (not admin updates)
        return updatedAt > this.lastVisit! && 
               client.updated_by_name === this.currentUser?.username;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.updated_at!).getTime();
      const dateB = new Date(b.updated_at!).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, 10); // Increased limit to show more items
  }

  // Get admin status changes for regular users
  getAdminStatusChanges(): Client[] {
    if (!this.lastVisit || this.isAdmin()) return [];
    
    return this.clients.filter(client => {
      if (!client.updated_at || !client.updated_by_name || !client.status) return false;
      const updatedAt = new Date(client.updated_at);
      
      // Show status changes made by admins after the user's last visit
      return updatedAt > this.lastVisit! && 
             client.updated_by_name !== this.currentUser?.username;
    }).sort((a, b) => {
      const dateA = new Date(a.updated_at!).getTime();
      const dateB = new Date(b.updated_at!).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, 5);
  }

  getTimeAgo(dateString: string | undefined): string {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  toggleNotifications(): void {
    // Navigate to notifications page instead of showing dropdown
    this.router.navigate(['/notifications']);
  }

  private updateLastVisit(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const lastVisitKey = `lastVisit_${userRole}_${this.currentUser?.id || 'default'}`;
    localStorage.setItem(lastVisitKey, now);
    this.lastVisit = new Date(now);
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
