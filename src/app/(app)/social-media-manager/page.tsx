
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Share2, CalendarDays, Bot, BarChart2, Megaphone, Folder, Wand2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FeatureDetail = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <AccordionItem value={title}>
    <AccordionTrigger>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">{title}</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
        {children}
      </div>
    </AccordionContent>
  </AccordionItem>
);


export default function SocialMediaManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
       <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <Share2 className="h-8 w-8" />
          Social Media Manager
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mt-2">
          Your command center for planning, creating, and scheduling social media content. Turn your marketing strategy into engaging posts that drive results.
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Core Features (Coming Soon)</CardTitle>
                <CardDescription>This manager will streamline your entire social media workflow, from idea to analytics.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue="AI Content Assistant">
                    <FeatureDetail title="Content Calendar" icon={CalendarDays}>
                        <ul>
                            <li><strong>Visual Planning:</strong> See your entire upcoming social media schedule for all connected platforms in a clear, visual calendar.</li>
                            <li><strong>Drag-and-Drop Rescheduling:</strong> Easily move posts to different dates and times to adapt your strategy on the fly.</li>
                            <li><strong>Approval Workflows:</strong> (Future) For teams, create simple approval steps before a post goes live.</li>
                        </ul>
                    </FeatureDetail>
                    <FeatureDetail title="AI Content Assistant" icon={Bot}>
                        <ul>
                            <li><strong>Post Generation:</strong> Provide a topic or a link to a blog post, and let Ogeemo's AI draft engaging social media copy for different platforms (e.g., professional for LinkedIn, concise for X).</li>
                            <li><strong>Image Ideas:</strong> Get suggestions for visuals that would complement your post, and generate them directly using the integrated image generation tool.</li>
                            <li><strong>Hashtag Suggestions:</strong> Receive relevant hashtag recommendations to increase the reach of your posts.</li>
                        </ul>
                    </FeatureDetail>
                     <FeatureDetail title="Performance Analytics" icon={BarChart2}>
                        <ul>
                            <li><strong>Unified Dashboard:</strong> Track key metrics like engagement rate, reach, clicks, and follower growth across all your connected accounts in one place.</li>
                            <li><strong>Post-Level Insights:</strong> See which posts are performing best to understand what resonates with your audience.</li>
                            <li><strong>Simple Reports:</strong> Generate easy-to-understand reports on your social media performance.</li>
                        </ul>
                    </FeatureDetail>
                </Accordion>
            </CardContent>
        </Card>

        <Card className="border-2 border-primary/20">
            <CardHeader>
                <CardTitle>Integrated with Your Ogeemo Workspace</CardTitle>
                <CardDescription>Connect your social media efforts with the rest of your business operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Megaphone className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Marketing Manager</h4>
                        <p className="text-sm text-muted-foreground">Link your social media posts to specific campaigns in the Marketing Manager to track their contribution to your overall marketing goals.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Folder className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">File Manager</h4>
                        <p className="text-sm text-muted-foreground">Directly access approved brand assets, product photos, and marketing materials from your File Manager to attach to your posts, ensuring brand consistency.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Wand2 className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Action Manager</h4>
                        <p className="text-sm text-muted-foreground">Use the main Ogeemo assistant to schedule posts with natural language commands, like "Ogeemo, post about our new feature on LinkedIn tomorrow at 10 AM."</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
