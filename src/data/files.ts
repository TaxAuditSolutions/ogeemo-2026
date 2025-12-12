
export const REPORT_TEMPLATE_MIMETYPE = 'application/vnd.og-report-template+html';

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number; // in bytes
  modifiedAt: Date;
  folderId: string;
  userId: string;
  storagePath: string;
  content?: string;
  googleFileId?: string;
  driveLink?: string; // Link to Google Drive file
}

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string | null;
  userId: string;
  createdAt: Date;
  driveLink?: string;
}

// NOTE: Mock data below is for demonstration in other components
// and is NOT used by the main Files Manager view.
// A 'userId' of 'mock-user' is used as a placeholder.

export const mockFolders: Omit<FolderItem, 'userId' | 'createdAt'>[] = [
  { id: 'folder-reports', name: 'Report Templates', parentId: null },
  { id: 'folder-1', name: 'Client Documents', parentId: null },
  { id: 'folder-2', name: 'Invoices', parentId: 'folder-1' },
  { id: 'folder-3', name: 'Marketing Assets', parentId: 'folder-1' },
  { id: 'folder-4', name: 'Internal Projects', parentId: null },
  { id: 'folder-5', name: 'Website V2', parentId: 'folder-4' },
  { id: 'folder-6', name: 'Design', parentId: 'folder-5' },
  { id: 'folder-7', name: 'Development', parentId: 'folder-5' },
];

export const mockFiles: Omit<FileItem, 'userId'>[] = [
  {
    id: 'file-1',
    name: 'Website_Redesign_Brief.pdf',
    type: 'application/pdf',
    size: 1204857,
    modifiedAt: new Date('2024-07-20T10:00:00Z'),
    folderId: 'folder-6',
    storagePath: 'mock/path/file-1.pdf',
  },
  {
    id: 'file-2',
    name: 'Q1_Financials.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 34567,
    modifiedAt: new Date('2024-07-21T14:30:00Z'),
    folderId: 'folder-1',
    storagePath: 'mock/path/file-2.xlsx',
  },
  {
    id: 'file-3',
    name: 'Invoice_INV-2024-001.pdf',
    type: 'application/pdf',
    size: 78234,
    modifiedAt: new Date('2024-07-22T09:00:00Z'),
    folderId: 'folder-2',
    storagePath: 'mock/path/file-3.pdf',
  },
  {
    id: 'file-4',
    name: 'Invoice_INV-2024-002.pdf',
    type: 'application/pdf',
    size: 81234,
    modifiedAt: new Date('2024-07-25T11:00:00Z'),
    folderId: 'folder-2',
    storagePath: 'mock/path/file-4.pdf',
  },
  {
    id: 'file-5',
    name: 'logo_final.png',
    type: 'image/png',
    size: 56345,
    modifiedAt: new Date('2024-07-19T18:00:00Z'),
    folderId: 'folder-3',
    storagePath: 'mock/path/file-5.png',
  },
  {
    id: 'file-6',
    name: 'social_media_banner.jpg',
    type: 'image/jpeg',
    size: 980432,
    modifiedAt: new Date('2024-07-23T16:45:00Z'),
    folderId: 'folder-3',
    storagePath: 'mock/path/file-6.jpg',
  },
  {
    id: 'file-7',
    name: 'api-endpoints.json',
    type: 'application/json',
    size: 1234,
    modifiedAt: new Date('2024-07-26T10:15:00Z'),
    folderId: 'folder-7',
    storagePath: 'mock/path/file-7.json',
  },
  {
    id: 'file-8',
    name: 'Component.tsx',
    type: 'text/javascript',
    size: 2456,
    modifiedAt: new Date('2024-07-26T11:30:00Z'),
    folderId: 'folder-7',
    storagePath: 'mock/path/file-8.tsx',
  },
  {
    id: 'file-9',
    name: 'landing-page-v1.fig',
    type: 'application/octet-stream',
    size: 4500123,
    modifiedAt: new Date('2024-07-24T09:00:00Z'),
    folderId: 'folder-6',
    storagePath: 'mock/path/file-9.fig',
  },
  {
    id: 'file-10',
    name: 'landing-page-v2.fig',
    type: 'application/octet-stream',
    size: 5100234,
    modifiedAt: new Date('2024-07-25T15:20:00Z'),
    folderId: 'folder-6',
    storagePath: 'mock/path/file-10.fig',
  },
  {
    id: 'file-11',
    name: 'How to create voice to text in a manager.',
    type: REPORT_TEMPLATE_MIMETYPE,
    size: 2800,
    modifiedAt: new Date(),
    folderId: 'folder-reports',
    storagePath: 'mock/path/file-11.html',
    content: `<h3>How to Create a Voice-to-Text Feature</h3>...`
  },
];
