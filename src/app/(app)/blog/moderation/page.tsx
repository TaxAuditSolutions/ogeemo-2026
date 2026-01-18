
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, ThumbsUp, ThumbsDown, FileText, Check, Trash2, ShieldCheck, User, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getPendingComments, updateCommentStatus, deleteComment, type BlogCommentWithPost } from '@/services/blog-service';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


export default function CommentModerationPage() {
  const [pendingComments, setPendingComments] = useState<BlogCommentWithPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentToAction, setCommentToAction] = useState<{ action: 'approve' | 'reject'; comment: BlogCommentWithPost } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadPendingComments = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const comments = await getPendingComments(user.uid);
      setPendingComments(comments);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to load comments', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadPendingComments();
  }, [loadPendingComments]);

  const handleActionConfirm = async () => {
    if (!commentToAction) return;

    const { action, comment } = commentToAction;

    try {
      if (action === 'approve') {
        await updateCommentStatus(comment.postId, comment.id, 'approved');
        toast({ title: 'Comment Approved' });
      } else { // reject
        await deleteComment(comment.postId, comment.id);
        toast({ title: 'Comment Rejected' });
      }
      setPendingComments(prev => prev.filter(c => c.id !== comment.id));
    } catch (error: any) {
      toast({ variant: 'destructive', title: `Failed to ${action} comment`, description: error.message });
    } finally {
      setCommentToAction(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center">
            <div className="flex items-center justify-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary"/>
                <h1 className="text-3xl font-bold font-headline text-primary">Comment Moderation</h1>
            </div>
          <p className="text-muted-foreground">Approve or reject comments submitted on your blog posts.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Pending Comments</CardTitle>
            <CardDescription>
              {pendingComments.length} comment(s) awaiting your review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            ) : pendingComments.length > 0 ? (
                <div className="space-y-4">
                    {pendingComments.map(comment => (
                        <div key={comment.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User className="h-4 w-4" /> 
                                        <span className="font-semibold">{comment.authorName}</span>
                                        <span>on {format(new Date(comment.createdAt), 'PP')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <FileText className="h-3 w-3" />
                                        <span>On post: "{comment.postTitle}"</span>
                                    </div>
                                    <p className="mt-2 text-foreground">{comment.content}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setCommentToAction({ action: 'approve', comment })}>
                                        <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setCommentToAction({ action: 'reject', comment })}>
                                        <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                    <MessageSquare className="mx-auto h-12 w-12" />
                    <p className="mt-4">No pending comments.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!commentToAction} onOpenChange={() => setCommentToAction(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to {commentToAction?.action} this comment. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleActionConfirm}
                        className={commentToAction?.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
                    >
                        Confirm {commentToAction?.action}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
