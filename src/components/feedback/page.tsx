'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Megaphone, FileText } from 'lucide-react';
import { submitFeedback } from '@/services/feedback-service';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

const feedbackSchema = z.object({
  reporterName: z.string().min(2, { message: "Please enter your name." }),
  topic: z.string().min(3, { message: "Please enter a topic for your feedback." }),
  type: z.enum(['bug', 'feature', 'general'], { required_error: "Please select a feedback type." }),
  feedback: z.string().min(10, { message: "Please provide at least 10 characters of feedback." }),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setCurrentDate(format(new Date(), 'PPP'));
  }, []);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      reporterName: '',
      topic: '',
      type: 'general',
      feedback: '',
    },
  });

  async function onSubmit(values: FeedbackFormData) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be logged in to submit feedback.',
        });
        return;
    }
    setIsSubmitting(true);
    try {
      await submitFeedback({
        ...values,
        date: new Date().toISOString(),
        userId: user.uid,
      });
      toast({
        title: 'Feedback Submitted',
        description: "Thank you! We've received your feedback and appreciate your input.",
      });
      form.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="text-center mb-6 max-w-4xl relative w-full">
        <div className="flex items-center justify-center gap-2 mb-2">
            <Megaphone className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-primary">
                Submit Feedback
            </h1>
        </div>
        <p className="text-muted-foreground">
          Have a bug to report, an idea for a new feature, or general comments? Let us know!
        </p>
        <div className="absolute top-0 right-0">
          <Button asChild variant="outline">
            <Link href="/reports/feedback">
              <FileText className="mr-2 h-4 w-4" /> Feedback Report
            </Link>
          </Button>
        </div>
      </header>

      <Card className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Your Feedback</CardTitle>
              <CardDescription>
                Your input is invaluable in helping us improve Ogeemo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="reporterName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="topic"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Topic / Subject</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Issue with invoices" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Date</Label>
                    <Input value={currentDate} readOnly disabled />
                </div>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Comment</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what's on your mind..."
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Feedback
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
