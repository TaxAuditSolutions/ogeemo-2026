
export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  parentId: string | null;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
  userId?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | string;
  size: number;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  modifiedAt: Date;
  folderId: string;
  userId?: string;
  storagePath?: string;
  url?: string;
  content?: string;
  keywords?: string[];
}

export const mockFolders: FolderItem[] = [];
export const mockFiles: FileItem[] = [];
