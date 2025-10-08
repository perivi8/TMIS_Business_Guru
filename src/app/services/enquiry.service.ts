import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpBackend } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Enquiry } from '../models/enquiry.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnquiryService {
  private apiUrl = `${environment.apiUrl}/enquiries`;
  private enquiriesSubject = new BehaviorSubject<Enquiry[]>([]);
  public enquiries$ = this.enquiriesSubject.asObservable();
  private httpWithoutInterceptor: HttpClient;

  constructor(private http: HttpClient, private httpBackend: HttpBackend) {
    // Create HTTP client that bypasses interceptors
    this.httpWithoutInterceptor = new HttpClient(httpBackend);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllEnquiries(): Observable<Enquiry[]> {
    console.log('=== ENQUIRY SERVICE DEBUG ===');
    console.log('Fetching enquiries...');
    console.log('API URL:', this.apiUrl);
    
    const headers = this.getHeaders();
    console.log('Headers being sent:', headers);
    
    return this.http.get<any>(this.apiUrl, { 
      headers: headers,
      withCredentials: true 
    }).pipe(
      tap({
        next: (response) => {
          console.log('=== ENQUIRY SUCCESS RESPONSE ===');
          console.log('Enquiries received:', response);
          console.log('Response type:', typeof response);
          console.log('Is array:', Array.isArray(response));
          console.log('Has enquiries property:', 'enquiries' in response);
          
          if (Array.isArray(response)) {
            console.log('Direct array - Enquiries count:', response.length);
          } else if (response && response.enquiries) {
            console.log('Object with enquiries property - Enquiries count:', response.enquiries.length);
          } else {
            console.log('Unexpected response format');
          }
        },
        error: (error: any) => {
          console.error('=== ENQUIRY ERROR RESPONSE ===');
          console.error('Error in getAllEnquiries:', {
            error: error,
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url,
            body: error.error
          });
        }
      }),
      map((response: any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && response.enquiries && Array.isArray(response.enquiries)) {
          return response.enquiries;
        } else {
          console.warn('Unexpected enquiry response format, returning empty array');
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('=== ENQUIRY CATCH ERROR ===');
        console.error('Error fetching enquiries:', error);
        
        let errorMessage = 'Failed to load enquiries. Please try again later.';
        
        if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view enquiries.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  getEnquiryById(id: string): Observable<Enquiry> {
    return this.http.get<Enquiry>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createEnquiry(enquiry: Enquiry): Observable<Enquiry> {
    return this.http.post<Enquiry>(this.apiUrl, enquiry, { headers: this.getHeaders() });
  }

  updateEnquiry(id: string, enquiry: Partial<Enquiry>): Observable<Enquiry> {
    console.log(`Updating enquiry ${id} with data:`, enquiry);
    
    return this.http.put<Enquiry>(`${this.apiUrl}/${id}`, enquiry, { headers: this.getHeaders() }).pipe(
      tap(response => {
        console.log('Enquiry update successful:', response);
      }),
      catchError((error: any) => {
        console.error('Error updating enquiry:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          body: error.error
        });
        
        let errorMessage = 'Failed to update enquiry. Please try again later.';
        
        if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.status === 400) {
          errorMessage = error.error?.error || 'Invalid enquiry data. Please check all fields.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. You do not have permission to update this enquiry.';
        } else if (error.status === 404) {
          errorMessage = 'Enquiry not found. It may have been deleted.';
        } else if (error.status === 500) {
          // Provide more specific error message for 500 errors
          const serverError = error.error?.error || error.error?.message || 'Internal server error';
          errorMessage = `Server error: ${serverError}. Please try again later or contact support.`;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteEnquiry(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  refreshEnquiries(): void {
    this.getAllEnquiries().subscribe({
      next: (enquiries) => {
        this.enquiriesSubject.next(enquiries);
      },
      error: (error) => {
        console.error('Error loading enquiries:', error);
      }
    });
  }

  // WhatsApp Integration Methods
  testWhatsApp(testData: { mobile_number: string; wati_name: string; message_type: string }): Observable<any> {
    const whatsappUrl = `${environment.apiUrl}/whatsapp/test`;
    // Don't log to console to keep it clean
    return this.http.post<any>(whatsappUrl, testData, { headers: this.getHeaders() }).pipe(
      catchError((error: any) => {
        // Handle HTTP errors silently and return them as normal responses
        // This prevents browser console logging of HTTP errors
        if (error.status === 466 || 
            (error.error && error.error.error && error.error.error.includes('quota exceeded')) ||
            (error.error && error.error.error && error.error.error.includes('Monthly quota has been exceeded'))) {
          // Return quota exceeded as a successful observable to prevent console error
          return of({
            success: false,
            status_code: 466,
            quota_exceeded: true,
            error: error.error?.error || 'Quota exceeded',
            ...error.error
          });
        }
        // For other errors, return them as successful observables to prevent console logging
        return of({
          success: false,
          status_code: error.status || 500,
          error: error.error?.error || error.message || 'Unknown error',
          ...error.error
        });
      })
    );
  }

  // Unlimited WhatsApp test - bypasses quota restrictions for testing
  testWhatsAppUnlimited(testData: { mobile_number: string; wati_name: string; message_type: string }): Observable<any> {
    const whatsappUrl = `${environment.apiUrl}/whatsapp/test-unlimited`;
    return this.http.post<any>(whatsappUrl, testData, { headers: this.getHeaders() }).pipe(
      catchError((error: any) => {
        // Convert any errors to successful responses to prevent console logging
        return of({
          success: false,
          status_code: error.status || 500,
          error: error.error?.error || error.message || 'Test failed',
          ...error.error
        });
      })
    );
  }

  getWhatsAppTemplates(): Observable<any> {
    const templatesUrl = `${environment.apiUrl}/whatsapp/templates`;
    return this.http.get<any>(templatesUrl, { headers: this.getHeaders() });
  }

  // Check if mobile number already exists - public endpoint
  checkMobileExists(mobileNumber: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    const checkUrl = `${environment.apiUrl}/public/check-mobile`;
    
    return this.httpWithoutInterceptor.post<any>(checkUrl, { mobile_number: mobileNumber }, { headers }).pipe(
      catchError((error: any) => {
        console.error('Mobile check failed:', error);
        // Return a safe default response on error
        return of({
          exists: false,
          message: 'Unable to check mobile number',
          error: true
        });
      })
    );
  }

  // Public enquiry method - uses dedicated public endpoint
  createPublicEnquiry(enquiry: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Use the public endpoint that doesn't require authentication
    const publicUrl = `${environment.apiUrl}/public/enquiries`;
    
    console.log('Submitting to public endpoint:', publicUrl);
    console.log('Enquiry data:', enquiry);
    
    return this.httpWithoutInterceptor.post<any>(publicUrl, enquiry, { headers }).pipe(
      tap(response => {
        console.log('Public enquiry submitted successfully:', response);
      }),
      catchError((error: any) => {
        console.error('Public enquiry submission failed:', error);
        
        let errorMessage = 'Failed to submit enquiry. Please try again.';
        
        if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.status === 400) {
          errorMessage = error.error?.error || 'Invalid enquiry data. Please check all fields.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
