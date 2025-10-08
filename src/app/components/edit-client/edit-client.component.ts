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
  clientForm!: FormGroup;
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
  filteredNewBankNames: string[] = [];
  hasNewCurrentAccount = false;
  selectedPaymentGateways: string[] = [];
  
  // Step management properties
  currentStep = 0;
  totalSteps = 8;
  
  steps = [
    {
      title: 'Personal Info',
      description: 'Basic personal information',
      icon: 'person',
      completed: false
    },
    {
      title: 'GST Details',
      description: 'GST and registration details',
      icon: 'receipt',
      completed: false
    },
    {
      title: 'Address',
      description: 'Address information',
      icon: 'location_on',
      completed: false
    },
    {
      title: 'Business',
      description: 'Business information',
      icon: 'business',
      completed: false
    },
    {
      title: 'Partnership',
      description: 'Partnership details',
      icon: 'group',
      completed: false
    },
    {
      title: 'Financial',
      description: 'Financial information',
      icon: 'account_balance_wallet',
      completed: false
    },
    {
      title: 'Banking',
      description: 'Bank account details',
      icon: 'account_balance',
      completed: false
    },
    {
      title: 'Documents',
      description: 'Upload documents',
      icon: 'upload_file',
      completed: false
    }
  ];
  
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
    
    // Initialize the form with safety check
    try {
      this.clientForm = this.initForm();
      console.log('✅ ClientForm initialized successfully:', !!this.clientForm);
    } catch (error) {
      console.error('❌ Error initializing clientForm:', error);
      // Fallback initialization with basic controls to prevent missingFormException
      this.clientForm = this.fb.group({
        legal_name: [''],
        mobile_number: ['']
      });
    }
  }

  ngOnInit(): void {
    // Ensure form is initialized before proceeding
    if (!this.clientForm || !this.clientForm.controls) {
      console.error('❌ ClientForm not initialized in ngOnInit, attempting to reinitialize...');
      try {
        this.clientForm = this.initForm();
        console.log('✅ ClientForm reinitialized successfully');
      } catch (error) {
        console.error('❌ Failed to reinitialize clientForm:', error);
        // Create a minimal form as fallback
        this.clientForm = this.fb.group({
          legal_name: [''],
          mobile_number: ['']
        });
      }
    }
    
    console.log('🔍 NgOnInit - ClientForm status:', !!this.clientForm);
    console.log('🔍 NgOnInit - ClientForm controls:', this.clientForm ? Object.keys(this.clientForm.controls).length : 0);
    
    // Force change detection to ensure form is ready
    this.cdr.detectChanges();
    
    // Add a small delay to ensure form is fully initialized
    setTimeout(() => {
      this.loadClientDetails();
      
      // Initialize partner arrays
      for (let i = 0; i < 10; i++) {
        this.partnerNames[i] = '';
        this.partnerDobs[i] = '';
      }
    }, 0);
  }

  private initForm(): FormGroup {
    // Create form with basic controls first to avoid _rawValidators error
    const form = this.fb.group({
      // Personal Information
      legal_name: [''],
      trade_name: [''],
      user_name: [''],
      user_email: [''],
      company_email: [''],
      mobile_number: [''],
      optional_mobile_number: [''],
      
      // Address Information
      address: [''],
      district: [''],
      state: [''],
      pincode: [''],
      business_address: [''],
      
      // Business Information
      business_name: [''],
      business_type: [''],
      constitution_type: [''],
      has_business_pan: [''],
      gst_number: [''],
      gst_status: [''],
      business_pan: [''],
      ie_code: [''],
      ie_code_status: [''],
      website: [''],
      business_url: [''],
      
      // Financial Information
      required_loan_amount: [0],
      loan_purpose: [''],
      repayment_period: [''],
      monthly_income: [0],
      existing_loans: [''],
      
      // Bank Information
      bank_name: [''],
      account_name: [''],
      account_number: [''],
      ifsc_code: [''],
      bank_type: [''],
      new_current_account: [''],
      gateway: [''],
      transaction_done_by_client: [0],
      total_credit_amount: [0],
      average_monthly_balance: [0],
      transaction_months: [1],
      new_business_account: [''],
      
      // New bank details fields (conditional)
      new_bank_account_number: [''],
      new_ifsc_code: [''],
      new_account_name: [''],
      new_bank_name: [''],
      
      // Partnership Information
      number_of_partners: [0],
      
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

    // Add validators after form creation to avoid _rawValidators error
    setTimeout(() => {
      if (form && form.controls) {
        // Email validators
        const userEmailControl = form.get('user_email');
        if (userEmailControl) {
          userEmailControl.setValidators([Validators.email]);
        }
        
        const companyEmailControl = form.get('company_email');
        if (companyEmailControl) {
          companyEmailControl.setValidators([Validators.email]);
        }
        
        // Mobile number validators
        const mobileNumberControl = form.get('mobile_number');
        if (mobileNumberControl) {
          mobileNumberControl.setValidators([Validators.pattern('^[0-9]{10}$')]);
        }
        
        const optionalMobileNumberControl = form.get('optional_mobile_number');
        if (optionalMobileNumberControl) {
          optionalMobileNumberControl.setValidators([Validators.pattern('^[0-9]{10}$')]);
        }
        
        // Pincode validator
        const pincodeControl = form.get('pincode');
        if (pincodeControl) {
          pincodeControl.setValidators([Validators.pattern('^[0-9]{6}$')]);
        }
        
        // Business PAN validator
        const businessPanControl = form.get('business_pan');
        if (businessPanControl) {
          businessPanControl.setValidators([Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]);
        }
        
        // IFSC code validator
        const ifscCodeControl = form.get('ifsc_code');
        if (ifscCodeControl) {
          ifscCodeControl.setValidators([Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')]);
        }
        
        // Financial validators
        const requiredLoanAmountControl = form.get('required_loan_amount');
        if (requiredLoanAmountControl) {
          requiredLoanAmountControl.setValidators([Validators.min(0)]);
        }
        
        const monthlyIncomeControl = form.get('monthly_income');
        if (monthlyIncomeControl) {
          monthlyIncomeControl.setValidators([Validators.min(0)]);
        }
        
        const transactionDoneByClientControl = form.get('transaction_done_by_client');
        if (transactionDoneByClientControl) {
          transactionDoneByClientControl.setValidators([Validators.min(0)]);
        }
        
        const totalCreditAmountControl = form.get('total_credit_amount');
        if (totalCreditAmountControl) {
          totalCreditAmountControl.setValidators([Validators.min(0)]);
        }
        
        const averageMonthlyBalanceControl = form.get('average_monthly_balance');
        if (averageMonthlyBalanceControl) {
          averageMonthlyBalanceControl.setValidators([Validators.min(0)]);
        }
        
        const transactionMonthsControl = form.get('transaction_months');
        if (transactionMonthsControl) {
          transactionMonthsControl.setValidators([Validators.min(1)]);
        }
        
        const numberOfPartnersControl = form.get('number_of_partners');
        if (numberOfPartnersControl) {
          numberOfPartnersControl.setValidators([Validators.min(0)]);
        }
        
        // Website validator
        const websiteControl = form.get('website');
        if (websiteControl) {
          websiteControl.setValidators([Validators.pattern('https?://.+')]);
        }
        
        // Update validity for all controls
        Object.keys(form.controls).forEach(key => {
          const control = form.get(key);
          if (control) {
            control.updateValueAndValidity();
          }
        });
      }
    }, 0);

    // Initialize partner form controls with safety checks
    setTimeout(() => {
      if (form && form.controls) {
        this.initializePartnerControls(form);
      }
    }, 0);
    
    return form;
  }

  private initializePartnerControls(form: FormGroup): void {
    console.log('initializePartnerControls called');
    // Initialize form controls for up to 10 partners
    for (let i = 0; i < 10; i++) {
      const nameControl = `partner_name_${i}`;
      const dobControl = `partner_dob_${i}`;
      
      // Only add control if it doesn't already exist
      if (form && !form.get(nameControl)) {
        form.addControl(nameControl, this.fb.control(''));
      }
      if (form && !form.get(dobControl)) {
        form.addControl(dobControl, this.fb.control(''));
      }
      console.log(`Ensured form controls exist: ${nameControl}, ${dobControl}`);
    }
    console.log('All partner controls initialized. Form controls:', form ? Object.keys(form.controls) : []);
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
        // Ensure form is ready before populating
        if (!this.clientForm || !this.clientForm.controls) {
          console.warn('⚠️ ClientForm not ready, reinitializing before population...');
          try {
            this.clientForm = this.initForm();
          } catch (initError) {
            console.error('❌ Error reinitializing form:', initError);
            // Create minimal form as fallback
            this.clientForm = this.fb.group({
              legal_name: [''],
              mobile_number: ['']
            });
          }
        }
        
        // Add a small delay to ensure form is fully ready
        setTimeout(() => {
          this.populateForm(response.client);
          
          // Force change detection after population
          this.cdr.detectChanges();
        }, 0);
        
        // Force change detection after population
        this.cdr.detectChanges();
        
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
    
    // Safety check - ensure form exists
    if (!this.clientForm) {
      console.error('❌ Form not initialized, cannot populate');
      return;
    }
    
    // Add a small delay to ensure form is fully initialized
    setTimeout(() => {
      // Determine Business PAN status based on existing documents and constitution type
      const hasBusinessPanDocument = this.hasExistingDocument('business_pan_document');
      const isPrivateLimited = client.constitution_type === 'Private Limited';
      const hasBusinessPan = isPrivateLimited ? 'yes' : (client.has_business_pan || (hasBusinessPanDocument ? 'yes' : ''));
      
      // Set IE Code status based on document existence
      const ieCodeStatus = this.getIECodeDocument() ? 'Yes' : 'No';
      
      // Create a safe patch value object with only existing controls
      const patchData: any = {};
      const formControls = this.clientForm.controls;
      
      const clientData = {
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
        account_name: client.account_name || '',
        account_number: client.account_number || '',
        ifsc_code: client.ifsc_code || '',
        bank_type: client.bank_type || '',
        new_current_account: client.new_current_account || '',
        gateway: client.gateway || '',
        
        // New bank details
        new_bank_account_number: (client as any).new_bank_account_number || '',
        new_ifsc_code: (client as any).new_ifsc_code || '',
        new_account_name: (client as any).new_account_name || '',
        new_bank_name: (client as any).new_bank_name || '',
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
      };
      
      // Only add fields that exist in the form
      Object.keys(clientData).forEach(key => {
        if (formControls[key]) {
          patchData[key] = (clientData as any)[key];
        }
      });
      
      console.log('Patching form with data:', patchData);
      
      // Safety check before patching
      if (this.clientForm) {
        this.clientForm.patchValue(patchData);
      }
    }, 0);
    
    // Initialize payment gateways - handle both array and JSON string formats
    const paymentGateways = (client as any).payment_gateways;
    console.log('🔍 Raw payment_gateways from client:', paymentGateways, 'Type:', typeof paymentGateways);
    
    if (Array.isArray(paymentGateways)) {
      this.selectedPaymentGateways = paymentGateways;
      console.log('✅ Payment gateways loaded as array:', this.selectedPaymentGateways);
    } else if (typeof paymentGateways === 'string') {
      try {
        this.selectedPaymentGateways = JSON.parse(paymentGateways);
        console.log('✅ Payment gateways parsed from string:', this.selectedPaymentGateways);
      } catch (e) {
        console.warn('❌ Failed to parse payment gateways:', paymentGateways);
        this.selectedPaymentGateways = [];
      }
    } else {
      this.selectedPaymentGateways = [];
      console.log('⚠️ Payment gateways not found, defaulting to empty array');
    }
    
    console.log('💾 Final selectedPaymentGateways:', this.selectedPaymentGateways);
    
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
    if (this.clientForm) {
      this.clientForm.patchValue(patchData);
    }
    console.log('Patched all partner data:', patchData);
    
    // Force form update and change detection
    if (this.clientForm) {
      this.clientForm.updateValueAndValidity();
    }
    
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
    if (this.clientForm) {
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
    }
    console.log('=== END DEBUGGING ===');
  }

  // Method to ensure partner controls exist
  private ensurePartnerControlsExist(): void {
    console.log('=== ENSURING PARTNER CONTROLS EXIST ===');
    
    if (this.clientForm) {
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
    }
    
    console.log('All partner controls verified/created');
    console.log('=== END ENSURING CONTROLS ===');
  }

  // Helper method to get partner control names
  getPartnerControlName(type: 'name' | 'dob', index: number): string {
    const controlName = `partner_${type}_${index}`;
    console.log(`getPartnerControlName called - type: ${type}, index: ${index}, controlName: ${controlName}`);
    
    // Ensure the control exists
    if (this.clientForm && !this.clientForm.get(controlName)) {
      console.warn(`Form control ${controlName} does not exist, creating it...`);
      this.clientForm.addControl(controlName, this.fb.control(''));
    }
    
    const control = this.clientForm ? this.clientForm.get(controlName) : null;
    console.log(`Form control exists:`, !!control, 'Value:', control?.value);
    
    return controlName;
  }

  // Helper method to create array for partner iteration
  getPartnerArray(): number[] {
    const numPartners = this.clientForm && this.clientForm.get('number_of_partners') ? this.clientForm.get('number_of_partners')?.value : 0;
    const constitutionType = this.clientForm && this.clientForm.get('constitution_type') ? this.clientForm.get('constitution_type')?.value : '';
    
    console.log('getPartnerArray called - number_of_partners:', numPartners);
    console.log('Constitution type:', constitutionType);
    if (this.clientForm) {
      console.log('Form value:', this.clientForm.value);
    }
    
    // Check if we have actual partner data
    let actualPartners = 0;
    console.log('Checking for actual partner data:');
    for (let i = 0; i < 10; i++) {
      const nameValue = this.clientForm && this.clientForm.get(`partner_name_${i}`) ? this.clientForm.get(`partner_name_${i}`)?.value : '';
      const dobValue = this.clientForm && this.clientForm.get(`partner_dob_${i}`) ? this.clientForm.get(`partner_dob_${i}`)?.value : '';
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
    const control = this.clientForm ? this.clientForm.get(controlName) : null;
    const value = control?.value || '';
    console.log(`getPartnerNameValue(${index}): controlName=${controlName}, controlExists=${!!control}, value='${value}'`);
    return value;
  }

  getPartnerDobValue(index: number): string {
    const controlName = `partner_dob_${index}`;
    const control = this.clientForm ? this.clientForm.get(controlName) : null;
    const value = control?.value || '';
    console.log(`getPartnerDobValue(${index}): controlName=${controlName}, controlExists=${!!control}, value='${value}'`);
    return value;
  }

  onPartnerNameChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input && this.clientForm) {
      this.clientForm.get(`partner_name_${index}`)?.setValue(input.value);
    }
  }

  onPartnerDobChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input && this.clientForm) {
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
    if (input && input.files && input.files[0]) {
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
    if (this.clientForm && this.clientForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const formData = new FormData();

    // Add form fields
    const formValue = this.clientForm ? this.clientForm.getRawValue() : {};
    
    // Debug the specific fields we're having issues with
    console.log('=== SAVE CLIENT DEBUGGING ===');
    console.log('Form is valid:', this.clientForm ? this.clientForm.valid : false);
    console.log('Full form value:', formValue);
    console.log('registration_number from form:', formValue.registration_number);
    console.log('company_email from form:', formValue.company_email);
    console.log('optional_mobile_number from form:', formValue.optional_mobile_number);
    
    // Send all form fields to ensure proper WhatsApp message triggering
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      
      // Debug the specific fields we're tracking
      console.log(`Adding field to FormData - ${key}: ${value}`);
      
      // For nested objects, stringify them
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value !== null && value !== undefined ? value.toString() : '');
      }
    });

    // Debug FormData contents
    console.log('FormData contents logged above in individual field processing');

    // Add payment gateways
    console.log('💾 Saving payment gateways:', this.selectedPaymentGateways);
    formData.append('payment_gateways', JSON.stringify(this.selectedPaymentGateways));
    console.log('💾 Payment gateways JSON string:', JSON.stringify(this.selectedPaymentGateways));

    // Add files
    Object.keys(this.documents).forEach(key => {
      if (this.documents[key]) {
        formData.append(key, this.documents[key]);
      }
    });

    console.log('Calling updateClientDetails with clientId:', this.clientId);
    console.log('=== END SAVE CLIENT DEBUGGING ===');

    this.clientService.updateClientDetails(this.clientId, formData).subscribe({
      next: (response: any) => {
        this.saving = false;
        
        console.log('✅ Client update response:', response);
        console.log('📱 WhatsApp status in response:', {
          whatsapp_sent: response.whatsapp_sent,
          whatsapp_quota_exceeded: response.whatsapp_quota_exceeded,
          whatsapp_error: response.whatsapp_error
        });
        
        // Check if this was a comment update and handle WhatsApp status
        const isCommentUpdate = formValue.comments !== undefined;
        
        if (isCommentUpdate) {
          // Handle comment update with WhatsApp status
          if (response.whatsapp_sent === true) {
            this.snackBar.open('✅ Comment updated successfully, WhatsApp message sent!', 'Close', { 
              duration: 4000,
              panelClass: ['success-snackbar']
            });
          } else if (response.whatsapp_quota_exceeded === true) {
            this.snackBar.open('⚠️ Comment updated successfully, WhatsApp limit reached - upgrade plan to send more messages', 'Close', { 
              duration: 6000,
              panelClass: ['warning-snackbar']
            });
          } else if (response.whatsapp_error) {
            this.snackBar.open(`❌ Comment updated successfully, WhatsApp error: ${response.whatsapp_error}`, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          } else if (response.whatsapp_sent === false) {
            this.snackBar.open('⚠️ Comment updated successfully, WhatsApp message failed to send', 'Close', { 
              duration: 4000,
              panelClass: ['warning-snackbar']
            });
          } else {
            this.snackBar.open('✅ Comment updated successfully', 'Close', { duration: 3000 });
          }
        } else {
          // Handle regular update with enhanced WhatsApp feedback
          if (response.whatsapp_sent === true) {
            this.snackBar.open('✅ Client updated successfully, WhatsApp notifications sent!', 'Close', { 
              duration: 4000,
              panelClass: ['success-snackbar']
            });
          } else if (response.whatsapp_quota_exceeded === true) {
            this.snackBar.open('⚠️ Client updated successfully, WhatsApp limit reached - upgrade plan to send more messages', 'Close', { 
              duration: 6000,
              panelClass: ['warning-snackbar']
            });
          } else if (response.whatsapp_error) {
            this.snackBar.open(`❌ Client updated successfully, WhatsApp error: ${response.whatsapp_error}`, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          } else if (response.whatsapp_sent === false) {
            this.snackBar.open('⚠️ Client updated successfully, WhatsApp messages failed to send', 'Close', { 
              duration: 4000,
              panelClass: ['warning-snackbar']
            });
          } else {
            this.snackBar.open('✅ Client updated successfully', 'Close', { duration: 3000 });
          }
        }
        
        this.router.navigate(['/client-detail', this.clientId]);
      },
      error: (error) => {
        console.error('❌ Error updating client:', error);
        console.error('Error details:', error);
        
        // Handle specific error cases
        if (error.status === 466 || (error.error && error.error.includes && error.error.includes('quota exceeded'))) {
          this.snackBar.open('⚠️ Client update failed: WhatsApp quota exceeded - upgrade plan', 'Close', { 
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
        } else {
          this.snackBar.open('❌ Error updating client: ' + (error.message || 'Unknown error'), 'Close', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
        this.saving = false;
      }
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

  // Bank names list (same as in new-client component)
  bankNames = [
    // Major Public Sector Banks
    'State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
    'Bank of India', 'Central Bank of India', 'Indian Bank', 'Indian Overseas Bank', 'UCO Bank',
    'Bank of Maharashtra', 'Punjab & Sind Bank',
    
    // Major Private Sector Banks
    'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'IndusInd Bank',
    'Federal Bank', 'South Indian Bank', 'Karnataka Bank', 'City Union Bank', 'DCB Bank',
    'RBL Bank', 'IDFC First Bank', 'Bandhan Bank', 'CSB Bank', 'Equitas Small Finance Bank',
    
    // Small Finance Banks
    'AU Small Finance Bank', 'Capital Small Finance Bank', 'Esaf Small Finance Bank',
    'Fincare Small Finance Bank', 'Jana Small Finance Bank', 'North East Small Finance Bank',
    'Suryoday Small Finance Bank', 'Ujjivan Small Finance Bank', 'Utkarsh Small Finance Bank',
    
    // Regional Rural Banks
    'Andhra Pradesh Grameena Vikas Bank', 'Andhra Pragathi Grameena Bank', 'Arunachal Pradesh Rural Bank',
    'Assam Gramin Vikash Bank', 'Bihar Gramin Bank', 'Chhattisgarh Rajya Gramin Bank',
    'Ellaquai Dehati Bank', 'Himachal Pradesh Gramin Bank', 'J&K Grameen Bank',
    'Jharkhand Rajya Gramin Bank', 'Karnataka Gramin Bank', 'Kerala Gramin Bank',
    'Madhya Pradesh Gramin Bank', 'Maharashtra Gramin Bank', 'Manipur Rural Bank',
    'Meghalaya Rural Bank', 'Mizoram Rural Bank', 'Nagaland Rural Bank', 'Odisha Gramya Bank',
    'Paschim Banga Gramin Bank', 'Puduvai Bharathiar Grama Bank', 'Punjab Gramin Bank',
    'Rajasthan Marudhara Gramin Bank', 'Sarva Haryana Gramin Bank', 'Tamil Nadu Grama Bank',
    'Telangana Grameena Bank', 'Tripura Gramin Bank', 'Utkal Grameen Bank', 'Uttar Bihar Gramin Bank',
    'Uttarakhand Gramin Bank', 'Uttaranchal Gramin Bank', 'Vidharbha Konkan Gramin Bank',
    
    // Cooperative Banks
    'Saraswat Cooperative Bank', 'Cosmos Cooperative Bank', 'Abhyudaya Cooperative Bank',
    'TJSB Sahakari Bank', 'Bassein Catholic Cooperative Bank', 'Kalupur Commercial Cooperative Bank',
    'Nutan Nagarik Sahakari Bank', 'Shamrao Vithal Cooperative Bank', 'The Mumbai District Central Cooperative Bank',
    
    // Foreign Banks
    'Citibank', 'Standard Chartered Bank', 'HSBC Bank', 'Deutsche Bank', 'Barclays Bank',
    'Bank of America', 'JPMorgan Chase Bank', 'DBS Bank', 'Mizuho Bank', 'MUFG Bank',
    
    // Payment Banks
    'Paytm Payments Bank', 'Airtel Payments Bank', 'India Post Payments Bank', 'Fino Payments Bank',
    'Jio Payments Bank', 'NSDL Payments Bank'
  ];

  // Payment gateway methods and properties
  availableGateways = ['Cashfree', 'Easebuzz', 'Razorpay', 'Paytm', 'Stripe'];

  onNewCurrentAccountChange(value: string): void {
    console.log('New current account changed to:', value);
    // Handle new current account change if needed
  }

  onNewBankNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const value = input.value.toLowerCase();
      if (value.length > 2) {
        this.filteredNewBankNames = this.bankNames.filter(bank => 
          bank.toLowerCase().includes(value)
        );
      } else {
        this.filteredNewBankNames = [];
      }
    }
  }

  selectNewBank(bank: string): void {
    if (this.clientForm) {
      this.clientForm.get('new_bank_name')?.setValue(bank);
      this.filteredNewBankNames = [];
    }
  }

  isGatewaySelected(gateway: string): boolean {
    return this.selectedPaymentGateways.includes(gateway);
  }

  onGatewayChange(gateway: string, selected: boolean): void {
    if (selected) {
      if (!this.selectedPaymentGateways.includes(gateway)) {
        this.selectedPaymentGateways.push(gateway);
      }
    } else {
      const index = this.selectedPaymentGateways.indexOf(gateway);
      if (index > -1) {
        this.selectedPaymentGateways.splice(index, 1);
      }
    }
    console.log('Selected payment gateways:', this.selectedPaymentGateways);
  }

  getGatewayColor(gateway: string): string {
    const colors: { [key: string]: string } = {
      'Cashfree': '#16D07A',
      'Easebuzz': '#FF6B35',
      'Razorpay': '#0C2E61',
      'Paytm': '#00B9F5',
      'Stripe': '#635BFF'
    };
    return colors[gateway] || '#635BFF';
  }

  getGatewayIcon(gateway: string): string {
    const icons: { [key: string]: string } = {
      'Cashfree': 'account_balance',
      'Easebuzz': 'flash_on',
      'Razorpay': 'payment',
      'Paytm': 'smartphone',
      'Stripe': 'credit_card'
    };
    return icons[gateway] || 'payment';
  }

  getSelectedGateways(): string[] {
    return this.selectedPaymentGateways;
  }
}
