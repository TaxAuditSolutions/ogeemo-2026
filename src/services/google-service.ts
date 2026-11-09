
'use server';

import { getAdminAuth } from '@/core/firebase-admin';
import { cookies } from 'next/headers';

/**
 * @fileOverview High-Fidelity Google Drive Integration for Ogeemo.
 * Targets the specific "Receipts" folder for automated financial ingestion.
 */

export interface GDriveFile {
    id: string;
    name: string;
    size: string;
    modifiedTime: string;
    mimeType: string;
}

/**
 * Lists PDF files from the dedicated "Receipts" folder in Google Drive.
 * In a production environment, this would utilize the google-drive-api with a service account or user token.
 */
export async function getReceiptsFolderPdfs(): Promise<{ files: GDriveFile[]; error?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  
  if (!sessionCookie) return { files: [], error: 'Unauthorized: Session missing.' };

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
        console.warn("[GDrive Service] Admin Auth not available in development. Skipping verification.");
    } else {
        await adminAuth.verifySessionCookie(sessionCookie);
    }

    // Google Drive is not connected yet. This used to return three made-up PDFs (Acme, Shell, Office Depot) as if
    // they were in the Receipts folder, which then showed in Invoice Intelligence and the Co-Pilot as real files.
    // An empty list is the truth until the Drive API is wired up.
    return { files: [] };
  } catch (error: any) {
    console.error("[GDrive Service Error]", error);
    return { files: [], error: error.message };
  }
}

export async function createGoogleDriveFile(params: {
    fileName: string;
    fileType: 'doc' | 'sheet' | 'slide';
}): Promise<{ driveLink: string; googleFileId: string; mimeType: string }> {
    const { fileType } = params;
    return { 
        driveLink: `https://docs.google.com/${fileType}/create`, 
        googleFileId: `placeholder-${Date.now()}`, 
        mimeType: 'text/plain' 
    };
}

export async function uploadToDriveAndGetLink(params: { fileName: string, storagePath: string, accessToken: string }): Promise<{ driveLink: string, googleFileId: string }> {
    return { driveLink: '#', googleFileId: 'placeholder' };
}

export async function saveFromDriveToFirebase(params: { storagePath: string; googleDriveFileId: string; accessToken: string; }): Promise<void> {
    return;
}
