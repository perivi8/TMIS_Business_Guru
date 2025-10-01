import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnquiryService } from '../../services/enquiry.service';
import { UserService, User } from '../../services/user.service';
import { Enquiry, COMMENT_OPTIONS } from '../../models/enquiry.interface';

@Component({
  selector: 'app-enquiry',
  templateUrl: './enquiry.component.html',
  styleUrls: ['./enquiry.component.scss']
})
export class EnquiryComponent implements OnInit {
  enquiries: Enquiry[] = [];
  filteredEnquiries: Enquiry[] = [];
  displayedColumns: string[] = [
    'sno', 'date', 'wati_name', 'user_name', 'mobile_number', 
    'secondary_mobile_number', 'gst', 'business_type', 'staff', 
    'comments', 'additional_comments', 'actions'
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

  predefinedComments = [
    'Will share Doc',
    'Doc Shared(Yet to Verify)',
    'Verified(Shortlisted)',
    'Not Eligible',
    'No MSME',
    'No GST',
    'Aadhar/PAN name mismatch',
    'MSME/GST Adress Different',
    'Will call back',
    'Personal Loan',
    'Start Up',
    'Asking Less than 5 Laks',
    '1st call completed',
    '2nd call completed',
    '3rd call completed',
    'Switch off',
    'Not connected',
    'By Mistake'
  ];

  // Interest level categorization
  interestComments = [
    'Will share Doc',
    'Doc Shared(Yet to Verify)',
    'Verified(Shortlisted)',
    'Will call back'
  ];

  notInterestedComments = [
    'Not Eligible',
    'No MSME',
    'Personal Loan',
    'Start Up',
    'Asking Less than 5 Laks',
    '3rd call completed',
    'By Mistake'
  ];

  pendingComments = [
    'Aadhar/PAN name mismatch',
    'MSME/GST Adress Different'
  ];

  unknownComments = [
    '1st call completed',
    '2nd call completed',
    'Switch off',
    'Not connected'
  ];

  // Alias for template compatibility
  commentOptions = this.predefinedComments;

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

  createRegistrationForm(): FormGroup {
    return this.fb.group({
      date: [new Date(), Validators.required],
      wati_name: ['', Validators.required],
      user_name: [''],
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      secondary_mobile_number: [''],
      gst: ['No', Validators.required],
      gst_status: [''],
      business_type: [''],
      staff: ['', Validators.required],
      comments: ['', Validators.required],
      additional_comments: ['']
    });
  }

  loadEnquiries(): void {
    this.loading = true;
    this.enquiryService.getAllEnquiries().subscribe({
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
    this.userService.getUsers().subscribe({
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
      } else if (this.gstFilter === 'no') {
        // Show GST No OR GST Yes with Cancel status
        filtered = filtered.filter(enquiry => 
          enquiry.gst === 'No' || (enquiry.gst === 'Yes' && enquiry.gst_status === 'Cancel')
        );
      }
    }

    // Apply interest level filter
    if (this.interestFilter !== 'all') {
      if (this.interestFilter === 'interested') {
        filtered = filtered.filter(enquiry => 
          this.interestComments.includes(enquiry.comments) && 
          (enquiry.gst === 'Yes' && enquiry.gst_status === 'Active')
        );
      } else if (this.interestFilter === 'not_interested') {
        filtered = filtered.filter(enquiry => 
          this.notInterestedComments.includes(enquiry.comments)
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
      case 'pending': return 'Pending';
      case 'unknown': return 'Unknown';
      default: return '';
    }
  }

  getRowColorClass(enquiry: Enquiry): string {
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
      case 'MSME/GST Adress Different':
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
      gst: 'No'
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
      
      // Clean up GST status if GST is No
      if (formData.gst === 'No') {
        formData.gst_status = '';
      }

      // Clean up secondary mobile number - remove if empty
      if (!formData.secondary_mobile_number || formData.secondary_mobile_number.trim() === '') {
        formData.secondary_mobile_number = null;
      }

      // Log the form data being sent for debugging
      console.log('Form data being sent to backend:', formData);
      console.log('Form validation status:', this.registrationForm.valid);
      console.log('Form errors:', this.registrationForm.errors);

      if (this.isEditMode && this.editingEnquiryId) {
        this.enquiryService.updateEnquiry(this.editingEnquiryId, formData).subscribe({
          next: (updatedEnquiry) => {
            this.snackBar.open('Enquiry updated successfully!', 'Close', { duration: 3000 });
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
        this.enquiryService.createEnquiry(formData).subscribe({
          next: (newEnquiry) => {
            this.snackBar.open('Enquiry added successfully!', 'Close', { duration: 3000 });
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
    this.registrationForm.patchValue(enquiry);
    this.showRegistrationForm = true;
    this.isEditMode = true;
    this.editingEnquiryId = enquiry._id || null;
  }

  deleteEnquiry(enquiry: Enquiry): void {
    if (confirm('Are you sure you want to delete this enquiry?')) {
      this.enquiryService.deleteEnquiry(enquiry._id!).subscribe({
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
}
