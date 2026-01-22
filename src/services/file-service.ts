
'use client';

import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    writeBatch,
    Timestamp,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, deleteObject, getBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseServices } from '@/firebase';
import type { FileItem, FolderItem } from '@/data/files';
import { onAuthStateChanged, type Auth } from 'firebase/auth';
import { findOrCreateFileFolder as findOrCreateGenericFolder } from '@/services/file-manager-folders';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { fetchFileContent } from '@/app/actions/file-actions';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FILES_COLLECTION = 'files';
export const SITE_IMAGES_FOLDER_ID = 'folder-site-images';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}
function getAppStorage() {
    const { storage } = getFirebaseServices();
    return storage;
}

function getFunctionsService() {
    const { functions } = getFirebaseServices();
    return functions;
}

const docToFile = (doc: any): FileItem => ({ 
    id: doc.id, 
    ...doc.data(),
    modifiedAt: (doc.data().modifiedAt as Timestamp)?.toDate() || new Date(),
} as FileItem);

const generateKeywords = (name: string): string[] => {
    const keywords = new Set<string>();
    const lowerCaseName = name.toLowerCase();
    keywords.add(lowerCaseName);
    lowerCaseName.split(/[\s-._]+/).forEach(part => {
        if (part) keywords.add(part);
    });
    return Array.from(keywords);
};


// --- File functions ---
export async function getFiles(userId?: string): Promise<FileItem[]> {
  const db = getDb();
  const q = userId ? query(collection(db, FILES_COLLECTION), where("userId", "==", userId)) : collection(db, FILES_COLLECTION);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFile);
}

export async function getFileById(fileId: string): Promise<FileItem | null> {
    const db = getDb();
    const fileRef = doc(db, FILES_COLLECTION, fileId);
    const fileSnap = await getDoc(fileRef);
    if (!fileSnap.exists()) {
        return null;
    }
    const fileData = docToFile(fileSnap);
    
    // Server action handles content fetching securely
    const { content, error } = await fetchFileContent(fileId);
    if (error) {
        console.warn(`Could not fetch content for file ${fileId}: ${error}`);
        return fileData; // Return metadata even if content fails
    }
    
    return { ...fileData, content };
}


