
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { LoaderCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getPostBySlug, getApprovedComments, addComment, type BlogPost, type BlogComment } from '@/services/blog-service';

// Hardcoded mock for a single post structure as a fallback
const mockPost = {
    id: "mock-post-id",
    slug: "the-future-of-small-business",
    title: "The Future of Small Business: Embracing the All-in-One Platform",
    date: "August 5, 2024",
    category: "Productivity",
    authorId: "mock-author-id",
    author: {
      name: "Dan White",
      avatarHint: "professional businessman portrait"
    },
    imageHint: "business strategy",
    content: `
        <p>In today's fast-paced digital landscape, small business owners and freelancers are often forced to become expert jugglers. You're not just a creator, a consultant, or a service provider; you're also an accountant, a project manager, a salesperson, and a marketing guru. This juggling act often involves a dizzying array of disparate software tools—one for invoices, another for tasks, a separate one for client communication, and yet another for tracking time.</p>
        <p>While each tool might be good at its specific job, the combination creates a fragmented workflow. Information is siloed, time is wasted switching between tabs, and a holistic view of your business becomes nearly impossible to achieve. This is more than just an inconvenience; it's a significant barrier to growth and efficiency.</p>
        <h3 class="font-bold text-xl mt-6 mb-2">The True Cost of Software Sprawl</h3>
        <p>The reliance on multiple, disconnected apps leads to several critical issues:</p>
        <ul>
            <li><strong>Data Silos:</strong> Information from a client email doesn't automatically inform a project task. Time tracked on a project isn't seamlessly converted into an invoice line item. This disconnect forces manual data re-entry, which is both time-consuming and prone to error.</li>
            <li><strong>Subscription Fatigue:</strong> Managing and paying for five, ten, or even more different subscriptions is a financial and administrative drain. The combined cost is often far greater than a single, unified solution.</li>
            <li><strong>Lack of a Single Source of Truth:</strong> When your financial data, project progress, and client history live in separate systems, you can never get a true, real-time snapshot of your business's health. Making informed strategic decisions becomes a matter of guesswork and spreadsheet acrobatics.</li>
        </ul>
        <h3 class="font-bold text-xl mt-6 mb-2">The All-in-One Advantage with Ogeemo</h3>
        <p>This is the problem Ogeemo was built to solve. We believe that by integrating all core business functions into a single, intelligent platform, we can empower entrepreneurs to reclaim their time and focus on what truly matters.</p>
        <p>Our philosophy is simple: your accounting, project management, and CRM should not be separate departments; they should be interconnected facets of one unified operation. When an AI core understands the context across all these modules, magical things begin to happen. An approved client proposal can automatically generate a project and its first invoice. Time logged against a task becomes a billable item. A client email is a permanent part of their project history.</p>
        <p>The future of small business isn't about finding more apps; it's about finding the right one. It's about choosing a platform that works as a cohesive system, a true command center for your ambition. That's the future we're building with Ogeemo.</p>
    `,
};


export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const [post, setPost] = useState<BlogPost | null>(null);
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [commentAuthor, setCommentAuthor] = useState('');
    const [commentContent, setCommentContent] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // For now, we will use mock data for the post and fetch real comments
            const postData = mockPost as BlogPost;
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
    }, [params.slug, toast]);

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
            toast({ variant: 'destructive', title: "Submission Failed", description: error.message });
        } finally {
            setIsSubmittingComment(false);
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

    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="container mx-auto px-4 py-8 md:py-16">
                <article className="max-w-3xl mx-auto">
                    <header className="mb-8">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Badge variant="outline">{post.category}</Badge>
                          <span>{post.date}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                            {post.title}
                        </h1>
                        <div className="mt-6 flex items-center gap-4">
                            <Avatar>
                                <ImagePlaceholder className="h-full w-full" data-ai-hint={mockPost.author.avatarHint} />
                                <AvatarFallback>{mockPost.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{mockPost.author.name}</p>
                                <p className="text-sm text-muted-foreground">Founder & CEO, Ogeemo</p>
                            </div>
                        </div>
                    </header>
                    
                    <div className="relative h-64 md:h-96 w-full mb-8">
                         <ImagePlaceholder data-ai-hint={mockPost.imageHint} className="w-full h-full rounded-lg object-cover" />
                    </div>

                    <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: mockPost.content }}
                    />
                    
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
                                <div key={comment.id} className="flex items-start gap-4">
                                    <Avatar>
                                         <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold">{comment.authorName}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-sm mt-1">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </main>
            <SiteFooter />
        </div>
    );
}
