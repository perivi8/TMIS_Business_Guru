import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService, User } from './auth.service';
import { NotificationService } from './notification.service';

export interface Client {
  _id: string;
  user_name: string;
  legal_name?: string;
  trade_name?: string;
  mobile_number: string;
  email: string;
  user_email?: string;
  company_email?: string;
  optional_mobile_number?: string;
  business_name: string;
  legal_business_name?: string;
  district: string;
  state?: string;
  pincode?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  constitution_type?: string;
  number_of_partners?: number;
  has_business_pan?: string;
  business_pan: string;
  gst_number?: string;
  ie_code: string;
  new_current_account: string;
  website: string;
  business_url?: string;
  business_address?: string;
  gateway: string;
  transaction_done_by_client: number;
  required_loan_amount: number;
  loan_purpose?: string;
  repayment_period?: string;
  monthly_income?: number;
  existing_loans?: string;
  bank_account: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_type?: string;
  total_credit_amount?: number;
  average_monthly_balance?: number;
  transaction_months?: number;
  new_business_account?: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  bank_type: string;
  gst_status: string;
  business_type: string;
  
  // GST Details
  registration_number?: string;
  gst_legal_name?: string;
  gst_trade_name?: string;
  
  // Business PAN Details
  business_pan_name?: string;
  business_pan_date?: string;
  
  // Owner Details
  owner_name?: string;
  owner_dob?: string;
  
