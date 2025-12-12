
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
import { getStorage, ref as storageRef, uploadBytes, deleteObject, getBytes } from 'firebase/storage';
import { initializeFirebase } from '@/lib/firebase';
import type { FileItem, FolderItem } from '@/data/files';
import { onAuthStateChanged, type Auth } from 'firebase/auth';


const FILES_COLLECTION = 'files';
export const SITE_IMAGES_FOLDER_ID = 'folder-site-images';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}
async function getAppStorage() {
    const { storage } = await initializeFirebase();
    return storage;
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
  const db = await getDb();
  const q = userId ? query(collection(db, FILES_COLLECTION), where("userId", "==", userId)) : collection(db, FILES_COLLECTION);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFile);
}

export async function getFileContentFromStorage(auth: Auth, storagePath: string): Promise<string> {
    if (!storagePath) {
        console.warn("Storage path is empty, returning empty content.");
        return '';
    }

    return new Promise(async (resolve, reject) => {
        // Wait for auth state to be confirmed
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // We only need this once
            if (user) {
                try {
                    const storage = await getAppStorage();
                    const contentRef = storageRef(storage, storagePath);
                    const bytes = await getBytes(contentRef);
                    const textDecoder = new TextDecoder('utf-8');
                    resolve(textDecoder.decode(bytes));
                } catch (error: any) {
                    console.error(`Failed to fetch content from ${storagePath}:`, error);
                    // Provide a more user-friendly error
                    if (error.code === 'storage/object-not-found') {
                         reject(new Error(`File content not found in storage at path: ${storagePath}. It may have been deleted or not yet created.`));
                    } else if (error.code === 'storage/unauthorized') {
                         reject(new Error(`You do not have permission to access this file.`));
                    } else {
                         reject(new Error(`Failed to retrieve file content: ${error.message}`));
                    }
                }
            } else {
                reject(new Error("Authentication required to access file content."));
            }
        });
    });
}


export async function getFileById(fileId: string): Promise<FileItem | null> {
    const db = await getDb();
    const fileRef = doc(db, FILES_COLLECTION, fileId);
    const fileSnap = await getDoc(fileRef);
    if (!fileSnap.exists()) {
        return null;
    }
    const fileData = docToFile(fileSnap);
    
    if ((fileData.type === 'text/plain' || fileData.type === 'application/vnd.ogeemo-flowchart+json') && fileData.storagePath) {
        try {
            const { auth } = await initializeFirebase();
            const content = await getFileContentFromStorage(auth, fileData.storagePath);
            fileData.content = content;
        } catch (error) {
            console.error(`Failed to fetch content for ${fileId}:`, error);
            fileData.content = `// Error: Could not load file content.`;
        }
    }
    
    return fileData;
}


export async function getFilesForFolder(userId: string, folderId: string): Promise<FileItem[]> {
  const db = await getDb();
  const q = query(collection(db, FILES_COLLECTION), where("userId", "==", userId), where("folderId", "==", folderId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFile);
}

export async function addFileRecord(fileData: Omit<FileItem, 'id'>): Promise<FileItem> {
    const db = await getDb();
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

    const storage = await getAppStorage();
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
    const db = await getDb();
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
        const storage = await getAppStorage();
        
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
    const db = await getDb();
    const storage = await getAppStorage();

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


export async function saveEmailForContact(userId: string, contactName: string, email: { to: string, from: string, subject: string; body: string; sourceLink?: string; }): Promise<void> {
    console.log("--- Placeholder: saveEmailForContact ---");
    console.log("User ID:", userId);
    console.log("Contact Name:", contactName);
    console.log("Email to save:", email);
    console.log("This function will eventually save this email as an HTML file in the contact's folder in the Document Manager.");
    console.log("--- End Placeholder ---");
    // This is a placeholder. The real implementation will be done in Phase 2.
    // No actual file saving will happen here.
    return Promise.resolve();
}

export async function archiveIdeaAsFile(userId: string, title: string, description: string): Promise<FileItem> {
    const db = await getDb();
    const storage = await getAppStorage();

    const folder = await findOrCreateFileFolder(userId, 'Archived Ideas');

    const content = `
# ${title}

## Description
${description || 'No description provided.'}

---
*Archived on: ${new Date().toISOString()}*
    `.trim();
    
    const fileBlob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    const newDocRef = doc(collection(db, FILES_COLLECTION));
    const fileId = newDocRef.id;

    const storagePath = `userFiles/${userId}/${folder.id}/${fileId}.txt`;
    const fileRef = storageRef(storage, storagePath);
    await uploadBytes(fileRef, fileBlob);

    const newFileRecord: FileItem = {
        id: fileId,
        name: `Archived Idea - ${title}`,
        type: 'text/plain',
        size: fileBlob.size,
        modifiedAt: new Date(),
        folderId: folder.id,
        userId,
        storagePath,
        keywords: generateKeywords(`Archived Idea - ${title}`),
    };
    
    await setDoc(doc(db, FILES_COLLECTION, fileId), newFileRecord);
    return newFileRecord;
}


export async function addFileFromDataUrl(
    { dataUrl, fileName, userId, folderId }: { dataUrl: string; fileName: string; userId: string; folderId: string; }
): Promise<FileItem> {
    const storage = await getAppStorage();
    
    // Convert data URL to Blob
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

// Kept for specific file deletions, but folder deletion is handled by deleteFolders
export async function deleteFiles(fileIds: string[]): Promise<void> {
    const db = await getDb();
    const storage = await getAppStorage();
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
                        // Do not throw, allow Firestore deletion to proceed.
                    }
                }
            }
            batch.delete(fileRef);
        }
    }
    
    await batch.commit();
}
// This function has been deprecated and its functionality moved to `file-manager-folders.ts`
// It is kept here to avoid breaking imports but should not be used.
export async function findOrCreateFileFolder(userId: string, folderName: string): Promise<FolderItem> {
    const db = await getDb();
    const q = query(collection(db, 'fileManagerFolders'), where("userId", "==", userId), where("name", "==", folderName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FolderItem;
    }
    const newFolderData = { name: folderName, userId, parentId: null, createdAt: new Date() };
    const docRef = await addDoc(collection(db, 'fileManagerFolders'), newFolderData);
    return { id: docRef.id, ...newFolderData };
}
    

    
