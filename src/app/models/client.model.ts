export interface Client {
  _id?: string;
  user_name?: string;
  email?: string;
  mobile_number?: string;
  legal_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  business_name?: string;
  business_type?: string;
  gst_number?: string;
  pan_number?: string;
  aadhar_number?: string;
  business_address?: string;
  business_district?: string;
  business_state?: string;
  business_pincode?: string;
  status?: 'active' | 'pending' | 'rejected' | 'inactive' | string;
  feedback?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  trade_name?: string;
  documents?: {
    gst_document?: string;
    bank_statement?: string;
    [key: string]: any;
  };
  [key: string]: any; // For any additional properties
}