  // Partner Details (for Partnership constitution)
  partner_name_0?: string;
  partner_dob_0?: string;
  partner_name_1?: string;
  partner_dob_1?: string;
  partner_name_2?: string;
  partner_dob_2?: string;
  partner_name_3?: string;
  partner_dob_3?: string;
  partner_name_4?: string;
  partner_dob_4?: string;
  partner_name_5?: string;
  partner_dob_5?: string;
  partner_name_6?: string;
  partner_dob_6?: string;
  partner_name_7?: string;
  partner_dob_7?: string;
  partner_name_8?: string;
  partner_dob_8?: string;
  partner_name_9?: string;
  partner_dob_9?: string;
  documents?: {
    gst_document?: string;
    bank_statement?: string;
    [key: string]: any;
  };
  processed_documents?: {
    [key: string]: {
      file_name: string;
      file_size: number;
      file_path: string;
      download_url: string;
    };
  };
  extracted_data: any;
  status?: string;
  feedback: string;
  created_at?: string;
  updated_at: string;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService implements OnDestroy {
  private clientsSubject = new BehaviorSubject<Client[]>([]);
  private currentUser: User | null = null;
  private userSubscription: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { 
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getFormHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  createClient(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/clients`, formData, {
      headers: this.getFormHeaders(),
      withCredentials: true
    });
  }

  getClients(): Observable<{ clients: Client[] }> {
    console.log('=== CLIENT SERVICE DEBUG ===');
    console.log('Fetching clients...');
    console.log('API URL:', environment.apiUrl);
    console.log('Is authenticated:', this.authService.isAuthenticated());
    console.log('Current user:', this.authService.currentUserValue);
    console.log('Token exists:', !!this.authService.getToken());
    
    const headers = this.getHeaders();
    console.log('Headers being sent:', headers);
    
    const fullUrl = `${environment.apiUrl}/clients`;
    console.log('Full request URL:', fullUrl);
    
    return this.http.get<{ clients: Client[] }>(fullUrl, {
      headers: headers,
      withCredentials: true
    }).pipe(
      tap({
        next: (response) => {
          console.log('=== SUCCESS RESPONSE ===');
          console.log('Clients received:', response);
          console.log('Response type:', typeof response);
          console.log('Has clients property:', 'clients' in response);
          console.log('Clients count:', response.clients?.length || 0);
          
          if (response.clients) {
            this.clientsSubject.next(response.clients);
          }
        },
        error: (error) => {
          console.error('=== ERROR RESPONSE ===');
          console.error('Error in getClients:', {
            error: error,
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url,
            headers: error.headers,
            body: error.error
          });
        }
      }),
      catchError(error => {
        console.error('=== CATCH ERROR ===');
        console.error('Error fetching clients:', {
          error: error,
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          errorBody: error.error
        });
        
        let errorMessage = 'Failed to load clients. Please try again later.';
        
        if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view clients.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.notificationService.showError(errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  updateClientStatus(clientId: string, status: string, feedback: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/clients/${clientId}`, {
      status,
      feedback
    }, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response && response.client) {
          const clientName = response.client.legal_name || response.client.user_name || 'Unknown Client';
          const currentUserName = this.currentUser?.username || 'Admin';
          
          // If admin is updating status, send specific notification
          if (this.authService.isAdmin()) {
            this.notificationService.notifyStatusChange(clientName, clientId, status, currentUserName);
          }
        }
      })
    );
  }

  async updateClientDetails(clientId: string, formData: FormData): Promise<any> {
    try {
      console.log('Starting client update for ID:', clientId);
      
      // Get the current client data before update
      const currentClient = await this.getClientDetails(clientId).toPromise();
      console.log('Current client data:', currentClient);
      
      // Log form data being sent
      console.log('Form data being sent:');
      for (let pair of (formData as any).entries()) {
        console.log(pair[0], pair[1]);
      }
      
      // Perform the update
      const url = `${environment.apiUrl}/clients/${clientId}/update`;
      console.log('Sending request to:', url);
      
      const response = await this.http.put(url, formData, { 
        headers: {
          'Authorization': `Bearer ${this.authService.getToken()}`
          // Don't set Content-Type, let the browser set it with the correct boundary
        },
        withCredentials: true
      }).toPromise();
      
      console.log('Update response:', response);

      // Get the updated client data
      const updatedClient = await this.getClientDetails(clientId).toPromise();
      console.log('Updated client data:', updatedClient);
      
      // Find changes
      if (currentClient && updatedClient && currentClient.client && updatedClient.client) {
        const changes = this.findChanges(currentClient.client, updatedClient.client);
        console.log('Detected changes:', changes);
        
        // If there are changes, create a notification
        if (changes.length > 0 && this.currentUser) {
          console.log('Creating notification for changes');
          this.notificationService.addNotification({
            type: 'client_updated',
            title: 'Client Updated',
            message: `Client ${updatedClient.client.legal_name || updatedClient.client.user_name} was updated`,
            clientId,
            clientName: updatedClient.client.legal_name || updatedClient.client.user_name,
            changedBy: this.currentUser.username,
            changes
          });
        }
      }
      
      return response;
    } catch (error: any) {
      console.error('Error updating client:', error);
      if (error?.error) {
        console.error('Error details:', error.error);
      }
      throw error;
    }
  }

  private findChanges(oldClient: Client, newClient: Client): {field: string, oldValue: any, newValue: any}[] {
    const changes: {field: string, oldValue: any, newValue: any}[] = [];
    const fieldsToTrack = [
      'legal_name', 'trade_name', 'mobile_number', 'email', 
      'business_name', 'gst_number', 'status', 'business_pan'
    ] as const;

    fieldsToTrack.forEach((field: keyof Client) => {
      if (oldClient[field] !== newClient[field]) {
        changes.push({
          field,
          oldValue: oldClient[field],
          newValue: newClient[field]
        });
      }
    });

    return changes;
  }

  updateClient(clientId: string, clientData: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/clients/${clientId}`, clientData, {
      headers: this.getFormHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response && response.client) {
          const clientName = response.client.legal_name || response.client.user_name || 'Unknown Client';
          const currentUserName = this.currentUser?.username || 'Admin';
          
          // Notify about client update
          this.notificationService.notifyClientUpdate(clientName, clientId, 'updated');
          
          // If admin is updating, notify users about admin action
          if (this.authService.isAdmin()) {
            this.notificationService.notifyAdminAction('Updated', clientName, clientId, currentUserName);
          }
        }
      })
    );
  }

  updateClientDetailsJson(clientId: string, data: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/clients/${clientId}/update`, data, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response && response.client) {
          const clientName = response.client.legal_name || response.client.user_name || 'Unknown Client';
          const currentUserName = this.currentUser?.username || 'Admin';
          
          // If admin is updating status, send specific notification
          if (this.authService.isAdmin() && data.status) {
            this.notificationService.notifyStatusChange(clientName, clientId, data.status, currentUserName);
          }
        }
      })
    );
  }

  getClientDetails(clientId: string): Observable<{ client: Client }> {
    return this.http.get<{ client: Client }>(`${environment.apiUrl}/clients/${clientId}`, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  downloadDocument(clientId: string, documentType: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/clients/${clientId}/download/${documentType}`, {
      headers: this.getFormHeaders(),
      responseType: 'blob',
      withCredentials: true
    });
  }

  downloadDocumentDirect(clientId: string, documentType: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/clients/${clientId}/download-direct/${documentType}`, {
      headers: this.getFormHeaders(),
      responseType: 'blob',
      withCredentials: true
    });
  }

  downloadDocumentRaw(clientId: string, documentType: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/clients/${clientId}/download-raw/${documentType}`, {
      headers: this.getFormHeaders(),
      responseType: 'blob',
      withCredentials: true
    });
  }

  deleteClient(clientId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/clients/${clientId}`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response && response.client) {
          const clientName = response.client.legal_name || response.client.user_name || 'Unknown Client';
          const currentUserName = this.currentUser?.username || 'Admin';
          
          // Notify about client deletion
          if (this.authService.isAdmin()) {
            this.notificationService.notifyAdminAction('Deleted', clientName, clientId, currentUserName);
          }
        }
      })
    );
  }
}
