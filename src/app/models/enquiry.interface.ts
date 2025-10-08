export interface Enquiry {
  _id?: string;
  sno?: number;
  date: Date;
  wati_name: string;
  legal_name?: string;
  user_name?: string;
  mobile_number: string;
  secondary_mobile_number?: string;
  gst: 'Yes' | 'No' | 'Not Selected' | '';
  gst_status?: 'Active' | 'Cancel' | 'Not Active';
  business_type?: string;
  business_nature?: string;
  staff: string;
  comments: string;
  additional_comments?: string;
  created_at?: Date;
  updated_at?: Date;
  // Shortlisted status
  shortlisted?: boolean;
  shortlisted_at?: Date;
  // Client existence check
  clientExists?: boolean;
  // WhatsApp integration fields
  whatsapp_sent?: boolean;
  whatsapp_message_id?: string;
  whatsapp_message_type?: string;
  whatsapp_error?: string;
}