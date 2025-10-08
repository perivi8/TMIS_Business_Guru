import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnquiryService } from '../../services/enquiry.service';
import { UserService, User } from '../../services/user.service';
import { Enquiry, COMMENT_OPTIONS } from '../../models/enquiry.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-enquiry',
  templateUrl: './enquiry.component.html',
  styleUrls: ['./enquiry.component.scss']
})
export class EnquiryComponent implements OnInit, OnDestroy {
  enquiries: Enquiry[] = [];
  filteredEnquiries: Enquiry[] = [];
  displayedColumns: string[] = [
    'sno', 'date', 'wati_name', 'user_name', 'mobile_number', 
    'secondary_mobile_number', 'gst', 'business_type', 'business_nature', 'staff', 
    'comments', 'whatsapp_status', 'additional_comments', 'actions'
  ];
  
  staffMembers: User[] = [];
  uniqueStaffMembers: string[] = [];
  registrationForm: FormGroup;
  showRegistrationForm = false;
  loading = false;
  searchTerm = '';
  
  // Filter and Sort Properties
  sortOption = 'date_new'; // Default sort by newest first
  staffFilter = 'all';
  gstFilter = 'all';
  interestFilter = 'all'; // New interest level filter
  fromDate: Date | null = null;
  toDate: Date | null = null;
  
  // Edit mode tracking
  isEditMode = false;
  editingEnquiryId: string | null = null;

  // Cleanup subject for subscriptions
  private destroy$ = new Subject<void>();

