
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getPostBySlug, getApprovedComments, addComment, deleteComment, type BlogPost, type BlogComment } from '@/services/blog-service';
import { useAuth } from '@/context/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function BlogPostPage() {
    const params = useParams();
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

    const [post, setPost] = useState<BlogPost | null>(null);
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [commentAuthor, setCommentAuthor] = useState('');
    const [commentContent, setCommentContent] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const { toast } = useToast();
    
    const { user } = useAuth();
    const [commentToDelete, setCommentToDelete] = useState<BlogComment | null>(null);


    const loadData = useCallback(async () => {
        if (!slug) return;
        setIsLoading(true);
        try {
            const postData = await getPostBySlug(slug);
            setPost(postData);

            if (postData) {
                const approvedComments = await getApprovedComments(postData.id);
                setComments(approvedComments);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load the blog post or comments.' });
        } finally {
            setIsLoading(false);
        }
    }, [slug, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentAuthor.trim() || !commentContent.trim() || !post) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out your name and comment.' });
            return;
        }

        setIsSubmittingComment(true);
        try {
            await addComment({
                postId: post.id,
                postAuthorId: post.authorId,
                authorName: commentAuthor,
                content: commentContent,
            });
            toast({
                title: "Comment Submitted",
                description: "Your comment is awaiting moderation. Thank you!",
            });
            setCommentAuthor('');
            setCommentContent('');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Submission Failed", description: error.message });
        } finally {
            setIsSubmittingComment(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!commentToDelete || !post) return;
        try {
            await deleteComment(post.id, commentToDelete.id);
            setComments(prev => prev.filter(c => c.id !== commentToDelete.id));
            toast({ title: 'Comment Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setCommentToDelete(null);
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!post) {
        return (
            <div className="flex flex-col min-h-screen">
                <SiteHeader />
                <main className="flex-1 container mx-auto px-4 py-8 md:py-16 text-center">
                    <h1 className="text-4xl font-bold">Post Not Found</h1>
                    <p className="text-muted-foreground mt-4">Sorry, we couldn't find the blog post you're looking for.</p>
                </main>
                <SiteFooter />
            </div>
        )
    }
    
    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <>
            <div className="flex flex-col min-h-screen">
                <SiteHeader />
                <main className="container mx-auto px-4 py-8 md:py-16">
                    <article className="max-w-3xl mx-auto">
                        <header className="mb-8">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Badge variant="outline">{post.category}</Badge>
                              <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                                {post.title}
                            </h1>
                            <div className="mt-6 flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={undefined} alt={post.authorName} />
                                    <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{post.authorName}</p>
                                    <p className="text-sm text-muted-foreground">Ogeemo Team</p>
                                </div>
                            </div>
                        </header>
                        
                        <div className="relative h-64 md:h-96 w-full mb-8">
                             <ImagePlaceholder data-ai-hint={post.slug} className="w-full h-full rounded-lg object-cover" />
                        </div>

                        <div 
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                        
                        {post.allowComments && (
                            <div className="mt-16">
                                <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
                                
                                <Card className="mb-8">
                                <form onSubmit={handleCommentSubmit}>
                                    <CardHeader>
                                        <CardTitle>Leave a Comment</CardTitle>
                                        <CardDescription>Your comment will be visible after it has been approved.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="comment-author">Your Name</Label>
                                            <Input id="comment-author" placeholder="John Doe" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} disabled={isSubmittingComment} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="comment-content">Comment</Label>
                                            <Textarea id="comment-content" placeholder="Write your comment here..." rows={4} value={commentContent} onChange={e => setCommentContent(e.target.value)} disabled={isSubmittingComment} />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" disabled={isSubmittingComment}>
                                        {isSubmittingComment && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        Post Comment
                                        </Button>
                                    </CardFooter>
                                </form>
                                </Card>

                                <div className="space-y-6">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex items-start gap-4 group">
                                            <Avatar>
                                                <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold">{comment.authorName}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <p className="text-sm mt-1">{comment.content}</p>
                                            </div>
                                            {user && user.uid === post.authorId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setCommentToDelete(comment)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </article>
                </main>
                <SiteFooter />
            </div>

            <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the comment by "{commentToDelete?.authorName}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete Comment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

