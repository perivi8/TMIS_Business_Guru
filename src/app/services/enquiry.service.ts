import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Enquiry } from '../models/enquiry.interface';

@Injectable({
  providedIn: 'root'
})
export class EnquiryService {
  private apiUrl = 'http://localhost:5000/api/enquiries';
  private enquiriesSubject = new BehaviorSubject<Enquiry[]>([]);
  public enquiries$ = this.enquiriesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllEnquiries(): Observable<Enquiry[]> {
    return this.http.get<Enquiry[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getEnquiryById(id: string): Observable<Enquiry> {
    return this.http.get<Enquiry>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createEnquiry(enquiry: Enquiry): Observable<Enquiry> {
    return this.http.post<Enquiry>(this.apiUrl, enquiry, { headers: this.getHeaders() });
  }

  updateEnquiry(id: string, enquiry: Partial<Enquiry>): Observable<Enquiry> {
    return this.http.put<Enquiry>(`${this.apiUrl}/${id}`, enquiry, { headers: this.getHeaders() });
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
}