  // Country codes for mobile numbers
  countryCodes = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' }
  ];

  predefinedComments = [
    'Will share Doc',
    'Doc Shared(Yet to Verify)',
    'Verified(Shortlisted)',
    'Not Eligible',
    'No MSME',
    'No GST',
    'Aadhar/PAN name mismatch',
    'MSME/GST Address Different',
    'Will call back',
    'Personal Loan',
    'Start Up',
    'Asking Less than 5 Laks',
    '1st call completed',
    '2nd call completed',
    '3rd call completed',
    'Switch off',
    'Not connected',
    'By Mistake',
    'GST Cancelled'
  ];

  // Interest level categorization
  interestComments = [
    'Will share Doc',
    'Doc Shared(Yet to Verify)',
    'Verified(Shortlisted)'
  ];

  notInterestedComments = [
    'Not Eligible',
    'No MSME',
    'Start Up',
    'Personal Loan',
    'Asking Less than 5 Laks',
    '3rd call completed',
    'By Mistake'
  ];

  noGstComments = [
    'No GST'
  ];

  gstCancelledComments = [
    'GST Cancelled'
  ];

  pendingComments = [
    'Aadhar/PAN name mismatch',
    'MSME/GST Address Different',
    'Will call back'
  ];

  unknownComments = [
    '1st call completed',
    '2nd call completed',
    'Switch off',
    'Not connected'
  ];

  // Alias for template compatibility
  commentOptions = this.predefinedComments;

  // Business type options
  businessTypeOptions = [
    'Private Limited',
    'Proprietorship', 
    'Partnership'
  ];

  constructor(
    private fb: FormBuilder,
    private enquiryService: EnquiryService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.registrationForm = this.createRegistrationForm();
  }

  ngOnInit(): void {
    this.loadEnquiries();
    this.loadStaffMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createRegistrationForm(): FormGroup {
    const form = this.fb.group({
      date: [new Date(), Validators.required],
      wati_name: ['', Validators.required],
      user_name: [''],
      country_code: ['+91', Validators.required], // Default to India
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      secondary_mobile_number: [''],
      gst: [''], // Optional - user can leave this unselected
      gst_status: [''],
      business_type: [''],
      business_nature: [''],
      staff: ['', Validators.required],
      comments: [''], // Made optional - removed Validators.required
      additional_comments: ['']
    });
    
    // Add value change listener for comments to dynamically validate business_nature
    form.get('comments')?.valueChanges.subscribe(value => {
      const businessNatureControl = form.get('business_nature');
      if (this.isEditMode && value === 'Not Eligible') {
        businessNatureControl?.setValidators([Validators.required]);
      } else {
        businessNatureControl?.clearValidators();
      }
      businessNatureControl?.updateValueAndValidity();
    });
    
    return form;
  }

  loadEnquiries(): void {
    this.loading = true;
    this.enquiryService.getAllEnquiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enquiries) => {
          this.enquiries = enquiries.map((enquiry, index) => ({
            ...enquiry,
            sno: index + 1
          }));
          this.extractUniqueStaffMembers();
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading enquiries:', error);
          this.snackBar.open('Error loading enquiries', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  loadStaffMembers(): void {
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle the response structure properly
          if (response && response.users && Array.isArray(response.users)) {
            this.staffMembers = response.users.filter((user: User) => user.role === 'user' || user.role === 'admin');
          } else {
            console.warn('Unexpected response structure from getUsers:', response);
            this.staffMembers = [];
          }
          this.extractUniqueStaffMembers();
        },
        error: (error) => {
          console.error('Error loading staff members:', error);
          this.staffMembers = [];
          this.extractUniqueStaffMembers();
        }
      });
  }

  extractUniqueStaffMembers(): void {
    const staffSet = new Set<string>();
    
    // Add staff from enquiries
    this.enquiries.forEach(enquiry => {
      if (enquiry.staff) {
        staffSet.add(enquiry.staff);
      }
    });
    
    // Add staff from staff members list
    this.staffMembers.forEach(staff => {
      const staffName = staff.username || staff.email;
      if (staffName) {
        staffSet.add(staffName);
      }
    });
    
    this.uniqueStaffMembers = Array.from(staffSet).sort();
  }

  onGstChange(): void {
    const gstValue = this.registrationForm.get('gst')?.value;
    const gstStatusControl = this.registrationForm.get('gst_status');
    
    if (gstValue === 'Yes') {
      gstStatusControl?.setValidators([Validators.required]);
      gstStatusControl?.enable();
    } else {
      gstStatusControl?.clearValidators();
      gstStatusControl?.setValue('');
      gstStatusControl?.disable();
    }
    gstStatusControl?.updateValueAndValidity();
  }

  // Removed secondary country code change handler as we now use a single country code for both numbers

  // Check if mobile number already exists
  checkMobileNumberExists(mobileNumber: string): boolean {
    if (!mobileNumber || mobileNumber.trim() === '') {
      return false;
    }
    
    // If in edit mode, exclude the current enquiry from the check
    if (this.isEditMode && this.editingEnquiryId) {
      return this.enquiries.some(enquiry => 
        enquiry.mobile_number === mobileNumber && enquiry._id !== this.editingEnquiryId
      );
    }
    
    // For new enquiries, check all existing mobile numbers
    return this.enquiries.some(enquiry => enquiry.mobile_number === mobileNumber);
  }

  onSortChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.enquiries];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(enquiry =>
        enquiry.wati_name.toLowerCase().includes(searchLower) ||
        enquiry.user_name?.toLowerCase().includes(searchLower) ||
        enquiry.mobile_number.includes(searchLower) ||
        enquiry.business_type?.toLowerCase().includes(searchLower) ||
        enquiry.staff.toLowerCase().includes(searchLower) ||
        enquiry.comments.toLowerCase().includes(searchLower)
      );
    }

    // Apply staff filter
    if (this.staffFilter !== 'all') {
      filtered = filtered.filter(enquiry => 
        enquiry.staff === this.staffFilter
      );
    }

    // Apply GST filter
    if (this.gstFilter !== 'all') {
      if (this.gstFilter === 'yes') {
        // Show only GST Yes with Active status
        filtered = filtered.filter(enquiry => 
          enquiry.gst === 'Yes' && enquiry.gst_status === 'Active'
        );
      } else if (this.gstFilter === 'not_selected') {
        // Show only enquiries with "Not Selected" or empty GST
        filtered = filtered.filter(enquiry => 
          enquiry.gst === 'Not Selected' || enquiry.gst === '' || !enquiry.gst
        );
      }
    }

    // Apply interest level filter
    if (this.interestFilter !== 'all') {
      if (this.interestFilter === 'interested') {
        filtered = filtered.filter(enquiry => 
          this.interestComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'not_interested') {
        filtered = filtered.filter(enquiry => 
          this.notInterestedComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'no_gst') {
        filtered = filtered.filter(enquiry => 
          this.noGstComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'gst_cancelled') {
        filtered = filtered.filter(enquiry => 
          this.gstCancelledComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'pending') {
        filtered = filtered.filter(enquiry => 
          this.pendingComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'unknown') {
        filtered = filtered.filter(enquiry => 
          this.unknownComments.includes(enquiry.comments)
        );
      }
    }

    // Apply date range filter
    if (this.fromDate || this.toDate) {
      filtered = filtered.filter(enquiry => {
        const enquiryDate = new Date(enquiry.date);
        
        if (this.fromDate && this.toDate) {
          return enquiryDate >= this.fromDate && enquiryDate <= this.toDate;
        } else if (this.fromDate) {
          return enquiryDate >= this.fromDate;
        } else if (this.toDate) {
          return enquiryDate <= this.toDate;
        }
        
        return true;
      });
    }

    // Apply sorting
    filtered = this.applySorting(filtered);

    // Update serial numbers
    this.filteredEnquiries = filtered.map((enquiry, index) => ({
      ...enquiry,
      sno: index + 1
    }));
  }

  applySorting(enquiries: Enquiry[]): Enquiry[] {
    switch (this.sortOption) {
      case 'name_asc':
        return enquiries.sort((a, b) => a.wati_name.localeCompare(b.wati_name));
      
      case 'name_desc':
        return enquiries.sort((a, b) => b.wati_name.localeCompare(a.wati_name));
      
      case 'date_new':
        return enquiries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      case 'date_old':
        return enquiries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      default:
        return enquiries;
    }
  }

  hasActiveFilters(): boolean {
    return this.staffFilter !== 'all' || 
           this.gstFilter !== 'all' || 
           this.interestFilter !== 'all' || 
           this.fromDate !== null || 
           this.toDate !== null ||
           this.searchTerm.trim() !== '';
  }

  clearAllFilters(): void {
    this.staffFilter = 'all';
    this.gstFilter = 'all';
    this.interestFilter = 'all';
    this.fromDate = null;
    this.toDate = null;
    this.searchTerm = '';
    this.applyFilters();
  }

  clearStaffFilter(): void {
    this.staffFilter = 'all';
    this.applyFilters();
  }

  clearGstFilter(): void {
    this.gstFilter = 'all';
    this.applyFilters();
  }

  clearInterestFilter(): void {
    this.interestFilter = 'all';
    this.applyFilters();
  }

  clearDateRange(): void {
    this.fromDate = null;
    this.toDate = null;
    this.applyFilters();
  }

  formatDateRange(): string {
    if (this.fromDate && this.toDate) {
      return `${this.formatDate(this.fromDate)} - ${this.formatDate(this.toDate)}`;
    } else if (this.fromDate) {
      return `From ${this.formatDate(this.fromDate)}`;
    } else if (this.toDate) {
      return `Until ${this.formatDate(this.toDate)}`;
    }
    return '';
  }

  getInterestLevelDisplay(): string {
    switch (this.interestFilter) {
      case 'interested': return 'Interested';
      case 'not_interested': return 'Not Interested';
      case 'no_gst': return 'No GST';
      case 'gst_cancelled': return 'GST Cancelled';
      case 'pending': return 'Pending';
      case 'unknown': return 'Unknown';
      default: return '';
    }
  }

  getGstFilterDisplay(): string {
    switch (this.gstFilter) {
      case 'yes': return 'GST Active';
      case 'not_selected': return 'Not Selected';
      default: return '';
    }
  }

  getRowColorClass(enquiry: Enquiry): string {
    // Check for GST Cancelled first
    if (enquiry.gst === 'Yes' && enquiry.gst_status === 'Cancel') {
      return 'row-light-red';
    }
    
    // Check for GST Cancelled comment
    if (enquiry.comments === 'GST Cancelled') {
      return 'row-light-red';
    }
    
    switch (enquiry.comments) {
      case 'Will share Doc':
        return 'row-light-blue';
      
      case 'Doc Shared(Yet to Verify)':
        return 'row-light-yellow';
      
      case 'Verified(Shortlisted)':
        return 'row-light-green';
      
      case 'Not Eligible':
      case 'No MSME':
      case 'No GST':
      case 'Personal Loan':
      case 'Start Up':
      case 'Asking Less than 5 Laks':
      case '3rd call completed':
      case 'By Mistake':
        return 'row-light-red';
      
      case 'Aadhar/PAN name mismatch':
      case 'MSME/GST Address Different':
        return 'row-light-orange';
      
      case 'Will call back':
      case '1st call completed':
      case '2nd call completed':
      case 'Switch off':
      case 'Not connected':
      default:
        return ''; // No color
    }
  }

  showAddForm(): void {
    this.showRegistrationForm = true;
    this.registrationForm.reset();
    this.registrationForm.patchValue({
      date: new Date(),
      gst: '' // Set default to empty, making it clear that GST selection is optional
    });
    this.isEditMode = false;
    this.editingEnquiryId = null;
  }

  hideAddForm(): void {
    this.showRegistrationForm = false;
    this.registrationForm.reset();
    this.isEditMode = false;
    this.editingEnquiryId = null;
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      const formData = this.registrationForm.value;
      
      // Clean up GST status if GST is Yes
      if (formData.gst === 'Yes') {
        // GST status is already handled by the form validation
      } else {
        // For No or empty GST, clear the GST status
        formData.gst_status = '';
      }

      // Combine country code with mobile numbers FIRST
      const countryCodeDigits = formData.country_code.replace('+', ''); // Remove + sign
      const fullMobileNumber = countryCodeDigits + formData.mobile_number;
      
      console.log('📱 Country code digits:', countryCodeDigits);
      console.log('📱 Mobile number digits:', formData.mobile_number);
      console.log('📱 Full mobile number:', fullMobileNumber);
      
      // Check for duplicate mobile number AFTER combining with country code
      if (this.checkMobileNumberExists(fullMobileNumber)) {
        this.snackBar.open('Mobile number already exists! Please use a different mobile number.', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      // Set the combined mobile number
      formData.mobile_number = fullMobileNumber;

      // Handle secondary mobile number - use the same country code as primary
      if (formData.secondary_mobile_number && formData.secondary_mobile_number.trim() !== '') {
        formData.secondary_mobile_number = countryCodeDigits + formData.secondary_mobile_number;
        console.log('📱 Secondary full mobile number:', formData.secondary_mobile_number);
      } else {
        formData.secondary_mobile_number = null;
      }

      // Remove country code fields from form data (don't send to backend)
      delete formData.country_code;

      // Set default comment if empty
      if (!formData.comments || formData.comments.trim() === '') {
        formData.comments = 'No comment provided';
      }

      // Handle GST field - preserve empty values for optional GST selection
      // Backend will store empty values as "Not Selected" for display purposes
      if (!formData.gst || formData.gst.trim() === '') {
        formData.gst = ''; // Send empty string to backend to indicate "Not Selected"
      }

      // Log the form data being sent for debugging
      console.log('📤 Form data being sent to backend:', formData);
      console.log('📤 Form validation status:', this.registrationForm.valid);
      console.log('📤 Form errors:', this.registrationForm.errors);

      if (this.isEditMode && this.editingEnquiryId) {
        this.enquiryService.updateEnquiry(this.editingEnquiryId, formData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (updatedEnquiry: any) => {
            let message = 'Enquiry updated successfully!';
            let panelClass = ['success-snackbar'];
            
            // Add WhatsApp status to notification
            if (updatedEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp status message sent!';
              // Show additional notification if available
              if (updatedEnquiry.whatsapp_notification) {
                this.snackBar.open(updatedEnquiry.whatsapp_notification, 'Close', { 
                  duration: 10000,
                  panelClass: ['success-snackbar']
                });
              }
            } else if (updatedEnquiry.whatsapp_sent === false) {
              // Show specific error message if available
              const whatsappError = updatedEnquiry.whatsapp_error || 'WhatsApp message failed to send';
              message += ` ⚠️ ${whatsappError}`;
              panelClass = ['error-snackbar'];
              
              // Show quota exceeded notification if applicable
              if (updatedEnquiry.whatsapp_notification) {
                this.snackBar.open(updatedEnquiry.whatsapp_notification, 'Close', { 
                  duration: 15000,
                  panelClass: ['warning-snackbar']
                });
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
            this.hideAddForm();
            this.loadEnquiries();
          },
          error: (error) => {
            console.error('Error updating enquiry:', error);
            console.error('Error response body:', error.error);
            console.error('Error status:', error.status);
            console.error('Error message:', error.message);
            
            let errorMessage = 'Error updating enquiry';
            if (error.error && error.error.error) {
              errorMessage = error.error.error;
            }
            
            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          }
        });
      } else {
        this.enquiryService.createEnquiry(formData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (newEnquiry: any) => {
            let message = 'Enquiry added successfully!';
            let panelClass = ['success-snackbar'];
            
            // Add WhatsApp status to notification
            if (newEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp welcome message sent!';
              // Show additional notification if available
              if (newEnquiry.whatsapp_notification) {
                this.snackBar.open(newEnquiry.whatsapp_notification, 'Close', { 
                  duration: 10000,
                  panelClass: ['success-snackbar']
                });
              }
            } else if (newEnquiry.whatsapp_sent === false) {
              // Show specific error message if available
              const whatsappError = newEnquiry.whatsapp_error || 'WhatsApp message failed to send';
              message += ` ⚠️ ${whatsappError}`;
              panelClass = ['error-snackbar'];
              
              // Show quota exceeded notification if applicable
              if (newEnquiry.whatsapp_notification) {
                this.snackBar.open(newEnquiry.whatsapp_notification, 'Close', { 
                  duration: 15000,
                  panelClass: ['warning-snackbar']
                });
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
            this.hideAddForm();
            this.loadEnquiries();
          },
          error: (error) => {
            console.error('Error creating enquiry:', error);
            console.error('Error response body:', error.error);
            console.error('Error status:', error.status);
            console.error('Error message:', error.message);
            
            let errorMessage = 'Error adding enquiry';
            if (error.error && error.error.error) {
              errorMessage = error.error.error;
            }
            
            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          }
        });
      }
    } else {
      console.log('Form is invalid. Errors:', this.registrationForm.errors);
      console.log('Form controls status:');
      Object.keys(this.registrationForm.controls).forEach(key => {
        const control = this.registrationForm.get(key);
        if (control && control.errors) {
          console.log(`${key}:`, control.errors);
        }
      });
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
    }
  }

  editEnquiry(enquiry: Enquiry): void {
    // Create a copy of the enquiry to avoid modifying the original
    const enquiryCopy: any = { ...enquiry };
    
    // Ensure GST field has a value (preserve empty values)
    if (enquiryCopy.gst === undefined || enquiryCopy.gst === null) {
      enquiryCopy.gst = '';
    }
    
    // Handle "Not Selected" case - convert back to empty string for the form
    if (enquiryCopy.gst === 'Not Selected') {
      enquiryCopy.gst = '';
    }
    
    // Split the mobile number into country code and number for editing
    const mobileParts = this.splitMobileNumber(enquiry.mobile_number);
    enquiryCopy.country_code = mobileParts.countryCode;
    enquiryCopy.mobile_number = mobileParts.number;
    
    // Handle secondary mobile number if it exists
    if (enquiry.secondary_mobile_number) {
      const secondaryParts = this.splitMobileNumber(enquiry.secondary_mobile_number);
      enquiryCopy.secondary_mobile_number = secondaryParts.number;
    }
    
    this.registrationForm.patchValue(enquiryCopy);
    this.showRegistrationForm = true;
    this.isEditMode = true;
    this.editingEnquiryId = enquiry._id || null;
  }

  deleteEnquiry(enquiry: Enquiry): void {
    if (confirm('Are you sure you want to delete this enquiry?')) {
      this.enquiryService.deleteEnquiry(enquiry._id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: () => {
          this.snackBar.open('Enquiry deleted successfully!', 'Close', { duration: 3000 });
          this.loadEnquiries();
        },
        error: (error) => {
          console.error('Error deleting enquiry:', error);
          this.snackBar.open('Error deleting enquiry', 'Close', { duration: 3000 });
        }
      });
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN');
  }

  goBack(): void {
    window.history.back();
  }

  // WhatsApp Status Methods
  getWhatsAppStatusIcon(enquiry: Enquiry): string {
    if (enquiry.whatsapp_sent === true) {
      return 'check_circle';
    } else if (enquiry.whatsapp_sent === false) {
      return 'error';
    }
    return 'help_outline';
  }

  getWhatsAppStatusColor(enquiry: Enquiry): string {
    if (enquiry.whatsapp_sent === true) {
      return 'success';
    } else if (enquiry.whatsapp_sent === false) {
      return 'error';
    }
    return 'disabled';
  }

  getWhatsAppStatusTooltip(enquiry: Enquiry): string {
    if (enquiry.whatsapp_sent === true) {
      return `WhatsApp message sent successfully${enquiry.whatsapp_message_type ? ' (' + enquiry.whatsapp_message_type + ')' : ''}`;
    } else if (enquiry.whatsapp_sent === false) {
      return `WhatsApp message failed: ${enquiry.whatsapp_error || 'Unknown error'}`;
    }
    return 'WhatsApp status unknown';
  }

  // WhatsApp Test Method (Admin only)
  testWhatsApp(enquiry: Enquiry): void {
    if (confirm(`Send test WhatsApp message to ${enquiry.wati_name} (${this.displayMobileNumber(enquiry.mobile_number)})?`)) {
      this.loading = true;
      
      // Validate phone number format before sending
      const phoneNumber = enquiry.mobile_number;
      if (!phoneNumber) {
        this.loading = false;
        this.snackBar.open(`❌ WhatsApp test failed: Mobile number is required`, 'Close', { 
          duration: 10000,
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      const testData = {
        mobile_number: phoneNumber,
        wati_name: enquiry.wati_name,
        message_type: 'new_enquiry'
      };

      this.enquiryService.testWhatsApp(testData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (response: any) => {
          this.loading = false;
          
          if (response.success) {
            // Check if this is a test mode response
            if (response.test_mode) {
              this.snackBar.open(`🧪 WhatsApp test simulated successfully for ${enquiry.wati_name} (${this.displayMobileNumber(phoneNumber)}) - Test mode bypasses quota restrictions`, 'Close', { 
                duration: 8000,
                panelClass: ['success-snackbar']
              });
            } else if (response.mock_response && response.quota_exceeded) {
              this.snackBar.open(`🧪 WhatsApp test simulated for ${enquiry.wati_name} (${this.displayMobileNumber(phoneNumber)}) - Quota exceeded, showing mock success`, 'Close', { 
                duration: 8000,
                panelClass: ['warning-snackbar']
              });
            } else {
              // Real success message
              this.snackBar.open(`✅ WhatsApp message sent successfully to ${enquiry.wati_name} (${this.displayMobileNumber(phoneNumber)})`, 'Close', { 
                duration: 6000,
                panelClass: ['success-snackbar']
              });
            }
          } else {
            // Handle different error types
            if (response.status_code === 466 || response.quota_exceeded) {
              // Show quota reached message
              this.snackBar.open(`📊 Quota reached in GreenAPI - Upgrade plan to send more messages`, 'Close', { 
                duration: 8000,
                panelClass: ['warning-snackbar']
              });
            } else {
              // Handle other errors with appropriate messages
              let errorMessage = response.error || 'Unknown error';
              
              if (response.status_code === 401) {
                errorMessage = 'GreenAPI authentication failed - Check API credentials';
              } else if (response.status_code === 403) {
                errorMessage = 'GreenAPI access forbidden - Check API permissions';
              } else if (response.status_code === 400) {
                errorMessage = 'Invalid phone number format or WhatsApp not available for this number';
              } else if (response.status_code === 404) {
                errorMessage = 'GreenAPI endpoint not found - Check API configuration';
              }
              
              this.snackBar.open(`❌ WhatsApp test failed: ${errorMessage}`, 'Close', { 
                duration: 10000,
                panelClass: ['error-snackbar']
              });
            }
          }
        }
      });
    }
  }

  // Check if current user is admin (for WhatsApp test button)
  isAdmin(): boolean {
    // Add your admin check logic here
    // This could be based on user role, permissions, etc.
    return true; // For now, allow all users to test
  }


  // Display mobile number in readable format for table
  displayMobileNumber(mobileNumber: string): string {
    if (!mobileNumber) return '-';
    
    // Handle different country codes
    const countryCodeMap: { [key: string]: string } = {
      '91': '+91',   // India
      '1': '+1',     // USA/Canada
      '44': '+44',   // UK
      '971': '+971', // UAE
      '966': '+966', // Saudi Arabia
      '65': '+65',   // Singapore
      '60': '+60',   // Malaysia
      '61': '+61',   // Australia
      '49': '+49',   // Germany
      '33': '+33'    // France
    };
    
    // Check for different country code patterns
    for (const [code, display] of Object.entries(countryCodeMap)) {
      if (mobileNumber.startsWith(code)) {
        const number = mobileNumber.substring(code.length);
        if (number.length >= 10) {
          // Format as +CC XXXXX XXXXX for 10+ digit numbers
          return `${display} ${number.substring(0, 5)} ${number.substring(5)}`;
        }
      }
    }
    
    // If no country code pattern matches, return as is
    return mobileNumber;
  }

  // Split combined mobile number into country code and number
  splitMobileNumber(mobileNumber: string): { countryCode: string; number: string } {
    if (!mobileNumber) {
      return { countryCode: '+91', number: '' }; // Default to India
    }
    
    // Check for different country codes in order of length (longest first)
    const countryCodes = ['971', '966', '65', '61', '60', '49', '44', '33', '91', '1'];
    
    for (const code of countryCodes) {
      if (mobileNumber.startsWith(code)) {
        const number = mobileNumber.substring(code.length);
        const countryCode = `+${code}`;
        return { countryCode, number };
      }
    }
    
    // If no country code matches, default to India
    return { countryCode: '+91', number: mobileNumber };
  }

  // Add method to show notification when GreenAPI limit is reached
  showGreenApiLimitNotification(): void {
    this.snackBar.open(
      '⚠️ GreenAPI monthly quota exceeded. Please upgrade your GreenAPI plan to send messages to more numbers.', 
      'Close', 
      { 
        duration: 15000,
        panelClass: ['warning-snackbar']
      }
    );
  }

  // Add method to show message sent notification
  showMessageSentNotification(enquiry: Enquiry): void {
    this.snackBar.open(
      `✅ WhatsApp message sent to ${enquiry.wati_name} (${this.displayMobileNumber(enquiry.mobile_number)})`, 
      'Close', 
      { 
        duration: 5000,
        panelClass: ['success-snackbar']
      }
    );
  }
}
