
export interface Contact {
  id: string;
  name: string;
  email?: string;
  birthDate?: string;
  website?: string;
  businessName?: string;
  employeeNumber?: string;
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
  status?: string;
  keywords?: string[];
}

export const mockFolders = [];
export const mockContacts = [];

    