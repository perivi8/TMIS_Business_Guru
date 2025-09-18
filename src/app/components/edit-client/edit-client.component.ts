import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-edit-client',
  templateUrl: './edit-client.component.html',
  styleUrls: ['./edit-client.component.scss']
})
export class EditClientComponent implements OnInit {
  clientForm: FormGroup;
  clientId: string;
  client: Client | null = null;
  loading = false;
  saving = false;
  documents: { [key: string]: File } = {};
  existingDocuments: { [key: string]: any } = {};
  deletedDocuments: string[] = []; // New property to track deleted documents
  bankStatementsCount = 1;
  businessImagesCount = 1;
  has_business_pan = false;
  documentTypes = [
    'gst_document',
    'pan_document',
    'bank_statement',
    'address_proof',
    'photo',
    'signature',
    'msme_certificate',
    'udyam_certificate',
    'ie_code_document'
  ];

  partnerNames: string[] = [];
  partnerDobs: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.clientId = this.route.snapshot.paramMap.get('id') || '';
    this.clientForm = this.initForm();
  }

  ngOnInit(): void {
    this.loadClientDetails();
    
    // Initialize partner arrays
    for (let i = 0; i < 10; i++) {
      this.partnerNames[i] = '';
      this.partnerDobs[i] = '';
    }
  }

  private initForm(): FormGroup {
    const form = this.fb.group({
      // Personal Information
      legal_name: [''],
      trade_name: [''],
      user_name: [''],
      user_email: ['', Validators.email],
      company_email: ['', Validators.email],
      mobile_number: ['', Validators.pattern('^[0-9]{10}$')],
      optional_mobile_number: ['', Validators.pattern('^[0-9]{10}$')],
      
      // Address Information
      address: [''],
      district: [''],
      state: [''],
      pincode: ['', Validators.pattern('^[0-9]{6}$')],
      business_address: [''],
      
      // Business Information
      business_name: [''],
      business_type: [''],
      constitution_type: [''],
      has_business_pan: [''],
      gst_number: [''],
      gst_status: [''],
      business_pan: ['', Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')],
      ie_code: [''],
      ie_code_status: [''],
      website: ['', Validators.pattern('https?://.+')],
      business_url: [''],
      
      // Financial Information
      required_loan_amount: [0, Validators.min(0)],
      loan_purpose: [''],
      repayment_period: [''],
      monthly_income: [0, Validators.min(0)],
      existing_loans: [''],
      
      // Bank Information
      bank_name: [''],
      account_number: [''],
      ifsc_code: ['', Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')],
      account_type: [''],
      bank_type: [''],
      new_current_account: [''],
      gateway: [''],
      transaction_done_by_client: [0, Validators.min(0)],
      total_credit_amount: [0, Validators.min(0)],
      average_monthly_balance: [0, Validators.min(0)],
      transaction_months: [1, Validators.min(1)],
      new_business_account: [''],
      
      // Partnership Information
      number_of_partners: [0, Validators.min(0)],
      
      // GST Details
      registration_number: [''],
      gst_legal_name: [''],
      gst_trade_name: [''],
      
      // Business PAN Details
      business_pan_name: [''],
      business_pan_date: [''],
      
      // Owner Details
      owner_name: [''],
      owner_dob: ['']
    });

    // Initialize partner form controls
    this.initializePartnerControls(form);
    
    return form;
  }

  private initializePartnerControls(form: FormGroup): void {
    console.log('initializePartnerControls called');
    // Initialize form controls for up to 10 partners
    for (let i = 0; i < 10; i++) {
      const nameControl = `partner_name_${i}`;
      const dobControl = `partner_dob_${i}`;
      form.addControl(nameControl, this.fb.control(''));
      form.addControl(dobControl, this.fb.control(''));
      console.log(`Added form controls: ${nameControl}, ${dobControl}`);
    }
    console.log('All partner controls initialized. Form controls:', Object.keys(form.controls));
  }

  private loadClientDetails(): void {
    this.loading = true;
    this.clientService.getClientDetails(this.clientId).subscribe({
      next: (response) => {
        this.client = response.client;
        console.log('Client response:', response);
        console.log('Client processed_documents:', response.client.processed_documents);
        this.existingDocuments = response.client.processed_documents || {};
        console.log('existingDocuments set to:', this.existingDocuments);
        console.log('existingDocuments keys:', Object.keys(this.existingDocuments));
        
        // Check for partner-specific document keys
        console.log('Checking for partner document keys:');
        for (let i = 0; i < 10; i++) {
          const aadharKey = `partner_aadhar_${i}`;
          const panKey = `partner_pan_${i}`;
          console.log(`${aadharKey}:`, this.existingDocuments[aadharKey]);
          console.log(`${panKey}:`, this.existingDocuments[panKey]);
        }
        
        // Check for alternative key patterns
        console.log('Checking for alternative document key patterns:');
        Object.keys(this.existingDocuments).forEach(key => {
          if (key.includes('partner') || key.includes('aadhar') || key.includes('pan')) {
            console.log(`Found partner-related document key: ${key}`, this.existingDocuments[key]);
          }
        });
        
        // Also check the client object for partner document references
        console.log('Checking client object for partner document references:');
        Object.keys(response.client).forEach(key => {
          if (key.includes('partner') && (key.includes('aadhar') || key.includes('pan'))) {
            console.log(`Found partner document reference in client: ${key}`, (response.client as any)[key]);
          }
        });
        this.populateForm(response.client);
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Error loading client details', 'Close', { duration: 3000 });
        this.loading = false;
        this.router.navigate(['/clients']);
      }
    });
  }

  private populateForm(client: Client): void {
    console.log('Client data:', client);
    console.log('Website value:', client.website);
    
    // Determine Business PAN status based on existing documents and constitution type
    const hasBusinessPanDocument = this.hasExistingDocument('business_pan_document');
    const isPrivateLimited = client.constitution_type === 'Private Limited';
    const hasBusinessPan = isPrivateLimited ? 'yes' : (client.has_business_pan || (hasBusinessPanDocument ? 'yes' : ''));
    
    // Set IE Code status based on document existence
    const ieCodeStatus = this.getIECodeDocument() ? 'Yes' : 'No';
    
    this.clientForm.patchValue({
      legal_name: client.legal_name || '',
      trade_name: client.trade_name || '',
      user_name: client.user_name || '',
      user_email: client.user_email || client.email || '',
      company_email: client.company_email || '',
      mobile_number: client.mobile_number || '',
      optional_mobile_number: client.optional_mobile_number || '',
      address: client.address || '',
      district: client.district || '',
      state: client.state || '',
      pincode: client.pincode || '',
      business_address: client.business_address || '',
      business_name: client.business_name || '',
      business_type: client.business_type || '',
      constitution_type: client.constitution_type || '',
      has_business_pan: hasBusinessPan,
      gst_number: client.gst_number || '',
      gst_status: client.gst_status || '',
      business_pan: client.business_pan || '',
      ie_code: client.ie_code || '',
      ie_code_status: ieCodeStatus,
      website: client.website || '',
      business_url: client.business_url || '',
      required_loan_amount: client.required_loan_amount || 0,
      loan_purpose: client.loan_purpose || '',
      repayment_period: client.repayment_period || '',
      monthly_income: client.monthly_income || 0,
      existing_loans: client.existing_loans || '',
      bank_name: client.bank_name || '',
      account_number: client.account_number || '',
      ifsc_code: client.ifsc_code || '',
      account_type: client.account_type || '',
      bank_type: client.bank_type || '',
      new_current_account: client.new_current_account || '',
      gateway: client.gateway || '',
      transaction_done_by_client: client.transaction_done_by_client || 0,
      total_credit_amount: client.total_credit_amount || 0,
      average_monthly_balance: client.average_monthly_balance || 0,
      transaction_months: client.transaction_months || 1,
      new_business_account: client.new_business_account || '',
      number_of_partners: client.number_of_partners || 0,
      
      // GST Details - Fixed field mapping
      registration_number: client.registration_number || '',
      gst_legal_name: client.gst_legal_name || '',
      gst_trade_name: client.gst_trade_name || '',
      
      // Business PAN Details
      business_pan_name: client.business_pan_name || '',
      business_pan_date: client.business_pan_date || '',
      
      // Owner Details
      owner_name: client.owner_name || '',
      owner_dob: client.owner_dob || ''
    });
    
    // Use timeout to ensure form is fully initialized before populating partner data
    setTimeout(() => {
      this.ensurePartnerControlsExist();
      this.populatePartnerData(client);
      // Trigger change detection to ensure view updates
      this.cdr.detectChanges();
    }, 100);
    
    console.log('Form value after patch:', this.clientForm.value);
    console.log('Website form control value:', this.clientForm.get('website')?.value);
    console.log('Constitution type:', this.clientForm.get('constitution_type')?.value);
    console.log('Number of partners:', this.clientForm.get('number_of_partners')?.value);
    console.log('Should Partnership section show:', this.clientForm.get('constitution_type')?.value === 'Partnership');
    
    // Debug the specific fields that are having issues
    console.log('=== DEBUGGING FIELD MAPPING ===');
    console.log('Client registration_number:', client.registration_number);
    console.log('Client company_email:', client.company_email);
    console.log('Client optional_mobile_number:', client.optional_mobile_number);
    console.log('Form registration_number:', this.clientForm.get('registration_number')?.value);
    console.log('Form company_email:', this.clientForm.get('company_email')?.value);
    console.log('Form optional_mobile_number:', this.clientForm.get('optional_mobile_number')?.value);
    console.log('=== END DEBUGGING ===');
  }

  private populatePartnerData(client: Client): void {
    console.log('Populating partner data for client:', client);
    console.log('Client keys:', Object.keys(client));
    
    // Log all partner-related fields
    console.log('Checking partner fields:');
    for (let i = 0; i < 10; i++) {
      const nameField = `partner_name_${i}`;
      const dobField = `partner_dob_${i}`;
      const nameValue = (client as any)[nameField];
      const dobValue = (client as any)[dobField];
      console.log(`${nameField}:`, nameValue, `${dobField}:`, dobValue);
      
      // Populate the arrays
      this.partnerNames[i] = nameValue || '';
      this.partnerDobs[i] = dobValue || '';
    }
    
    // Also check for alternative field names that might be used in the backend
    console.log('Checking for alternative partner field names:');
    const partnerKeys = Object.keys(client).filter(key => key.includes('partner'));
    console.log('All partner-related keys:', partnerKeys);
    
    // Populate partner data for up to 10 partners
    const patchData: any = {};
    for (let i = 0; i < 10; i++) {
      // Try multiple possible field name patterns
      const possibleNameFields = [
        `partner_name_${i}`,
        `partner${i}_name`,
        `partner_name${i}`,
        `partner_${i}_name`
      ];
      
      const possibleDobFields = [
        `partner_dob_${i}`,
        `partner${i}_dob`,
        `partner_dob${i}`,
        `partner_${i}_dob`
      ];
      
      // Find the first available field name pattern
      let partnerName = '';
      for (const field of possibleNameFields) {
        if ((client as any)[field]) {
          partnerName = (client as any)[field];
          console.log(`Found partner name using field: ${field} = ${partnerName}`);
          break;
        }
      }
      
      let partnerDob = '';
      for (const field of possibleDobFields) {
        if ((client as any)[field]) {
          partnerDob = (client as any)[field];
          console.log(`Found partner DOB using field: ${field} = ${partnerDob}`);
          break;
        }
      }
      
      console.log(`Partner ${i}: Name=${partnerName}, DOB=${partnerDob}`);
      
      patchData[`partner_name_${i}`] = partnerName;
      patchData[`partner_dob_${i}`] = partnerDob;
    }
    
    // Apply all partner data at once
    this.clientForm.patchValue(patchData);
    console.log('Patched all partner data:', patchData);
    
    // Force form update and change detection
    this.clientForm.updateValueAndValidity();
    
    // Trigger change detection to ensure form controls update in view
    this.cdr.detectChanges();
    
    // Additional timeout to ensure Angular processes the changes
    setTimeout(() => {
      this.cdr.detectChanges();
      
      // Verify the data was set correctly
      console.log('Verifying partner data in form after timeout:');
      for (let i = 0; i < 10; i++) {
        const nameControl = this.clientForm.get(`partner_name_${i}`);
        const dobControl = this.clientForm.get(`partner_dob_${i}`);
        console.log(`Partner ${i} - Name control:`, nameControl?.value, 'DOB control:', dobControl?.value);
      }
      
      // Debug form controls
      this.debugPartnerFormControls();
    }, 50);
    
    // Log the array values
    console.log('Partner arrays populated:');
    console.log('partnerNames:', this.partnerNames);
    console.log('partnerDobs:', this.partnerDobs);
  }

  // Debug method to check partner form controls
  debugPartnerFormControls(): void {
    console.log('=== DEBUGGING PARTNER FORM CONTROLS ===');
    console.log('All form controls:', Object.keys(this.clientForm.controls));
    
    for (let i = 0; i < 10; i++) {
      const nameControlName = `partner_name_${i}`;
      const dobControlName = `partner_dob_${i}`;
      
      const nameControl = this.clientForm.get(nameControlName);
      const dobControl = this.clientForm.get(dobControlName);
      
      console.log(`Partner ${i}:`);
      console.log(`  - ${nameControlName} exists:`, !!nameControl, 'value:', nameControl?.value);
      console.log(`  - ${dobControlName} exists:`, !!dobControl, 'value:', dobControl?.value);
    }
    console.log('=== END DEBUGGING ===');
  }

  // Method to ensure partner controls exist
  private ensurePartnerControlsExist(): void {
    console.log('=== ENSURING PARTNER CONTROLS EXIST ===');
    
    for (let i = 0; i < 10; i++) {
      const nameControlName = `partner_name_${i}`;
      const dobControlName = `partner_dob_${i}`;
      
      // Check if controls exist, if not create them
      if (!this.clientForm.get(nameControlName)) {
        console.log(`Creating missing control: ${nameControlName}`);
        this.clientForm.addControl(nameControlName, this.fb.control(''));
      }
      
      if (!this.clientForm.get(dobControlName)) {
        console.log(`Creating missing control: ${dobControlName}`);
        this.clientForm.addControl(dobControlName, this.fb.control(''));
      }
    }
    
    console.log('All partner controls verified/created');
    console.log('=== END ENSURING CONTROLS ===');
  }

  // Helper method to get partner control names
  getPartnerControlName(type: 'name' | 'dob', index: number): string {
    const controlName = `partner_${type}_${index}`;
    console.log(`getPartnerControlName called - type: ${type}, index: ${index}, controlName: ${controlName}`);
    
    // Ensure the control exists
    if (!this.clientForm.get(controlName)) {
      console.warn(`Form control ${controlName} does not exist, creating it...`);
      this.clientForm.addControl(controlName, this.fb.control(''));
    }
    
    const control = this.clientForm.get(controlName);
    console.log(`Form control exists:`, !!control, 'Value:', control?.value);
    
    return controlName;
  }

  // Helper method to create array for partner iteration
  getPartnerArray(): number[] {
    const numPartners = this.clientForm.get('number_of_partners')?.value || 0;
    const constitutionType = this.clientForm.get('constitution_type')?.value;
    
    console.log('getPartnerArray called - number_of_partners:', numPartners);
    console.log('Constitution type:', constitutionType);
    console.log('Form value:', this.clientForm.value);
    
    // Check if we have actual partner data
    let actualPartners = 0;
    console.log('Checking for actual partner data:');
    for (let i = 0; i < 10; i++) {
      const nameValue = this.clientForm.get(`partner_name_${i}`)?.value;
      const dobValue = this.clientForm.get(`partner_dob_${i}`)?.value;
      const aadharDoc = this.existingDocuments[`partner_aadhar_${i}`];
      const panDoc = this.existingDocuments[`partner_pan_${i}`];
      
      console.log(`Partner ${i}: name=${nameValue}, dob=${dobValue}, aadharDoc=${!!aadharDoc}, panDoc=${!!panDoc}`);
      
      if (nameValue || dobValue || aadharDoc || panDoc) {
        actualPartners = i + 1;
        console.log(`Found partner data at index ${i}, setting actualPartners to ${actualPartners}`);
      }
    }
    
    console.log('Actual partners found:', actualPartners);
    
    // For Partnership constitution, determine partner count
    let partnerCount;
    
    if (constitutionType === 'Partnership') {
      // For partnerships, use the maximum of:
      // 1. number_of_partners from form
      // 2. actual partners found in data
      // 3. minimum of 2 partners for partnerships
      partnerCount = Math.max(numPartners, actualPartners, 2);
      
      // Cap at 10 partners maximum
      partnerCount = Math.min(partnerCount, 10);
    } else {
      // For other types, use actual partners found
      partnerCount = actualPartners;
    }
    
    console.log('Final partner count:', partnerCount);
    
    const partnerArray = Array(partnerCount).fill(0).map((_, i) => i);
    console.log('Partner array created:', partnerArray);
    return partnerArray;
  }

  // Helper methods for safe partner input handling
  getPartnerNameValue(index: number): string {
    const controlName = `partner_name_${index}`;
    const control = this.clientForm.get(controlName);
    const value = control?.value || '';
    console.log(`getPartnerNameValue(${index}): controlName=${controlName}, controlExists=${!!control}, value='${value}'`);
    return value;
  }

  getPartnerDobValue(index: number): string {
    const controlName = `partner_dob_${index}`;
    const control = this.clientForm.get(controlName);
    const value = control?.value || '';
    console.log(`getPartnerDobValue(${index}): controlName=${controlName}, controlExists=${!!control}, value='${value}'`);
    return value;
  }

  onPartnerNameChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.clientForm.get(`partner_name_${index}`)?.setValue(input.value);
    }
  }

  onPartnerDobChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.clientForm.get(`partner_dob_${index}`)?.setValue(input.value);
    }
  }

  // Helper method to get existing partner document
  getExistingPartnerDocument(type: 'aadhar' | 'pan', index: number): any {
    const documentKey = `partner_${type}_${index}`;
    console.log(`getExistingPartnerDocument called - type: ${type}, index: ${index}, key: ${documentKey}`);
    console.log(`existingDocuments object:`, this.existingDocuments);
    console.log(`existingDocuments keys:`, Object.keys(this.existingDocuments));
    console.log(`existingDocuments[${documentKey}]:`, this.existingDocuments[documentKey]);
    
    // Check for alternative key patterns
    const alternativeKeys = [
      documentKey,
      `partner_${type}_${index}_document`,
      `${type}_${index}`,
      `partner_${index}_${type}`
    ];
    
    console.log('Checking alternative keys:', alternativeKeys);
    for (const altKey of alternativeKeys) {
      if (this.existingDocuments[altKey]) {
        console.log(`Found document with alternative key: ${altKey}`, this.existingDocuments[altKey]);
        return this.existingDocuments[altKey];
      }
    }
    
    return this.existingDocuments[documentKey];
  }

  // Helper method to download partner document
  downloadPartnerDocument(type: 'aadhar' | 'pan', index: number): void {
    const documentKey = `partner_${type}_${index}`;
    console.log(`downloadPartnerDocument called - type: ${type}, index: ${index}, key: ${documentKey}`);
    
    if (this.existingDocuments[documentKey]) {
      this.clientService.downloadDocument(this.clientId, documentKey).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.existingDocuments[documentKey].file_name;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.snackBar.open('Error downloading document', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onFileSelected(event: Event, documentType: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.documents[documentType] = input.files[0];
    }
  }

  removeDocument(documentType: string): void {
    delete this.documents[documentType];
  }

  removeExistingDocument(documentType: string): void {
    console.log('removeExistingDocument called with documentType:', documentType);
    console.log('existingDocuments before removal:', this.existingDocuments);
    
    // Show confirmation dialog
    const documentName = this.getDocumentTypeName(documentType);
    const confirmDelete = confirm(`Are you sure you want to remove the ${documentName}? This action cannot be undone.`);
    
    if (confirmDelete) {
      console.log('User confirmed deletion');
      
      // Remove from existingDocuments object
      delete this.existingDocuments[documentType];
      
      // Mark for deletion on save by adding to a deletedDocuments array
      if (!this.deletedDocuments) {
        this.deletedDocuments = [];
      }
      this.deletedDocuments.push(documentType);
      
      console.log('Document marked for deletion:', documentType);
      console.log('deletedDocuments array:', this.deletedDocuments);
      console.log('existingDocuments after removal:', this.existingDocuments);
      
      // Force change detection
      this.cdr.detectChanges();
      
      this.snackBar.open(`${documentName} marked for removal`, 'Close', { 
        duration: 3000 
      });
    } else {
      console.log('User cancelled deletion');
    }
  }

  downloadDocument(documentType: string): void {
    if (this.existingDocuments[documentType]) {
      this.clientService.downloadDocument(this.clientId, documentType).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.existingDocuments[documentType].file_name;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.snackBar.open('Error downloading document', 'Close', { duration: 3000 });
        }
      });
    }
  }

  addBankStatement(): void {
    if (this.bankStatementsCount < 6) {
      this.bankStatementsCount++;
    }
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const formData = new FormData();

    // Add form fields
    const formValue = this.clientForm.getRawValue();
    
    // Debug the specific fields we're having issues with
    console.log('=== SAVE CLIENT DEBUGGING ===');
    console.log('Form is valid:', this.clientForm.valid);
    console.log('Full form value:', formValue);
    console.log('registration_number from form:', formValue.registration_number);
    console.log('company_email from form:', formValue.company_email);
    console.log('optional_mobile_number from form:', formValue.optional_mobile_number);
    
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        // Debug the specific fields we're tracking
        if (key === 'registration_number' || key === 'company_email' || key === 'optional_mobile_number') {
          console.log(`Adding to FormData - ${key}: ${value}`);
        }
        
        // For nested objects, stringify them
        if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      } else {
        // Log when fields are empty/null/undefined
        if (key === 'registration_number' || key === 'company_email' || key === 'optional_mobile_number') {
          console.log(`NOT adding to FormData - ${key}: ${value} (empty/null/undefined)`);
        }
      }
    });

    // Debug FormData contents
    console.log('FormData contents logged above in individual field processing');

    // Add files
    Object.keys(this.documents).forEach(key => {
      if (this.documents[key]) {
        formData.append(key, this.documents[key]);
      }
    });

    console.log('Calling updateClientDetails with clientId:', this.clientId);
    console.log('=== END SAVE CLIENT DEBUGGING ===');

    this.clientService.updateClientDetails(this.clientId, formData)
      .then(() => {
        this.snackBar.open('Client updated successfully', 'Close', { duration: 3000 });
        this.saving = false;
        this.router.navigate(['/clients']);
      })
      .catch((error) => {
        console.error('Error updating client:', error);
        this.snackBar.open('Error updating client', 'Close', { duration: 3000 });
        this.saving = false;
      });
  }

  cancel(): void {
    this.router.navigate(['/clients']);
  }

  getDocumentTypeName(documentType: string): string {
    return documentType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // New methods for enhanced functionality
  getExistingBankStatements(): any[] {
    const statements = [];
    for (let i = 0; i < 6; i++) {
      const key = `bank_statement_${i}`;
      if (this.existingDocuments[key]) {
        statements.push({
          ...this.existingDocuments[key],
          document_type: key
        });
      }
    }
    return statements;
  }

  getExistingDocuments(): Array<{file_name: string; file_size: number; document_type: string}> {
    const docs: Array<{file_name: string; file_size: number; document_type: string}> = [];
    console.log('getExistingDocuments called. existingDocuments:', this.existingDocuments);
    console.log('existingDocuments keys:', Object.keys(this.existingDocuments));
    
    Object.keys(this.existingDocuments).forEach(key => {
      if (this.existingDocuments[key]) {
        const doc = {
          ...this.existingDocuments[key],
          document_type: key
        };
        docs.push(doc);
        console.log(`Added document: ${key}`, doc);
      }
    });
    
    console.log('Final documents array:', docs);
    return docs;
  }

  hasExistingDocument(documentType: string): boolean {
    const hasDoc = !!this.existingDocuments[documentType];
    console.log(`hasExistingDocument called for ${documentType}:`, hasDoc, 'Document data:', this.existingDocuments[documentType]);
    return hasDoc;
  }

  addBusinessImage(): void {
    if (this.businessImagesCount < 10) {
      this.businessImagesCount++;
    }
  }

  removeBusinessImage(): void {
    if (this.businessImagesCount > 1) {
      // Remove the last image document if it exists
      const lastImageKey = `business_image_${this.businessImagesCount - 1}`;
      delete this.documents[lastImageKey];
      this.businessImagesCount--;
    }
  }

  previewDocument(documentType: string): void {
    console.log('previewDocument called with documentType:', documentType);
    console.log('existingDocuments:', this.existingDocuments);
    console.log('Document exists:', !!this.existingDocuments[documentType]);
    
    if (this.existingDocuments[documentType]) {
      console.log('Attempting to preview document:', this.existingDocuments[documentType]);
      this.clientService.downloadDocument(this.clientId, documentType).subscribe({
        next: (blob) => {
          console.log('Document blob received:', blob);
          const url = window.URL.createObjectURL(blob);
          const fileName = this.existingDocuments[documentType].file_name;
          console.log('File name:', fileName);
          
          // Check if it's an image or PDF for preview
          if (this.canPreviewDocument(fileName)) {
            console.log('Opening preview in new tab');
            // Open in new tab for preview
            window.open(url, '_blank');
          } else {
            console.log('File type not previewable');
            this.snackBar.open('Preview not available for this file type', 'Close', { duration: 3000 });
          }
          
          // Clean up the blob URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        },
        error: (error) => {
          console.error('Error previewing document:', error);
          this.snackBar.open('Error previewing document', 'Close', { duration: 3000 });
        }
      });
    } else {
      console.error('Document not found in existingDocuments:', documentType);
      this.snackBar.open('Document not found', 'Close', { duration: 3000 });
    }
  }

  canPreviewDocument(fileName: string): boolean {
    const previewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'pdf'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return previewableExtensions.includes(extension || '');
  }

  getIECodeDocument(): any {
    return this.existingDocuments['ie_code'] || this.existingDocuments['ie_code_document'] || null;
  }

  removeBankStatement(): void {
    if (this.bankStatementsCount > 1) {
      // Remove the last bank statement document if it exists
      const lastStatementKey = `bank_statement_${this.bankStatementsCount - 1}`;
      delete this.documents[lastStatementKey];
      this.bankStatementsCount--;
    }
  }
}
