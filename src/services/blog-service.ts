
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
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { mockBlogPosts } from '@/data/blog-posts';

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

function getDb() {
  const { db } = getFirebaseServices();
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

export async function getPosts(authorId?: string): Promise<BlogPost[]> {
  const db = getDb();
  const q = query(collection(db, POSTS_COLLECTION), where("status", "==", "published"));
  let snapshot = await getDocs(q);

  // If no posts exist AT ALL, and an authenticated user is viewing the page,
  // seed the database with them as the author.
  if (snapshot.empty && authorId) {
      const batch = writeBatch(db);
      mockBlogPosts.forEach(post => {
          const docRef = doc(collection(db, POSTS_COLLECTION));
          batch.set(docRef, { ...post, authorId });
      });
      await batch.commit();
      // Re-fetch after seeding
      snapshot = await getDocs(q);
  }
  
  return snapshot.docs.map(docToPost).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = getDb();
  const q = query(collection(db, POSTS_COLLECTION), where("slug", "==", slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return docToPost(snapshot.docs[0]);
}

export async function getApprovedComments(postId: string): Promise<BlogComment[]> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  
  // 1. Get all posts for the author
  const postsQuery = query(collection(db, POSTS_COLLECTION), where('authorId', '==', authorId));
  const postsSnapshot = await getDocs(postsQuery);
  
  if (postsSnapshot.empty) {
    return [];
  }

  const allPendingComments: BlogCommentWithPost[] = [];

  // 2. For each post, get its pending comments
  for (const postDoc of postsSnapshot.docs) {
    const postData = docToPost(postDoc);
    const commentsQuery = query(
      collection(db, POSTS_COLLECTION, postData.id, COMMENTS_COLLECTION),
      where('status', '==', 'pending')
    );
    
    const commentsSnapshot = await getDocs(commentsQuery);
    
    commentsSnapshot.forEach(commentDoc => {
      const comment = docToComment(commentDoc);
      allPendingComments.push({
        ...comment,
        postTitle: postData.title,
      });
    });
  }

  // 3. Sort by date and return
  return allPendingComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateCommentStatus(postId: string, commentId: string, status: 'approved' | 'rejected'): Promise<void> {
    const db = getDb();
    const commentRef = doc(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION, commentId);
    await updateDoc(commentRef, { status });
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
    const db = getDb();
    const commentRef = doc(db, POSTS_COLLECTION, postId, COMMENTS_COLLECTION, commentId);
    await deleteDoc(commentRef);
}
