'use server';

/**
 * @fileOverview This service has been minimalized to save disk space. 
 * Heavy dependencies like 'googleapis' have been removed.
 */

export async function getGoogleContacts(accessToken: string): Promise<{ contacts: any[] }> {
  console.warn("Google Contacts integration is currently disabled to save disk space.");
  return { contacts: [] };
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
