
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';

const demoRequestSchema = z.object({
  name: z.string().min(2, { message: 'Please enter your name.' }),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type DemoRequestFormData = z.infer<typeof demoRequestSchema>;

interface RequestDemoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Sub-component for the Terms and Conditions Dialog
const TermsDialog = ({
  onConfirm,
  isSubmitting,
}: {
  onConfirm: () => void;
  isSubmitting: boolean;
}) => {
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Terms & Conditions
        </DialogTitle>
        <DialogDescription>
          Please review and accept the terms before submitting your request.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <ScrollArea className="h-48 w-full rounded-md border p-4">
          <h4 className="font-bold mb-2">Disclaimer of Liability</h4>
          <p className="text-sm text-muted-foreground space-y-2">
            This Beta Program is provided "as is" without warranty of any kind, express or implied. By participating, you acknowledge that Ogeemo and its affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses (even if Ogeemo has been advised of the possibility of such damages), resulting from the use or the inability to use the service.
            <br/><br/>
            You agree to indemnify and hold harmless Ogeemo, its contractors, and its licensors, and their respective directors, officers, employees, and agents from and against any and all claims and expenses, including attorneys’ fees, arising out of your use of the application, including but not limited to your violation of this Agreement.
          </p>
        </ScrollArea>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="terms" 
          checked={isTermsAccepted}
          onCheckedChange={(checked) => setIsTermsAccepted(!!checked)}
        />
        <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          I accept the terms and conditions
        </Label>
      </div>
      <DialogFooter>
        <Button
          type="button"
          disabled={!isTermsAccepted || isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Confirm & Complete Request
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};


export function RequestDemoDialog({ isOpen, onOpenChange }: RequestDemoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DemoRequestFormData | null>(null);
  const { toast } = useToast();

  const form = useForm<DemoRequestFormData>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: {
      name: '',
      businessName: '',
      businessAddress: '',
      email: '',
    },
  });

  const handleInitialSubmit = (values: DemoRequestFormData) => {
    setFormData(values);
    setIsTermsDialogOpen(true);
  };
  
  const handleFinalSubmit = () => {
    if (!formData) return;
    
    setIsSubmitting(true);
    console.log('Demo Request Submitted:', formData);
    console.log('Simulating email to Clients@ogeemo.com');

    // Simulate an API call
    setTimeout(() => {
      toast({
        title: 'Demo Request Received!',
        description: 'Thank you for your interest. We will be in touch shortly to schedule your demo.',
      });
      setIsSubmitting(false);
      setIsTermsDialogOpen(false);
      onOpenChange(false);
      form.reset();
      setFormData(null);
    }, 1000);
  }

  return (
    <>
      <Dialog open={isOpen && !isTermsDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Request a Demo
            </DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll contact you to schedule a personalized demo.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleInitialSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Anytown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-center text-muted-foreground pt-2">
                No credit card required.
              </p>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Review Terms
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* This is the nested dialog for terms */}
      <Dialog open={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen}>
          <TermsDialog onConfirm={handleFinalSubmit} isSubmitting={isSubmitting} />
      </Dialog>
    </>
  );
}
