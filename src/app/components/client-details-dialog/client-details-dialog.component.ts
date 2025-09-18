import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Client } from '../../models/client.model';
import { ClientService } from '../../services/client.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';

type DocumentType = 'gst_document' | 'bank_statement' | string;

interface DocumentInfo {
  type: string;
  url: string;
  name: string;
}

// Extend the Client interface to include dynamic properties
interface ClientWithDynamicProperties extends Client {
  [key: string]: any;
  legal_business_name?: string;
  constitution_type?: string;
  number_of_partners?: number;
  has_business_pan?: string;
  business_pan?: string;
  ie_code?: string;
  website?: string;
  bank_name?: string;
  bank_account?: string;
  account_number?: string;
  ifsc_code?: string;
  account_type?: string;
  new_current_account?: string;
  total_credit_amount?: number;
  average_monthly_balance?: number;
  business_address?: string;
  optional_mobile_number?: string;
}

@Component({
  selector: 'app-client-details-dialog',
  templateUrl: './client-details-dialog.component.html',
  styleUrls: ['./client-details-dialog.component.scss']
})
export class ClientDetailsDialogComponent implements OnInit {
  client: ClientWithDynamicProperties = {} as ClientWithDynamicProperties;
  loading = false;

  clientSections: { title: string; fields: { label: string; value: any; type?: string }[] }[] = [];

  constructor(
    public dialogRef: MatDialogRef<ClientDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { client: Client },
    private clientService: ClientService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar
  ) {
    if (data?.client) {
      this.client = data.client;
      this.initializeClientSections();
    }
  }

  ngOnInit(): void {}

  // Check if personal information exists
  hasPersonalInfo(): boolean {
    return !!(this.client.legal_name || this.client.email || 
             this.client.mobile_number || this.client['optional_mobile_number'] || this.client.date_of_birth || this.client.gender ||
             this.client.address || this.client.district || this.client.state || this.client.pincode);
  }

  // Check if business information exists
  hasBusinessInfo(): boolean {
    return !!(this.client.business_name || this.client['legal_business_name'] || 
             this.client.business_type || this.client['constitution_type'] || 
             this.client['has_business_pan'] || this.client['number_of_partners'] !== undefined || this.client['business_pan'] || 
             this.client['ie_code'] || this.client['website'] || 
             this.client['business_address']);
  }

  // Check if banking information exists
  hasBankingInfo(): boolean {
    return !!(this.client['bank_name'] || this.client['account_number'] || 
             this.client['ifsc_code'] || this.client['account_type'] !== undefined || 
             this.client['new_current_account']);
  }

  // Get appropriate icon for document type
  getDocumentIcon(docType: string): string {
    switch(docType) {
      case 'gst_document':
        return 'receipt';
      case 'bank_statement':
        return 'account_balance';
      case 'business_pan_document':
      case 'owner_pan_document':
        return 'credit_card';
      case 'aadhaar_card':
      case 'owner_aadhaar_document':
        return 'badge';
      case 'partnership_deed_document':
        return 'description';
      default:
        return 'insert_drive_file';
    }
  }

