import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnquiryService } from '../../services/enquiry.service';

@Component({
  selector: 'app-public-enquiry',
  templateUrl: './public-enquiry.component.html',
  styleUrls: ['./public-enquiry.component.scss']
})
export class PublicEnquiryComponent implements OnInit {
  enquiryForm: FormGroup;
  isSubmitting = false;
  isSubmitted = false;

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

  // Business type options
  businessTypeOptions = [
    'Private Limited',
    'Proprietorship', 
    'Partnership'
  ];

  // Status options
  statusOptions = [
    'Active',
    'Cancel'
  ];

  constructor(
    private fb: FormBuilder,
    private enquiryService: EnquiryService,
    private snackBar: MatSnackBar
  ) {
    this.enquiryForm = this.createEnquiryForm();
  }

  ngOnInit(): void {
    // Component initialization
  }

  createEnquiryForm(): FormGroup {
    return this.fb.group({
      client_name: ['', Validators.required],
      country_code: ['+91', Validators.required], // Default to India
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      secondary_mobile_number: ['', Validators.pattern(/^\d{10}$/)],
      business_type: [''],
      business_nature: [''],
      gst: [''],
      gst_status: [''],
      status: ['Active'] // Default to Active
    });
  }

  onGstChange(): void {
    const gstValue = this.enquiryForm.get('gst')?.value;
    const gstStatusControl = this.enquiryForm.get('gst_status');
    
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

  onSubmit(): void {
    if (this.enquiryForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formData = this.enquiryForm.value;
      
      // Combine country code with mobile numbers
      const countryCodeDigits = formData.country_code.replace('+', '');
      const fullMobileNumber = countryCodeDigits + formData.mobile_number;
      
      // Prepare the enquiry data
      const enquiryData = {
        date: new Date(),
        wati_name: formData.client_name,
        user_name: '', // Empty for public enquiries
        mobile_number: fullMobileNumber,
        secondary_mobile_number: formData.secondary_mobile_number ? 
          countryCodeDigits + formData.secondary_mobile_number : null,
        business_type: formData.business_type || '',
        business_nature: formData.business_nature || '',
        gst: formData.gst || '',
        gst_status: formData.gst_status || '',
        staff: '', // Will be assigned manually later
        comments: 'Public enquiry submission',
        additional_comments: `Status: ${formData.status || 'Active'}`
      };

      console.log('Submitting public enquiry:', enquiryData);

      this.enquiryService.createPublicEnquiry(enquiryData).subscribe({
        next: (response) => {
          console.log('Public enquiry created successfully:', response);
          this.isSubmitted = true;
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error creating public enquiry:', error);
          this.isSubmitting = false;
          
          let errorMessage = 'Sorry, there was an error submitting your enquiry. Please try again.';
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 3000 });
    }
  }

  resetForm(): void {
    this.enquiryForm.reset();
    this.enquiryForm.patchValue({
      country_code: '+91',
      status: 'Active'
    });
    this.isSubmitted = false;
  }

  closeWindow(): void {
    window.close();
  }
}
