import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { ClientDetailsDialogComponent } from '../client-details-dialog/client-details-dialog.component';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  users: User[] = [];
  uniqueStaffMembers: any[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  statusFilter = 'all';
  staffFilter = 'all';
  sortBy = 'newest';
  applyNewClientsFilter: Date | null = null;
  applyUpdatedClientsFilter: Date | null = null;
  updatingClientId: string | null = null;
  
  displayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'created', 'actions'];
  userDisplayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'created', 'actions'];
  adminDisplayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'created', 'actions'];

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.handleQueryParams();
    this.loadClients();
    this.loadUsers();
  }

  handleQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['sortBy']) {
        this.sortBy = params['sortBy'];
      }
      if (params['filter']) {
        // Handle special filters from admin dashboard
        if (params['filter'] === 'new') {
          this.filterNewClients();
        } else if (params['filter'] === 'updated') {
          this.filterUpdatedClients();
        }
      }
    });
  }

  filterNewClients(): void {
    const lastAdminVisit = localStorage.getItem('lastAdminVisit');
    if (lastAdminVisit) {
      const lastVisitDate = new Date(lastAdminVisit);
      // This will be applied after clients are loaded
      this.applyNewClientsFilter = lastVisitDate;
    }
  }

  filterUpdatedClients(): void {
    const lastAdminVisit = localStorage.getItem('lastAdminVisit');
    if (lastAdminVisit) {
      const lastVisitDate = new Date(lastAdminVisit);
      // This will be applied after clients are loaded
      this.applyUpdatedClientsFilter = lastVisitDate;
    }
  }

  loadClients(): void {
    console.log('=== FRONTEND CLIENT LOADING DEBUG ===');
    console.log('Starting client load process...');
    
    this.loading = true;
    this.error = '';
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        console.log('Client service response received:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response || {}));
        
        if (response && response.clients) {
          console.log('Clients array found:', response.clients);
          console.log('Number of clients:', response.clients.length);
          
          this.clients = response.clients;
          
          // Log first few clients for debugging
          if (response.clients.length > 0) {
            console.log('First client sample:', response.clients[0]);
            response.clients.slice(0, 3).forEach((client, index) => {
              console.log(`Client ${index + 1}:`, {
                id: client._id,
                name: client.legal_name || client.user_name,
                status: client.status,
                created_at: client.created_at
              });
            });
          } else {
            console.log('No clients found in response');
          }
          
          this.applySpecialFilters();
          this.applyFilters();
          console.log('Filtered clients count:', this.filteredClients.length);
        } else {
          console.log('No clients property in response or response is null');
          this.clients = [];
          this.filteredClients = [];
        }
        
        this.loading = false;
        console.log('Client loading completed successfully');
      },
      error: (error) => {
        console.error('=== CLIENT LOADING ERROR ===');
        console.error('Error object:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        
        if (error.status === 401) {
          this.error = 'Authentication failed. Please login again.';
          console.log('Authentication error - redirecting to login may be needed');
        } else if (error.status === 0) {
          this.error = 'Cannot connect to server. Please check if the backend is running.';
          console.log('Connection error - backend server may be down');
        } else if (error.status >= 500) {
          this.error = 'Server error. Please try again later.';
          console.log('Server error - check backend logs');
        } else {
          this.error = error.error?.message || error.message || 'Failed to load clients';
        }
        
        this.clients = [];
        this.filteredClients = [];
        this.loading = false;
        console.log('Client loading failed with error:', this.error);
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response) => {
        console.log('Users loaded successfully:', response);
        this.users = response.users || [];
        this.getUniqueStaffMembers();
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        // Fallback: extract staff from client data
        this.users = [];
        this.getUniqueStaffMembers();
      }
    });
  }

  applySpecialFilters(): void {
    if (this.applyNewClientsFilter) {
      this.clients = this.clients.filter(client => {
        if (!client.created_at) return false;
        const createdAt = new Date(client.created_at);
        return createdAt > this.applyNewClientsFilter!;
      });
    }

    if (this.applyUpdatedClientsFilter) {
      this.clients = this.clients.filter(client => {
        if (!client.updated_at || !client.created_at) return false;
        const updatedAt = new Date(client.updated_at);
        const createdAt = new Date(client.created_at);
        return updatedAt > createdAt && updatedAt > this.applyUpdatedClientsFilter!;
      });
    }
  }

  applyFilters(): void {
    this.filteredClients = this.clients.filter(client => {
      const matchesSearch = (client.legal_name || client.user_name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (client.trade_name || client.business_name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (client.mobile_number || '').includes(this.searchTerm);
      
      const matchesStatus = this.statusFilter === 'all' || client.status === this.statusFilter;
      
      const matchesStaff = this.staffFilter === 'all' || client.staff_email === this.staffFilter;
      
      return matchesSearch && matchesStatus && matchesStaff;
    });
    
    this.applySorting();
  }

  applySorting(): void {
    this.filteredClients.sort((a, b) => {
      switch (this.sortBy) {
        case 'newest':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        case 'oldest':
          const dateOldA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateOldB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateOldA - dateOldB;
        case 'name_asc':
          const nameA = (a.legal_name || a.user_name || '').toLowerCase();
          const nameB = (b.legal_name || b.user_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        case 'name_desc':
          const nameDescA = (a.legal_name || a.user_name || '').toLowerCase();
          const nameDescB = (b.legal_name || b.user_name || '').toLowerCase();
          return nameDescB.localeCompare(nameDescA);
        default:
          return 0;
      }
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  onStaffFilterChange(): void {
    this.applyFilters();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'interested': return '#4caf50';
      case 'not_interested': return '#f44336';
      case 'hold': return '#ff9800';
      case 'pending': return '#9c27b0';
      case 'processing': return '#2196f3';
      default: return '#666';
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getDisplayedColumns(): string[] {
    return this.isAdmin() ? this.adminDisplayedColumns : this.userDisplayedColumns;
  }

  getSerialNumber(index: number): number {
    return index + 1;
  }

  editClient(client: Client): void {
    this.router.navigate(['/clients', client._id, 'edit']);
  }

  openWhatsApp(client: Client): void {
    const mobileNumber = client.mobile_number;
    if (mobileNumber) {
      const whatsappUrl = `https://wa.me/${mobileNumber.replace(/[^0-9]/g, '')}`;
      window.open(whatsappUrl, '_blank');
    } else {
      this.snackBar.open('No mobile number available for this client', 'Close', {
        duration: 3000
      });
    }
  }

  updateClientStatus(client: Client, status: string): void {
    const feedback = prompt(`Enter feedback for ${client.legal_name || client.user_name}:`);
    if (feedback !== null) {
      // Set loading state for this specific client
      this.updatingClientId = client._id;
      
      this.clientService.updateClientStatus(client._id, status, feedback).subscribe({
        next: () => {
          client.status = status;
          client.feedback = feedback;
          this.updatingClientId = null; // Clear loading state
          this.snackBar.open('Client status updated successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.updatingClientId = null; // Clear loading state on error
          this.snackBar.open('Failed to update client status', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  deleteClient(client: Client): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { name: client.legal_name || client.user_name || 'this client' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.clientService.deleteClient(client._id).subscribe({
          next: () => {
            this.clients = this.clients.filter(c => c._id !== client._id);
            this.filteredClients = this.filteredClients.filter(c => c._id !== client._id);
            this.snackBar.open('Client deleted successfully', 'Close', {
              duration: 3000
            });
          },
          error: (error) => {
            this.snackBar.open('Failed to delete client', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  downloadDocument(client: Client, documentType: string): void {
    this.clientService.downloadDocument(client._id, documentType).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${client.user_name}_${documentType}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.snackBar.open('Failed to download document', 'Close', {
          duration: 3000
        });
      }
    });
  }

  viewClientDetails(client: Client): void {
    // Navigate to client details page instead of opening dialog
    this.router.navigate(['/clients', client._id]);
  }

  getUniqueStaffMembers(): void {
    const staffMap = new Map();
    
    // Add staff from users array (from API)
    this.users.forEach(user => {
      if (user.email && user.email.startsWith('tmis.') && user.role === 'user') {
        staffMap.set(user.email, {
          email: user.email,
          name: user.username,
          source: 'users'
        });
      }
    });
    
    // Add staff from client records
    this.clients.forEach(client => {
      // Check staff_email field
      if (client.staff_email) {
        if (!staffMap.has(client.staff_email)) {
          staffMap.set(client.staff_email, {
            email: client.staff_email,
            name: client.staff_name || this.getNameFromEmail(client.staff_email),
            source: 'clients'
          });
        }
      }
      
      // Check created_by field
      if (client.created_by && client.created_by.includes('@')) {
        if (!staffMap.has(client.created_by)) {
          staffMap.set(client.created_by, {
            email: client.created_by,
            name: (client as any).created_by_name || this.getNameFromEmail(client.created_by),
            source: 'clients'
          });
        }
      }
    });
    
    // Convert map to array and sort
    this.uniqueStaffMembers = Array.from(staffMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    console.log('Unique staff members:', this.uniqueStaffMembers);
  }

  getNameFromEmail(email: string): string {
    if (!email) return 'Unknown';
    const username = email.split('@')[0];
    return username.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStaffNameFromFilter(staff: any): string {
    return staff.name || this.getNameFromEmail(staff.email);
  }

  getStaffNameFromEmail(email: string): string {
    const staff = this.uniqueStaffMembers.find(s => s.email === email);
    return staff ? staff.name : this.getNameFromEmail(email);
  }

  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.statusFilter !== 'all' || this.staffFilter !== 'all';
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.staffFilter = 'all';
    this.applyFilters();
  }

  getSelectedStaff(): any {
    return this.uniqueStaffMembers.find(s => s.email === this.staffFilter) || { name: 'Unknown' };
  }

  isClientUpdating(clientId: string): boolean {
    return this.updatingClientId === clientId;
  }
}