  // Format date for display
  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  }

  // Helper method to check if a value exists
  hasValue(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  // Format address from multiple fields
  formatAddress(): string {
    const parts = [
      this.client.address,
      this.client.district,
      this.client.state,
      this.client.pincode
    ].filter(part => this.hasValue(part));
    
    return parts.join(', ');
  }

  private initializeClientSections(): void {
    console.log('Initializing client sections with client:', this.client);
    this.clientSections = [
      {
        title: 'Personal Information',
        fields: [
          { label: 'Legal Name', value: this.client['legal_name'] || 'Not provided' },
          { label: 'Email', value: this.client['email'] || 'Not provided' },
          { label: 'Mobile Number', value: this.client.mobile_number || 'Not provided' },
          { label: 'Optional Mobile', value: this.client['optional_mobile_number'] || 'Not provided' },
          { 
            label: 'Date of Birth', 
            value: this.client.date_of_birth ? this.formatDate(this.client.date_of_birth) : 'Not provided' 
          },
          { label: 'Gender', value: this.client.gender || 'Not provided' },
          { label: 'Address', value: this.client.address || 'Not provided' },
          { label: 'District', value: this.client.district || 'Not provided' },
          { label: 'State', value: this.client.state || 'Not provided' },
          { label: 'Pincode', value: this.client.pincode || 'Not provided' }
        ]
      },
      {
        title: 'Business Information',
        fields: [
          { label: 'Business Name', value: this.client['business_name'] || 'Not provided' },
          { label: 'Legal Business Name', value: this.client['legal_business_name'] || 'Not provided' },
          { label: 'Business Type', value: this.client['business_type'] || 'Not provided' },
          { label: 'Constitution Type', value: this.client['constitution_type'] || 'Not provided' },
          { label: 'Has Business PAN', value: this.client['has_business_pan'] || 'Not provided' },
          { label: 'Number of Partners', value: this.client['number_of_partners'] || 'Not provided' },
          { label: 'Business PAN', value: this.client['business_pan'] || 'Not provided' },
          { label: 'IE Code', value: this.client['ie_code'] || 'Not provided' },
          { label: 'Website', value: this.client['website'] || 'Not provided' },
          { label: 'Business Address', value: this.client['business_address'] || 'Not provided' }
        ]
      },
      {
        title: 'Banking Information',
        fields: [
          { label: 'Bank Name', value: this.client['bank_name'] || 'Not provided' },
          { label: 'Account Number', value: this.client['account_number'] || 'Not provided' },
          { label: 'IFSC Code', value: this.client['ifsc_code'] || 'Not provided' },
          { label: 'Account Type', value: this.client['account_type'] || 'Not provided' },
          { 
            label: 'New Current Account', 
            value: this.client['new_current_account'] || 'Not provided' 
          }
        ]
      },
      {
        title: 'Loan Information',
        fields: [
          { 
            label: 'Required Loan Amount', 
            value: this.client['required_loan_amount'] ? '₹' + this.client['required_loan_amount'] : 'Not provided' 
          },
          { label: 'Loan Purpose', value: this.client['loan_purpose'] || 'Not provided' },
          { label: 'Repayment Period', value: this.client['repayment_period'] || 'Not provided' },
          { 
            label: 'Monthly Income', 
            value: this.client['monthly_income'] ? '₹' + this.client['monthly_income'] : 'Not provided' 
          },
          { label: 'Existing Loans', value: this.client['existing_loans'] || 'None' },
          { label: 'Transaction Done by Client', value: this.client['transaction_done_by_client'] || '0' },
          { label: 'Gateway', value: this.client['gateway'] || 'Not specified' }
        ]
      },
      {
        title: 'Staff Information',
        fields: [
          { label: 'Staff Name', value: this.client['staff_name'] || 'Not assigned' },
          { label: 'Staff Email', value: this.client['staff_email'] || 'Not available' },
          { label: 'Staff ID', value: this.client['staff_id'] || 'Not available' }
        ]
      },
      {
        title: 'Status Information',
        fields: [
          { 
            label: 'Status', 
            value: this.client.status ? this.client.status.replace('_', ' ').toUpperCase() : 'N/A',
            type: 'status'
          },
          { label: 'Feedback', value: this.client.feedback || 'No feedback provided' },
          { 
            label: 'Created At', 
            value: this.client.created_at ? this.formatDate(this.client.created_at) : 'N/A' 
          },
          { 
            label: 'Last Updated', 
            value: this.client.updated_at ? this.formatDate(this.client.updated_at) : 'N/A' 
          }
        ]
      }
    ];
  }

  hasDocuments(): boolean {
    return !!(this.client.documents && 
             (this.client.documents.gst_document || this.client.documents.bank_statement || 
              (Object.keys(this.client.documents).filter(k => !['gst_document', 'bank_statement'].includes(k)).length > 0)));
  }

  getAdditionalDocuments(): DocumentInfo[] {
    if (!this.client.documents) return [];
    
    return Object.entries(this.client.documents)
      .filter(([key]) => key !== 'gst_document' && key !== 'bank_statement')
      .map(([key, value]) => ({
        name: this.formatDocumentName(key),
        type: 'other' as DocumentType,
        url: value as string
      }));
  }

  formatDocumentName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  previewDocument(type: string, url?: string): void {
    event?.preventDefault();
    const documentUrl = url || this.getDocumentUrl(type);
    
    if (!documentUrl) {
      this.snackBar.open('Document not available for preview', 'Close', { duration: 3000 });
      return;
    }

    // Handle data URLs
    if (documentUrl.startsWith('data:')) {
      const matches = documentUrl.match(/^data:(.*?)(;base64)?,/);
      const mimeType = matches ? matches[1] : 'application/octet-stream';
      
      // Create a blob from the data URL
      const byteString = atob(documentUrl.split(',')[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const intArray = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([intArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new tab based on mime type
      if (mimeType.startsWith('image/')) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Image Preview</title>
                <style>
                  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
                  img { max-width: 90%; max-height: 90%; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${blobUrl}" onload="URL.revokeObjectURL('${blobUrl}')" />
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else if (mimeType === 'application/pdf') {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>PDF Preview</title>
                <style>
                  body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                  embed { width: 100%; height: 100vh; border: none; }
                </style>
              </head>
              <body>
                <embed src="${blobUrl}" type="${mimeType}" onload="URL.revokeObjectURL('${blobUrl}')" />
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        // For unsupported preview types, download the file
        this.downloadDataUrl(documentUrl, type);
      }
    } else {
      // Handle direct URLs
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.location.href = documentUrl;
      }
    }
  }

  downloadDocument(type: string, url?: string): void {
    const documentUrl = url || this.getDocumentUrl(type);
    if (!documentUrl) {
      this.snackBar.open('Document not available for download', 'Close', {
        duration: 3000
      });
      return;
    }

    if (!this.client._id) {
      this.snackBar.open('Client ID is missing', 'Close', { duration: 3000 });
      return;
    }

    if (documentUrl.startsWith('data:')) {
      this.downloadDataUrl(documentUrl, type);
    } else {
      // Use the client's _id and document type for the download
      this.clientService.downloadDocument(this.client._id, type).subscribe({
        next: (blob: Blob) => {
          const objectUrl = window.URL.createObjectURL(blob);
          this.downloadFile(objectUrl, type);
          setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
        },
        error: (error: any) => {
          console.error('Error downloading file:', error);
          this.snackBar.open('Error downloading file', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  private getDocumentUrl(type: string): string | undefined {
    if (!this.client.documents) return undefined;
    return this.client.documents[type as keyof typeof this.client.documents] as string;
  }

  private downloadFile(url: string, type: string): void {
    if (url.startsWith('data:')) {
      this.downloadDataUrl(url, type);
      return;
    }

    // For server URLs, use the client service to ensure proper authentication
    if ((url.startsWith('/') || url.startsWith(window.location.origin)) && this.client._id) {
      const filename = this.getDownloadFilename(type, url);
      this.clientService.downloadDocument(this.client._id, type).subscribe({
        next: (blob: Blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        },
        error: (error) => {
          console.error('Error downloading file:', error);
          this.snackBar.open('Error downloading file. Please try again.', 'Close', { duration: 5000 });
        }
      });
    } else {
      // For external URLs, use standard download
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getDownloadFilename(type, url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private downloadDataUrl(dataUrl: string, type: string): void {
    try {
      // Handle data URL
      const matches = dataUrl.match(/^data:(.*?)(;base64)?,(.*)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      
      const mimeType = matches[1];
      const isBase64 = !!matches[2];
      const data = matches[3];
      
      // Convert data URL to blob
      const byteCharacters = isBase64 ? atob(data) : decodeURIComponent(data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create object URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = this.getDownloadFilename(type, dataUrl);
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Error processing data URL:', error);
      this.snackBar.open('Error processing document. Please try again.', 'Close', { duration: 5000 });
    }
  }

  private getDownloadFilename(type: string, url?: string): string {
    const prefix = this.client['legal_business_name'] || this.client['user_name'] || 'document';
    const sanitizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Default extension based on document type
    const extensionMap: {[key: string]: string} = {
      'gst_document': 'pdf',
      'bank_statement': 'pdf',
      'aadhar_card': 'jpg',
      'pan_card': 'jpg',
      'business_pan_document': 'jpg',
      'owner_pan_document': 'jpg',
      'owner_aadhaar_document': 'jpg',
      'partnership_deed_document': 'pdf'
    };
    
    let extension = extensionMap[type] || 'bin';
    
    // Try to get extension from URL or MIME type if available
    if (url) {
      if (url.startsWith('data:')) {
        // Extract from data URL
        const mimeMatch = url.match(/^data:(\w+\/\w+);/);
        if (mimeMatch) {
          const mimeType = mimeMatch[1];
          const mimeExtension = mimeType.split('/')[1];
          if (mimeExtension) {
            extension = mimeExtension;
          }
        }
      } else {
        // Extract from URL path
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const lastDot = pathname.lastIndexOf('.');
          if (lastDot > 0) {
            const urlExtension = pathname.substring(lastDot + 1).toLowerCase();
            // Only use the extension if it's a common file type
            if (/^(pdf|jpg|jpeg|png|gif|bmp|doc|docx|xls|xlsx|txt)$/i.test(urlExtension)) {
              extension = urlExtension;
            }
          }
        } catch (e) {
          console.warn('Invalid URL for extension detection:', url);
        }
      }
    }
    
    // Map document types to friendly names
    const typeMap: {[key: string]: string} = {
      'gst_document': 'gst-certificate',
      'bank_statement': 'bank-statement',
      'aadhar_card': 'aadhar-card',
      'pan_card': 'pan-card',
      'business_pan_document': 'business-pan',
      'owner_pan_document': 'owner-pan',
      'owner_aadhaar_document': 'owner-aadhaar',
      'partnership_deed_document': 'partnership-deed'
    };
    
    const friendlyType = typeMap[type] || type;
    return `${sanitizedPrefix}-${friendlyType}.${extension}`;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getStatusColor(status: string | undefined): string {
    if (!status) return '#9e9e9e';
    switch (status.toLowerCase()) {
      case 'active': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'rejected': return '#f44336';
      case 'inactive': return '#9e9e9e';
      default: return '#2196f3';
    }
  }

  hasDocument(type: string): boolean {
    return !!this.client.documents?.[type as keyof typeof this.client.documents];
  }

  getDocumentTypes(): string[] {
    return this.client.documents ? Object.keys(this.client.documents) : [];
  }

  getDocumentName(type: string): string {
    switch (type) {
      case 'gst_document': return 'GST Document';
      case 'bank_statement': return 'Bank Statement';
      case 'business_pan_document': return 'Business PAN Document';
      case 'partnership_deed_document': return 'Partnership Deed';
      case 'owner_pan_document': return 'Owner PAN Document';
      case 'owner_aadhaar_document': return 'Owner Aadhaar Document';
      default: return type.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  private handleDocumentError(error: any): void {
    console.error('Error with document operation:', error);
    this.snackBar.open('An error occurred. Please try again.', 'Close', {
      duration: 5000
    });
  }
}
