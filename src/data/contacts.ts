
export interface Contact {
  id: string;
  name: string;
  email?: string;
  birthDate?: string;
  website?: string;
  businessName?: string;
  employeeNumber?: string; // Used as User ID / Worker ID
  industryCode?: string;
  craProgramAccountNumber?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
  homeAddress?: {
    street?: string;
    city?: string;
    provinceState?: string;
    country?: string;
    postalCode?: string;
  };
  businessPhone?: string;
  cellPhone?: string;
  homePhone?: string;
  faxNumber?: string;
  primaryPhoneType?: 'businessPhone' | 'cellPhone' | 'homePhone' | null;
  notes?: string;
  folderId: string;
  userId: string;
  documentFolderId?: string; // The linked folder in Document Manager
  status?: string; // CRM Status
  keywords?: string[];
  
  // HR & Payroll Specialized Metadata (Integrated from deprecated collection)
  sin?: string;
  workerType?: 'employee' | 'contractor';
  payType?: 'hourly' | 'salary';
  payRate?: number;
  hireDate?: any; // Date or Timestamp
  startDate?: any; // Date or Timestamp
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hasContract?: boolean;
  specialNeeds?: string;
}

export const mockFolders = [];
export const mockContacts = [];
