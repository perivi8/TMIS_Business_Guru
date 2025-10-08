// Simplified interface with common properties and flexible typing
export interface Enquiry {
  _id?: string;
  sno?: number;
  date?: Date | string;
  wati_name?: string;
  user_name?: string;
  mobile_number?: string;
  secondary_mobile_number?: string;
  gst?: string;
  gst_status?: string;
  business_type?: string;
  business_nature?: string;
  staff?: string;
  comments?: string;
  additional_comments?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  whatsapp_sent?: boolean;
  whatsapp_message_id?: string;
  whatsapp_message_type?: string;
  whatsapp_error?: string;
  [key: string]: any; // For any additional properties
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
