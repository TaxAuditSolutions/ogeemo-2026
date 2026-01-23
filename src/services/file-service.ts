
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/firebase';
import type { FileItem, FolderItem } from '@/data/files';
import { findOrCreateFileFolder as findOrCreateGenericFolder } from '@/services/file-manager-folders';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { fetchFileContent } from '@/app/actions/file-actions';

const FILES_COLLECTION = 'files';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
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

export async function updateFile(fileId: string, data: Partial<Omit<FileItem, 'id' | 'userId' | 'content'>> & { content?: string, keywords?: string[] }): Promise<void> {
    const db = getDb();
    const fileRef = doc(db, FILES_COLLECTION, fileId);

    const metadataToUpdate: {[key: string]: any} = { ...data };
    
    if (data.name && !data.keywords) {
        metadataToUpdate.keywords = generateKeywords(data.name);
    }
    
    metadataToUpdate.modifiedAt = new Date();
    delete metadataToUpdate.content;
    
    if (Object.keys(metadataToUpdate).length > 0) {
      await updateDoc(fileRef, metadataToUpdate);
    }
}


export async function addTextFileClient(userId: string, folderId: string, fileName: string, content: string = ''): Promise<FileItem> {
    // This function can now be simplified as it won't handle storage directly
    const newFileRecord: Omit<FileItem, 'id'> = {
        name: fileName,
        type: 'text/plain',
        size: content.length,
        modifiedAt: new Date(),
        folderId,
        userId,
        storagePath: `userFiles/${userId}/${folderId}/${Date.now()}-${fileName}.txt`, // Path for potential future content
        content: content, // Initially we might keep it client-side
    };
    return addFileRecord(newFileRecord);
}


export async function saveEmailForContact(userId: string, contactName: string, email: { to: string, from: string, subject: string; body: string; sourceLink?: string; }): Promise<FileItem> {
    const contactFolder = await findOrCreateGenericFolder(userId, contactName, 'fileManagerFolders');
    if (!contactFolder) {
        throw new Error("Could not find or create a folder for the contact.");
    }
    const sanitizedSubject = (email.subject || "Untitled Email").replace(/[^a-zA-Z0-9._-]/g, '');
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `${sanitizedSubject} - ${dateStamp}.html`;
    const newFileRecord: Omit<FileItem, 'id'> = {
        name: fileName,
        type: 'text/html',
        size: 0,
        modifiedAt: new Date(),
        folderId: contactFolder.id,
        userId: userId,
        storagePath: '', // Will be set by backend if content is saved
    };
    
    return addFileRecord(newFileRecord);
}

export async function archiveIdeaAsFile(userId: string, title: string, description: string): Promise<FileItem> {
    const folder = await findOrCreateGenericFolder(userId, 'Archived Ideas', 'fileManagerFolders');
    return addTextFileClient(userId, folder.id, `Archived Idea - ${title}.txt`);
}

export async function archiveTaskAsFile(userId: string, task: TaskEvent): Promise<FileItem> {
    const folder = await findOrCreateGenericFolder(userId, 'Archived Tasks', 'fileManagerFolders');
    return addTextFileClient(userId, folder.id, `Archived Task - ${task.title}.txt`);
}

export async function deleteFiles(fileIds: string[]): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);
    for (const fileId of fileIds) {
        const fileRef = doc(db, FILES_COLLECTION, fileId);
        batch.delete(fileRef);
    }
    await batch.commit();
}
export async function findOrCreateFileFolder(userId: string, folderName: string): Promise<FolderItem> {
    return findOrCreateGenericFolder(userId, folderName, 'fileManagerFolders');
}

// --- NEW SITE IMAGE FUNCTIONS (CALLING CLOUD FUNCTIONS) ---

export async function uploadSiteImage(data: { fileDataUrl: string, fileName: string, imageId: string; hint: string; }): Promise<any> {
    const functions = getFunctionsService();
    const func = httpsCallable(functions, 'uploadSiteImage');
    return func(data);
}

export async function replaceSiteImage(data: { fileDataUrl: string, fileName: string, imageId: string; storagePathToOverwrite: string; }): Promise<any> {
    const functions = getFunctionsService();
    const func = httpsCallable(functions, 'replaceSiteImage');
    return func(data);
}

export async function deleteSiteImage(data: { imageId: string; storagePath: string; }): Promise<any> {
    const functions = getFunctionsService();
    const func = httpsCallable(functions, 'deleteSiteImage');
    return func(data);
}
