
'use server';

import { google } from 'googleapis';
import { adminDb as db, getAdminStorage } from '@/lib/firebase-admin';
import { type FileItem } from '@/data/files';
import {
  GetGoogleContactsOutput,
  GoogleContact,
} from '@/types/google';
import stream from 'stream';

export async function getGoogleContacts(
  accessToken: string
): Promise<GetGoogleContactsOutput> {
  if (!accessToken) {
    throw new Error('Google access token is required.');
  }

  const response = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Ensure fresh data is fetched every time
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Google People API Error:', errorData);
    throw new Error(
      `Failed to fetch Google Contacts: ${
        errorData.error?.message || 'Unknown error'
      }`
    );
  }

  const data = await response.json();
  const connections = data.connections || [];
  const validatedContacts = connections
    .map((conn: any) => {
        if (conn.names?.[0]?.displayName && conn.emailAddresses?.[0]?.value) {
            return {
                resourceName: conn.resourceName,
                names: conn.names,
                emailAddresses: conn.emailAddresses,
                phoneNumbers: conn.phoneNumbers,
            } as GoogleContact;
        }
        return null;
    })
    .filter(Boolean) as GoogleContact[];

  return { contacts: validatedContacts };
}

async function getGoogleAuth(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
}

export async function createGoogleDriveFile(params: {
    fileName: string;
    fileType: 'doc' | 'sheet' | 'slide';
}): Promise<{ driveLink: string; googleFileId: string; mimeType: string }> {
    const { fileType } = params;

    const creationUrls = {
        doc: 'https://docs.google.com/document/create',
        sheet: 'https://docs.google.com/spreadsheets/create',
        slide: 'https://docs.google.com/presentation/create',
    };

    const mimeTypeMap = {
        doc: 'application/vnd.google-apps.document',
        sheet: 'application/vnd.google-apps.spreadsheet',
        slide: 'application/vnd.google-apps.presentation',
    };

    const driveLink = creationUrls[fileType];
    // Since we are just linking, we don't have a real Google File ID.
    // We create a placeholder ID to signify it's a link to a new document.
    const googleFileId = `new-google-${fileType}-${Date.now()}`;
    const mimeType = mimeTypeMap[fileType];


    if (!driveLink) {
        throw new Error(`Invalid file type specified: ${fileType}`);
    }

    return { driveLink, googleFileId, mimeType };
}


// Uploads a file from Firebase Storage to Google Drive and returns the link
export async function uploadToDriveAndGetLink(params: { fileName: string, storagePath: string, accessToken: string }): Promise<{ driveLink: string, googleFileId: string }> {
    const { fileName, storagePath, accessToken } = params;

    const auth = await getGoogleAuth(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    const bucket = getAdminStorage().bucket();
    const fileStream = bucket.file(storagePath).createReadStream();

    const fileMetadata = { name: fileName };
    const media = { body: fileStream };
    
    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });
    
    const googleFileId = response.data.id;
    const driveLink = response.data.webViewLink;

    if (!googleFileId || !driveLink) {
        throw new Error('Failed to create file in Google Drive or get a valid link.');
    }
    
    // Make the file publicly accessible (or share with specific users)
    await drive.permissions.create({
        fileId: googleFileId,
        requestBody: {
            role: 'writer',
            type: 'anyone',
        },
    });

    return { driveLink, googleFileId };
}

// Saves an updated file from Google Drive back to Firebase Storage
export async function saveFromDriveToFirebase(params: { storagePath: string; googleDriveFileId: string; accessToken: string; }): Promise<void> {
    const { storagePath, googleDriveFileId, accessToken } = params;
    
    const auth = await getGoogleAuth(accessToken);
    const drive = google.drive({ version: 'v3', auth });
    
    // 1. Get the file content from Google Drive
    const response = await drive.files.get(
        { fileId: googleDriveFileId, alt: 'media' },
        { responseType: 'stream' }
    );

    const driveStream = response.data as stream.Readable;

    // 2. Get a reference to the Firebase Storage file
    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);
    
    // 3. Create a writable stream to Firebase Storage
    const firebaseStream = file.createWriteStream();

    // 4. Pipe the data from Drive to Firebase Storage
    await new Promise((resolve, reject) => {
        driveStream.pipe(firebaseStream)
            .on('finish', resolve)
            .on('error', reject);
    });
}