export async function getFilesForFolder(userId: string, folderId: string): Promise<FileItem[]> {
  const db = getDb();
  const q = query(collection(db, FILES_COLLECTION), where("userId", "==", userId), where("folderId", "==", folderId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFile);
}

export async function addFileRecord(fileData: Omit<FileItem, 'id'>): Promise<FileItem> {
    const db = getDb();
    const dataWithKeywords = { ...fileData, keywords: generateKeywords(fileData.name) };
    const docRef = await addDoc(collection(db, FILES_COLLECTION), dataWithKeywords);
    return { id: docRef.id, ...dataWithKeywords };
}

export async function addFile(formData: FormData): Promise<FileItem> {
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    let folderId = formData.get('folderId') as string;

    if (!file || !userId || folderId === null || folderId === undefined) {
        throw new Error("Missing required data for file upload.");
    }
    
    if (folderId === 'unfiled') {
        folderId = '';
    }

    const storage = getAppStorage();
    const storagePath = `userFiles/${userId}/${folderId || 'unfiled'}/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, storagePath);
    
    await uploadBytes(fileRef, file);

    const newFileRecord: Omit<FileItem, 'id'> = {
        name: file.name,
        type: file.type,
        size: file.size,
        modifiedAt: new Date(),
        folderId,
        userId,
        storagePath,
    };

    return addFileRecord(newFileRecord);
}

export async function updateFile(fileId: string, data: Partial<Omit<FileItem, 'id' | 'userId' | 'content'>> & { content?: string, keywords?: string[] }): Promise<void> {
    const db = getDb();
    const fileRef = doc(db, FILES_COLLECTION, fileId);

    const fileSnap = await getDoc(fileRef);
    if (!fileSnap.exists()) throw new Error("File not found to update.");
    const existingFileData = docToFile(fileSnap);

    const metadataToUpdate: {[key: string]: any} = { ...data };

    if (data.name && !data.keywords) {
        metadataToUpdate.keywords = generateKeywords(data.name);
    }

    // If content is being updated, upload it to storage first.
    if (typeof data.content === 'string') {
        const storage = getAppStorage();
        
        // Use a consistent storage path based on the file ID to ensure overwrites
        const storagePath = `userFiles/${existingFileData.userId}/${fileId}.txt`;
        
        const fileBlob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
        const storageFileRef = storageRef(storage, storagePath);
        await uploadBytes(storageFileRef, fileBlob);
        
        metadataToUpdate.size = fileBlob.size; // Update the size in the metadata
        metadataToUpdate.storagePath = storagePath; // Ensure storagePath is set/updated
    }

    // Ensure content is never written to Firestore
    delete metadataToUpdate.content; 
    metadataToUpdate.modifiedAt = new Date();
    
    if (Object.keys(metadataToUpdate).length > 0) {
      await updateDoc(fileRef, metadataToUpdate);
    }
}


export async function addTextFileClient(userId: string, folderId: string, fileName: string, content: string = ''): Promise<FileItem> {
    const db = getDb();
    const storage = getAppStorage();

    const newDocRef = doc(collection(db, FILES_COLLECTION));
    const fileId = newDocRef.id;

    const fileBlob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    const storagePath = `userFiles/${userId}/${fileId}.txt`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, fileBlob);

    const newFileRecord: FileItem = {
        id: fileId,
        name: fileName,
        type: 'text/plain',
        size: fileBlob.size,
        modifiedAt: new Date(),
        folderId: folderId,
        userId,
        storagePath,
        keywords: generateKeywords(fileName),
    };
    
    await setDoc(doc(db, FILES_COLLECTION, fileId), newFileRecord);

    return newFileRecord;
}


export async function saveEmailForContact(userId: string, contactName: string, email: { to: string, from: string, subject: string; body: string; sourceLink?: string; }): Promise<FileItem> {
    const db = getDb();
    const storage = getAppStorage();

    // 1. Find or create a folder for the contact
    const contactFolder = await findOrCreateGenericFolder(userId, contactName, 'fileManagerFolders');
    if (!contactFolder) {
        throw new Error("Could not find or create a folder for the contact.");
    }

    // 2. Sanitize file name and create HTML content
    const sanitizedSubject = (email.subject || "Untitled Email").replace(/[^a-zA-Z0-9._-]/g, '');
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `${sanitizedSubject} - ${dateStamp}.html`;
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${email.subject}</title>
            <style>
                body { font-family: sans-serif; line-height: 1.6; }
                .email-header { background-color: #f2f2f2; padding: 10px; border-bottom: 1px solid #ddd; }
                .email-body { padding: 20px; }
            </style>
        </head>
        <body>
            <div class="email-header">
                <p><strong>From:</strong> ${email.from}</p>
                <p><strong>To:</strong> ${email.to}</p>
                <p><strong>Subject:</strong> ${email.subject}</p>
                ${email.sourceLink ? `<p><strong>Source:</strong> <a href="${email.sourceLink}" target="_blank">View Original Email</a></p>` : ''}
            </div>
            <div class="email-body">
                ${email.body}
            </div>
        </body>
        </html>
    `;

    // 3. Upload content to Firebase Storage
    const storagePath = `userFiles/${userId}/${contactFolder.id}/${Date.now()}-${fileName}`;
    const fileRef = storageRef(storage, storagePath);
    await uploadBytes(fileRef, new Blob([htmlContent], { type: 'text/html' }));

    // 4. Create a record in Firestore
    const newFileRecord: Omit<FileItem, 'id'> = {
        name: fileName,
        type: 'text/html',
        size: htmlContent.length,
        modifiedAt: new Date(),
        folderId: contactFolder.id,
        userId: userId,
        storagePath: storagePath,
    };
    
    return addFileRecord(newFileRecord);
}

export async function archiveIdeaAsFile(userId: string, title: string, description: string): Promise<FileItem> {
    const folder = await findOrCreateGenericFolder(userId, 'Archived Ideas', 'fileManagerFolders');

    const content = `
# ${title}

## Description
${description || 'No description provided.'}

---
*Archived on: ${new Date().toISOString()}*
    `.trim();
    
    return addTextFileClient(userId, folder.id, `Archived Idea - ${title}.txt`, content);
}

export async function archiveTaskAsFile(userId: string, task: TaskEvent): Promise<FileItem> {
    const folder = await findOrCreateGenericFolder(userId, 'Archived Tasks', 'fileManagerFolders');

    const content = `
# ${task.title}

**Description:**
${task.description || 'No description provided.'}

---
*Task Status: Done*
*Archived on: ${new Date().toISOString()}*
    `.trim();
    
    return addTextFileClient(userId, folder.id, `Archived Task - ${task.title}.txt`, content);
}


export async function addFileFromDataUrl(
    { dataUrl, fileName, userId, folderId }: { dataUrl: string; fileName: string; userId: string; folderId: string; }
): Promise<FileItem> {
    const storage = getAppStorage();
    
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const storagePath = `userFiles/${userId}/${folderId}/${Date.now()}-${fileName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, blob);

    const newFileRecord: Omit<FileItem, 'id'> = {
        name: fileName,
        type: blob.type,
        size: blob.size,
        modifiedAt: new Date(),
        folderId,
        userId,
        storagePath,
    };

    return addFileRecord(newFileRecord);
}

export async function deleteFiles(fileIds: string[]): Promise<void> {
    const db = getDb();
    const storage = getAppStorage();
    const batch = writeBatch(db);

    for (const fileId of fileIds) {
        const fileRef = doc(db, FILES_COLLECTION, fileId);
        const fileSnap = await getDoc(fileRef);
        if (fileSnap.exists()) {
            const fileData = docToFile(fileSnap);
            if (fileData.storagePath && fileData.type !== 'google-drive-link') {
                 try {
                    const storageFileRef = storageRef(storage, fileData.storagePath);
                    await deleteObject(storageFileRef);
                } catch (error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.error(`Failed to delete file from storage: ${fileData.storagePath}`, error);
                    }
                }
            }
            batch.delete(fileRef);
        }
    }
    
    await batch.commit();
}
export async function findOrCreateFileFolder(userId: string, folderName: string): Promise<FolderItem> {
    return findOrCreateGenericFolder(userId, folderName, 'fileManagerFolders');
}

export async function uploadSiteImage(fileOrUrl: File | string, userId: string, docIdToReplace?: string): Promise<void> {
    const functions = getFunctionsService();
    const uploadFn = httpsCallable(functions, 'uploadSiteImage');

    let fileBuffer: string;
    let fileName: string;
    let contentType: string;

    if (typeof fileOrUrl === 'string') {
        // It's a URL from an existing image in the library
        fileBuffer = fileOrUrl;
        // We'll extract a hint for the name. This is imperfect but better than nothing.
        const urlParts = fileOrUrl.split('/');
        fileName = urlParts[urlParts.length - 1] || 'replacement.png';
        // Content type for URLs is tricky, we make a best guess or let the backend handle it.
        contentType = 'image/png'; // Default
    } else {
        // It's a File object from an upload
        fileName = fileOrUrl.name;
        contentType = fileOrUrl.type;
        fileBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(fileOrUrl);
        });
    }

    try {
        await uploadFn({
            fileName,
            fileBuffer,
            contentType,
            docIdToReplace,
        });
    } catch (error: any) {
        console.error("Error calling uploadSiteImage function:", error);
        throw error;
    }
}


export async function deleteSiteImage(imageId: string, storagePath: string): Promise<void> {
    const functions = getFunctionsService();
    const deleteFn = httpsCallable(functions, 'deleteSiteImage');
    try {
        await deleteFn({ imageId, storagePath });
    } catch (error: any) {
        console.error("Error calling deleteSiteImage function:", error);
        throw error;
    }
}
