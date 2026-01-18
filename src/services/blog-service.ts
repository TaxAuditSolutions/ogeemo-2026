
'use client';

import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  publishedAt: string;
  status: 'draft' | 'published';
  allowComments: boolean;
  category: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  postAuthorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BlogCommentWithPost extends BlogComment {
  postTitle: string;
}

const POSTS_COLLECTION = 'blogPosts';
const COMMENTS_COLLECTION = 'comments';

async function getDb() {
  const { db } = await initializeFirebase();
  return db;
}

const docToPost = (doc: any): BlogPost => ({
  id: doc.id,
  ...doc.data(),
} as BlogPost);

const docToComment = (doc: any): BlogComment => ({
  id: doc.id,
  ...doc.data(),
} as BlogComment);

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = await getDb();
  const q = query(collection(db, POSTS_COLLECTION), where("slug", "==", slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return docToPost(snapshot.docs[0]);
}

export async function getApprovedComments(postId: string): Promise<BlogComment[]> {
  const db = await getDb();
  const q = query(
    collection(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION),
    where("status", "==", "approved")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToComment).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addComment(data: {
  postId: string;
  postAuthorId: string;
  authorName: string;
  content: string;
}): Promise<BlogComment> {
  const db = await getDb();
  const commentData = {
    ...data,
    createdAt: new Date().toISOString(),
    status: 'pending' as const,
  };
  const docRef = await addDoc(
    collection(db, POSTS_COLLECTION, data.postId, COMMENTS_COLLECTION),
    commentData
  );
  return { id: docRef.id, ...commentData };
}

export async function getPendingComments(authorId: string): Promise<BlogCommentWithPost[]> {
  const db = await getDb();
  const commentsQuery = query(
    collectionGroup(db, COMMENTS_COLLECTION),
    where('postAuthorId', '==', authorId),
    where('status', '==', 'pending')
  );

  const commentsSnapshot = await getDocs(commentsQuery);
  if (commentsSnapshot.empty) {
    return [];
  }

  const postsMap = new Map<string, string>();
  const results: BlogCommentWithPost[] = [];

  for (const commentDoc of commentsSnapshot.docs) {
    const comment = docToComment(commentDoc);
    let postTitle = postsMap.get(comment.postId);

    if (!postTitle) {
      const postRef = doc(db, POSTS_COLLECTION, comment.postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        postTitle = postSnap.data().title || 'Untitled Post';
        postsMap.set(comment.postId, postTitle);
      } else {
        postTitle = 'Deleted Post';
      }
    }
    
    results.push({ ...comment, postTitle });
  }

  return results.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateCommentStatus(postId: string, commentId: string, status: 'approved' | 'rejected'): Promise<void> {
    const db = await getDb();
    const commentRef = doc(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION, commentId);
    await updateDoc(commentRef, { status });
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
    const db = await getDb();
    const commentRef = doc(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION, commentId);
    await deleteDoc(commentRef);
}
