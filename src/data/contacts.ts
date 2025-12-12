
export interface Contact {
  id: string;
  name: string;
  email: string;
  website?: string;
  businessName?: string;
  industryCode?: string;
  craProgramAccountNumber?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  country?: string;
  postalCode?: string;
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
  folderId: string;
  notes?: string;
  userId: string;
  keywords?: string[];
}

export interface FolderData {
  id: string;
  name: string;
  parentId?: string | null;
  userId: string;
  createdAt: Date;
}

// NOTE: Mock data below is for demonstration in other components
// and is NOT used by the main Contacts Manager view.
// A 'userId' of 'mock-user' is used as a placeholder.

export const mockFolders: Readonly<Omit<FolderData, 'userId' | 'createdAt'>[]> = [
  { id: '1', name: 'Personal', parentId: null },
  { id: '2', name: 'Work', parentId: null },
  { id: '3', name: 'Leads', parentId: '2' },
];

export const mockContacts: Readonly<Omit<Contact, 'userId'>[]> = [
  { id: 'c1', name: 'Alice Johnson', email: 'alice@example.com', website: 'https://creative.example.com', businessName: 'Creative Solutions', streetAddress: '123 Creative Way', city: 'Art City', provinceState: 'CA', postalCode: '12345', country: 'USA', cellPhone: '123-456-7890', primaryPhoneType: 'cellPhone', folderId: '1', notes: 'Met at the 2023 conference. Interested in our enterprise package.' },
  { id: 'c2', name: 'Bob Williams', email: 'bob@example.com', businessName: 'Williams & Co.', streetAddress: '456 Oak Avenue', city: 'Builder Town', provinceState: 'TX', postalCode: '67890', country: 'USA', homePhone: '234-567-8901', primaryPhoneType: 'homePhone', folderId: '1', notes: 'Long-time personal friend.' },
  { id: 'c3', name: 'Charlie Brown', email: 'charlie@work.com', website: 'https://phoenix.example.com', businessName: 'Phoenix Corp', streetAddress: '789 Phoenix Blvd', city: 'Corporate Park', provinceState: 'NY', postalCode: '11223', country: 'USA', businessPhone: '345-678-9012', primaryPhoneType: 'businessPhone', folderId: '2', notes: 'Key contact for Project Phoenix.' },
  { id: 'c4', name: 'Diana Miller', email: 'diana@work.com', businessName: 'Phoenix Corp', streetAddress: '789 Phoenix Blvd', city: 'Corporate Park', provinceState: 'NY', postalCode: '11223', country: 'USA', cellPhone: '456-789-0123', primaryPhoneType: 'cellPhone', folderId: '2', notes: '' },
  { id: 'c5', name: 'Eve Davis', email: 'eve@work.com', businessName: 'Global Tech', streetAddress: '1 Global Plaza', city: 'Tech City', provinceState: 'WA', postalCode: '44556', country: 'USA', businessPhone: '567-890-1234', faxNumber: '567-890-9999', primaryPhoneType: 'businessPhone', folderId: '2', notes: 'Prefers communication via email.' },
  { id: 'c6', name: 'Frank White', email: 'frank.lead@example.com', businessName: 'Innovate LLC', streetAddress: '2 Innovate Road', city: 'Startup Valley', provinceState: 'CA', postalCode: '77889', country: 'USA', cellPhone: '678-901-2345', primaryPhoneType: 'cellPhone', folderId: '3', notes: 'Follow up next week regarding the proposal.' },
];

    