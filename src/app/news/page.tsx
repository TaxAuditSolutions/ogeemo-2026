
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

const mockPosts = [
  {
    id: 1,
    title: "The Future of Small Business: Embracing the All-in-One Platform",
    date: "August 5, 2024",
    category: "Productivity",
    excerpt: "Discover why consolidating your tools into a single, intelligent platform like Ogeemo is no longer a luxury—it's a necessity for growth and efficiency in today's competitive landscape.",
    imageHint: "business strategy",
  },
  {
    id: 2,
    title: "From Beta to Beyond: Our Vision for Ogeemo",
    date: "July 28, 2024",
    category: "Company News",
    excerpt: "As we welcome our first beta testers, we want to share our long-term vision for Ogeemo and how your feedback is shaping the future of business management.",
    imageHint: "team collaboration",
  },
  {
    id: 3,
    title: "5 Ways AI is Revolutionizing Accounting for Freelancers",
    date: "July 19, 2024",
    category: "AI & Automation",
    excerpt: "Manual data entry and complex spreadsheets are a thing of the past. Learn how Ogeemo's AI-powered features are making audit-ready bookkeeping accessible to everyone.",
    imageHint: "artificial intelligence",
  },
];

export default function NewsPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
          Ogeemo News
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Updates, insights, and stories from the Ogeemo team.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockPosts.map((post) => (
          <Card key={post.id} className="flex flex-col overflow-hidden">
            <div className="relative h-48 w-full">
              <ImagePlaceholder data-ai-hint={post.imageHint} className="h-full w-full" />
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{post.category}</Badge>
                <span>{post.date}</span>
              </div>
              <CardTitle className="mt-2">{post.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription>{post.excerpt}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild variant="link" className="p-0">
                <Link href="#">
                  Read More <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
