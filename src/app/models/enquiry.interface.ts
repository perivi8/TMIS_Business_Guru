export interface Enquiry {
  _id?: string;
  sno?: number;
  date: Date;
  wati_name: string;
  user_name?: string;
  mobile_number: string;
  secondary_mobile_number?: string;
  gst: 'Yes' | 'No';
  gst_status?: 'Active' | 'Cancel';
  business_type?: string;
  staff: string;
  comments: string;
  additional_comments?: string;
  created_at?: Date;
  updated_at?: Date;
}

export const COMMENT_OPTIONS = [
  'Will share Doc',
  'Doc Shared(Yet to Verify)',
  'Verified(Shortlisted)',
  'Not Eligible',
  'No MSME',
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
  'Not connected'
];
