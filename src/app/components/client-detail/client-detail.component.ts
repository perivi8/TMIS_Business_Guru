import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss']
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  loading = true;
  saving = false;
  error = '';
  isEditing = false;
  editableClient: Client | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.loadClientDetails(clientId);
    } else {
      this.error = 'Client ID not found';
      this.loading = false;
    }
  }

  loadClientDetails(clientId: string): void {
    this.clientService.getClientDetails(clientId).subscribe({
      next: (response) => {
        this.client = response.client;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load client details';
        this.loading = false;
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
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

  getClientProperty(property: string): any {
    if (!this.client) return null;
    
    // Use direct property access for fields that exist in Client interface
    switch (property) {
      case 'registration_number':
        return this.client.registration_number;
      case 'company_email':
        return this.client.company_email;
      case 'optional_mobile_number':
        return this.client.optional_mobile_number;
      case 'gst_number':
        return this.client.gst_number;
      case 'gst_status':
        return this.client.gst_status;
      default:
        // For dynamic fields that may not be in the interface, use type assertion
        return (this.client as any)[property];
    }
  }

  hasIEDocument(): boolean {
    if (!this.client || !this.client.processed_documents) return false;
    return !!(this.client.processed_documents['ie_code_document'] || 
              this.client.processed_documents['ie_code'] ||
              this.client.processed_documents['ie_document']);
  }

  getGSTStatus(): string {
    const gstStatus = this.getClientProperty('gst_status');
    const gstNumber = this.getClientProperty('gst_number');
    const registrationNumber = this.getClientProperty('registration_number');
    
    if (gstNumber || registrationNumber) {
      return gstStatus || 'Active';
    }
    return gstStatus || 'N/A';
  }

  getWebsiteURL(): string {
    const website = this.getClientProperty('website');
    if (!website) return 'N/A';
    
    // Add protocol if missing
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      return `https://${website}`;
    }
    return website;
  }

  getDocumentKeys(): string[] {
    if (!this.client || !this.client.processed_documents) return [];
    return Object.keys(this.client.processed_documents);
  }

  formatDocumentName(docType: string): string {
    return docType
      .split('_')
      .map(word => {
        // Handle special cases
        if (word.toLowerCase() === 'gst') return 'GST';
        if (word.toLowerCase() === 'pan') return 'PAN';
        if (word.toLowerCase() === 'msme') return 'MSME';
        if (word.toLowerCase() === 'ie') return 'IE';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  canPreviewDocument(fileName: string): boolean {
    const previewableExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.pdf'];
    return previewableExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  previewDocument(docType: string): void {
    if (!this.client || !this.client._id) return;
    
    this.clientService.downloadDocument(this.client._id, docType).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (error) => {
        this.snackBar.open('Error previewing document', 'Close', { duration: 3000 });
      }
    });
  }

  downloadDocument(docType: string): void {
    if (!this.client || !this.client._id) return;
    
    this.clientService.downloadDocument(this.client._id, docType).subscribe({
      next: (blob: Blob) => {
        // Create a blob URL for the file
        const fileURL = URL.createObjectURL(blob);
        
        // Create a temporary anchor element
        const link = document.createElement('a');
        link.href = fileURL;
        
        // Set the download attribute with the correct filename
        const fileName = this.client!.processed_documents?.[docType]?.file_name || `${docType}.pdf`;
        link.download = fileName;
        
        // Append to body, click and remove
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(fileURL);
        }, 100);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
        this.snackBar.open('Error downloading document. Please try again.', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  startEdit(): void {
    this.isEditing = true;
    this.editableClient = { ...this.client! };
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editableClient = null;
  }

  saveEdit(): void {
    if (!this.editableClient || !this.client) return;

    // Set saving state to true to show loading effect
    this.saving = true;

    // Create FormData for the update
    const formData = new FormData();
    
    // Add all the editable fields to FormData
    const fieldsToUpdate = [
      'legal_name', 'trade_name', 'user_name', 'user_email', 'company_email',
      'mobile_number', 'optional_mobile_number', 'address', 'district', 
      'state', 'pincode', 'business_name', 'constitution_type', 'gst_number',
      'gst_status', 'business_pan', 'ie_code', 'website', 'business_url',
      'required_loan_amount', 'loan_purpose', 'repayment_period', 
      'monthly_income', 'existing_loans', 'bank_name', 'account_number',
      'ifsc_code', 'account_type', 'bank_type', 'new_business_account',
      'gateway', 'transaction_done_by_client', 'total_credit_amount',
      'average_monthly_balance', 'transaction_months', 'new_current_account',
      'number_of_partners', 'registration_number', 'gst_legal_name',
      'gst_trade_name', 'business_pan_name', 'business_pan_date',
      'owner_name', 'owner_dob', 'status', 'feedback'
    ];

    // Add all form fields to FormData
    fieldsToUpdate.forEach(field => {
      const value = (this.editableClient as any)[field];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(field, value.toString());
      }
    });

    // Add partner fields for partnerships
    if (this.editableClient.constitution_type === 'Partnership') {
      for (let i = 0; i < 10; i++) {
        const nameField = `partner_name_${i}`;
        const dobField = `partner_dob_${i}`;
        
        const nameValue = (this.editableClient as any)[nameField];
        const dobValue = (this.editableClient as any)[dobField];
        
        if (nameValue) formData.append(nameField, nameValue);
        if (dobValue) formData.append(dobField, dobValue);
      }
    }

    // Use the updateClientDetails method which handles all fields
    this.clientService.updateClientDetails(this.client._id, formData)
      .then(() => {
        // Update the local client object with the new values
        Object.assign(this.client!, this.editableClient!);
        
        this.isEditing = false;
        this.editableClient = null;
        this.saving = false; // Reset saving state
        this.snackBar.open('Client updated successfully', 'Close', {
          duration: 3000
        });
        
        // Reload client details to ensure we have the latest data
        this.loadClientDetails(this.client!._id);
      })
      .catch((error) => {
        console.error('Error updating client:', error);
        this.saving = false; // Reset saving state on error
        this.snackBar.open('Failed to update client', 'Close', {
          duration: 3000
        });
      });
  }

  deleteClient(): void {
    if (!this.client) return;

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { name: this.client.legal_name || this.client.user_name || 'this client' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.client) {
        this.clientService.deleteClient(this.client._id).subscribe({
          next: () => {
            this.snackBar.open('Client deleted successfully', 'Close', {
              duration: 3000
            });
            this.router.navigate(['/clients']);
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

  goBack(): void {
    this.router.navigate(['/clients']);
  }

  getOwnerName(): string {
    return this.getClientProperty('owner_name');
  }

  getOwnerDob(): string {
    return this.getClientProperty('owner_dob');
  }

  getPartnersList(): any[] {
    if (!this.client || this.client.constitution_type !== 'Partnership') {
      return [];
    }
    
    const partners = [];
    const numberOfPartners = this.client.number_of_partners || 0;
    
    for (let i = 0; i < numberOfPartners; i++) {
      const partner = {
        name: (this.client as any)[`partner_${i}_name`] || '',
        dob: (this.client as any)[`partner_${i}_dob`] || ''
      };
      if (partner.name || partner.dob) {
        partners.push(partner);
      }
    }
    
    return partners;
  }

  formatNewCurrentAccount(): string {
    const value = this.getClientProperty('new_business_account');
    if (value === 'yes') return 'Yes';
    if (value === 'no') return 'No';
    return 'N/A';
  }

}
