
'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircleQuestion, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { getPosts, type BlogPost } from '@/services/blog-service';
import { useToast } from '@/hooks/use-toast';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const fetchedPosts = await getPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Failed to load posts:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load blog posts.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [toast]);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Ogeemo Blog
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Updates, insights, and stories from the Ogeemo team.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline">
                <Link href="/blog/moderation">
                    <MessageCircleQuestion className="mr-2 h-4 w-4" />
                    Moderate Comments
                </Link>
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Card key={post.id} className="flex flex-col overflow-hidden">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="relative h-48 w-full">
                    <ImagePlaceholder data-ai-hint={post.slug} className="h-full w-full" />
                  </div>
                </Link>
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{post.category}</Badge>
                    <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</span>
                  </div>
                  <CardTitle className="mt-2">
                      <Link href={`/blog/${post.slug}`} className="hover:underline">
                          {post.title}
                      </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription>{post.excerpt}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="link" className="p-0">
                    <Link href={`/blog/${post.slug}`}>
                      Read More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No Posts Yet</h3>
            <p>Check back soon for updates, insights, and stories.</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
