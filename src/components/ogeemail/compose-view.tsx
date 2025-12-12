
"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Bot,
  FilePlus,
  Send,
  Paperclip,
  ImageIcon,
  Sparkles,
  LoaderCircle,
  Archive,
  Strikethrough,
  Quote,
  Link as LinkIcon,
  Mic,
  Square,
  ArrowLeft,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Textarea } from '@/components/ui/textarea';
import { type Contact, type FolderData } from '@/data/contacts';
import { getContacts, getFolders, addContact } from '@/services/contact-service';
import { saveEmailForContact } from '@/services/file-service';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';

const OgeemoChatDialog = dynamic(() => import('@/components/ogeemail/ogeemo-chat-dialog'), {
  loading: () => <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-white" /></div>,
});


const initialTemplates = [
  {
    name: 'General Inquiry',
    content: '<p>Hello,</p><p><br></p><p>I am writing to inquire about...</p><p><br></p><p>Thank you for your time.</p><p>Best regards,</p><p>[Your Name]</p>',
  },
  {
    name: 'Meeting Request',
    content: '<h3>Meeting Request: [Subject]</h3><p>Hello team,</p><p><br></p><p>I would like to schedule a meeting to discuss [Topic]. Please let me know what time works best for you in the coming days.</p><p><br></p><p>Best,</p><p>[Your Name]</p>',
  },
];

const newContactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  folderId: z.string({ required_error: "Please select a folder." }),
});

export function ComposeEmailView() {
  const [recipient, setRecipient] = React.useState('');
  const [cc, setCc] = React.useState('');
  const [bcc, setBcc] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  
  const [unresolvedRecipient, setUnresolvedRecipient] = React.useState<string | null>(null);
  const [resolvedContact, setResolvedContact] = React.useState<Contact | null>(null);
  const [suggestions, setSuggestions] = React.useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  
  const [allContacts, setAllContacts] = React.useState<Contact[]>([]);
  const [allFolders, setAllFolders] = React.useState<FolderData[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  
  const [isNewContactDialogOpen, setIsNewContactDialogOpen] = React.useState(false);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const recipientInputRef = React.useRef<HTMLInputElement>(null);
  
  const [templates] = React.useState(initialTemplates);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = React.useState(false);
  const [newTemplateName, setNewTemplateName] = React.useState('');
  
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isGenerateImageDialogOpen, setIsGenerateImageDialogOpen] = React.useState(false);
  const [imagePrompt, setImagePrompt] = React.useState('');
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [bodyBeforeSpeech, setBodyBeforeSpeech] = React.useState('');

  const newContactForm = useForm<z.infer<typeof newContactSchema>>({
    resolver: zodResolver(newContactSchema),
    defaultValues: { name: "", email: "", folderId: "" },
  });

  const { isListening, startListening, stopListening, isSupported } = useSpeechToText({
    onTranscript: (transcript) => {
        if (editorRef.current) {
            const newText = bodyBeforeSpeech ? `${bodyBeforeSpeech} ${transcript}`.trim() : transcript;
            editorRef.current.innerHTML = newText;
            setBody(newText);
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
  });
  
  React.useEffect(() => {
    async function loadContactData() {
        if (!user) {
            setIsDataLoading(false);
            return;
        }
        setIsDataLoading(true);
        try {
            const [contacts, folders] = await Promise.all([
                getContacts(user.uid),
                getFolders(user.uid)
            ]);
            setAllContacts(contacts);
            setAllFolders(folders);
        } catch (error) {
            console.error("Failed to load contact data:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load contact data." });
        } finally {
            setIsDataLoading(false);
        }
    }
    loadContactData();
  }, [user, toast]);

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipient(value);
    setResolvedContact(null);
    setUnresolvedRecipient(null);

    if (value.trim().length > 1) {
      const lowerValue = value.toLowerCase();
      const filtered = allContacts.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lowerValue)) ||
          (c.email && c.email.toLowerCase().includes(lowerValue))
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (contact: Contact) => {
    setRecipient(`"${contact.name}" <${contact.email}>`);
    setResolvedContact(contact);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRecipientBlur = () => {
    setTimeout(() => {
      if (!recipientInputRef.current?.matches(':focus-within')) {
        setShowSuggestions(false);
      }
      if (!resolvedContact) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(recipient.trim())) {
          setUnresolvedRecipient(recipient.trim());
        }
      }
    }, 200);
  };
  
  const handleOpenNewContactDialog = (email: string) => {
    newContactForm.reset({ email, name: '', folderId: '' });
    setIsNewContactDialogOpen(true);
  };
  
  async function handleCreateNewContact(values: z.infer<typeof newContactSchema>) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a contact.' });
        return;
    }

    try {
        const newContact = await addContact({ ...values, userId: user.uid });
        setAllContacts(prev => [...prev, newContact]);
        
        newContactForm.reset();
        setIsNewContactDialogOpen(false);
        
        if (unresolvedRecipient === newContact.email) {
          setRecipient(`"${newContact.name}" <${newContact.email}>`);
          setResolvedContact(newContact);
          setUnresolvedRecipient(null);
        }
    
        toast({ title: 'Contact Created', description: `${newContact.name} has been added.` });
    } catch(error: any) {
        console.error("Failed to save contact:", error);
        toast({ variant: "destructive", title: "Save Failed", description: error.message });
    }
  }

  const handleSaveToContactFolder = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Not logged in", description: "You must be logged in to save emails." });
        return;
    }
    if (!resolvedContact) {
        toast({
            variant: "destructive",
            title: "No Contact Selected",
            description: "Please enter a valid contact in the 'To' field first.",
        });
        return;
    }

    const currentBody = editorRef.current?.innerHTML || body;

    if (!subject.trim() && !currentBody.trim()) {
        toast({
            variant: "destructive",
            title: "Empty Email",
            description: "Please provide a subject or body before saving.",
        });
        return;
    }

    setIsSaving(true);
    try {
        await saveEmailForContact(user.uid, resolvedContact.name, {
            subject: subject || 'Untitled Email',
            body: currentBody,
        });
        toast({
            title: "Email Saved",
            description: `A copy of this email has been saved to the "${resolvedContact.name}" folder in your File Manager.`,
        });
    } catch (error: any) {
        console.error("Failed to save email to contact folder:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleTemplateSelect = (content: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      setBody(content);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    try {
      const response = await fetch('/api/genkit/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The API returned an error.');
      }

      const result = await response.json();
      setGeneratedImageUrl(result.imageUrl);
    } catch (error: any) {
      console.error("Image generation UI error:", error);
      toast({
        variant: "destructive",
        title: "Image Generation Failed",
        description: error.message || 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleInsertGeneratedImage = () => {
    if (generatedImageUrl) {
      handleFormat('insertImage', generatedImageUrl);
    }
    setIsGenerateImageDialogOpen(false);
  };
  
  const handleDictateNotes = () => {
    if (isListening) {
      stopListening();
    } else {
      setBodyBeforeSpeech(body);
      editorRef.current?.focus();
      startListening();
    }
  };
  
  const preventDefault = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
       <Dialog open={isNewContactDialogOpen} onOpenChange={setIsNewContactDialogOpen}>
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Contact</DialogTitle>
                <DialogDescription>
                  This contact will be added to your contact list.
                </DialogDescription>
            </DialogHeader>
            <Form {...newContactForm}>
                <form onSubmit={newContactForm.handleSubmit(handleCreateNewContact)} className="space-y-4 py-4">
                     <FormField control={newContactForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                     <FormField control={newContactForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input {...field} disabled /></FormControl> <FormMessage /> </FormItem> )} />
                     <FormField control={newContactForm.control} name="folderId" render={({ field }) => ( <FormItem> <FormLabel>Folder</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a folder" /></SelectTrigger></FormControl><SelectContent>{allFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                     <DialogFooter className="pt-4 !mt-0">
                         <Button type="button" variant="ghost" onClick={() => setIsNewContactDialogOpen(false)}>Cancel</Button>
                         <Button type="submit">Create Contact</Button>
                     </DialogFooter>
                </form>
            </Form>
         </DialogContent>
       </Dialog>
      
      <header className="relative text-center">
        <Button asChild variant="ghost" className="absolute left-0 top-1/2 -translate-y-1/2">
            <Link href="/ogeemail">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inbox
            </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline text-primary">Compose Email</h1>
      </header>
      
      <div className="flex-1 min-h-0">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <Label htmlFor="to" className="text-sm text-muted-foreground w-12 text-right">To</Label>
                <div className="flex-1 relative">
                  <Input
                    id="to"
                    ref={recipientInputRef}
                    className="border-0 shadow-none focus-visible:ring-0"
                    value={recipient}
                    onChange={handleRecipientChange}
                    onBlur={handleRecipientBlur}
                    onFocus={handleRecipientChange}
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-background border rounded-md shadow-lg z-10 mt-1">
                      <ul className="py-1">
                        {suggestions.map((contact) => (
                          <li
                            key={contact.id}
                            className="px-3 py-2 cursor-pointer hover:bg-accent"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSuggestionClick(contact);
                            }}
                          >
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {unresolvedRecipient && (
                    <div className="pl-2 pt-1 text-xs text-muted-foreground">
                      <span className="mr-1">Contact not found.</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleOpenNewContactDialog(unresolvedRecipient)}
                      >
                        Add contact?
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <Label htmlFor="cc" className="text-sm text-muted-foreground w-12 text-right">Cc</Label>
                <Input id="cc" className="border-0 shadow-none focus-visible:ring-0" value={cc} onChange={(e) => setCc(e.target.value)} />
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <Label htmlFor="bcc" className="text-sm text-muted-foreground w-12 text-right">Bcc</Label>
                <Input id="bcc" className="border-0 shadow-none focus-visible:ring-0" value={bcc} onChange={(e) => setBcc(e.target.value)} />
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <Label htmlFor="subject" className="text-sm text-muted-foreground w-12 text-right">Subject</Label>
                <Input id="subject" className="border-0 shadow-none focus-visible:ring-0" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div className="p-2 border-b flex items-center gap-1 flex-wrap">
                <Button variant="ghost" size="icon" title="Bold" onMouseDown={preventDefault} onClick={() => handleFormat('bold')}><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Italic" onMouseDown={preventDefault} onClick={() => handleFormat('italic')}><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Underline" onMouseDown={preventDefault} onClick={() => handleFormat('underline')}><Underline className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Strikethrough" onMouseDown={preventDefault} onClick={() => handleFormat('strikeThrough')}><Strikethrough className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title="Unordered List" onMouseDown={preventDefault} onClick={() => handleFormat('insertUnorderedList')}><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Ordered List" onMouseDown={preventDefault} onClick={() => handleFormat('insertOrderedList')}><ListOrdered className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Blockquote" onMouseDown={preventDefault} onClick={() => handleFormat('formatBlock', 'blockquote')}><Quote className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title="Insert Link" onMouseDown={preventDefault} onClick={() => { const url = prompt('Enter a URL:'); if (url) handleFormat('createLink', url); }}><LinkIcon className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title="Attach File"><Paperclip className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Generate Image" onClick={() => setIsGenerateImageDialogOpen(true)}><ImageIcon className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title={isListening ? "Stop dictation" : "Dictate notes"} onMouseDown={preventDefault} onClick={handleDictateNotes} disabled={isSupported === false} className={cn(isListening && "text-destructive")}>
                    {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div
                    ref={editorRef}
                    className="prose dark:prose-invert max-w-none focus:outline-none min-h-full"
                    contentEditable={true}
                    onInput={(e) => { if (!isListening) setBody(e.currentTarget.innerHTML); }}
                    placeholder="Compose your message..."
                />
            </div>
          </CardContent>
          <CardFooter className="border-t p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Button onClick={() => setIsChatOpen(true)} className="bg-[#3B2F4A] hover:bg-[#3B2F4A]/90 text-white"><Bot className="mr-2 h-4 w-4" /> Ogeemo Assistant</Button>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-[#3B2F4A] hover:bg-[#3B2F4A]/90 text-white"><FilePlus className="mr-2 h-4 w-4" /> Templates</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {templates.map(t => <DropdownMenuItem key={t.name} onSelect={() => handleTemplateSelect(t.content)}>{t.name}</DropdownMenuItem>)}
                            <DropdownMenuSeparator />
                            <DialogTrigger asChild><DropdownMenuItem><FilePlus className="mr-2 h-4 w-4" /> Save as Template</DropdownMenuItem></DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
                        <div className="py-4"><Input placeholder="Template Name" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} /></div>
                        <DialogFooter><Button variant="ghost" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button><Button>Save</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={handleSaveToContactFolder} disabled={isSaving || !resolvedContact} className="bg-[#3B2F4A] hover:bg-[#3B2F4A]/90 text-white">
                    {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save to Contact Folder"}
                </Button>
                <Button className="bg-[#3B2F4A] hover:bg-[#3B2F4A]/90 text-white"><Send className="mr-2 h-4 w-4" /> Send</Button>
            </div>
          </CardFooter>
        </Card>
      </div>

       <Dialog open={isGenerateImageDialogOpen} onOpenChange={setIsGenerateImageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Image with AI</DialogTitle>
              <DialogDescription>Describe the image you want to create.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea placeholder="A photorealistic cat..." value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} disabled={isGeneratingImage} />
              {isGeneratingImage && <div className="flex justify-center items-center h-48 w-full border-2 border-dashed rounded-lg"><LoaderCircle className="h-8 w-8 animate-spin" /></div>}
              {generatedImageUrl && !isGeneratingImage && <img src={generatedImageUrl} alt={imagePrompt} className="rounded-lg w-full h-auto object-contain max-h-96" />}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button onClick={handleGenerateImage} disabled={!imagePrompt.trim() || isGeneratingImage}>{isGeneratingImage ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate</>}</Button>
              {generatedImageUrl && <Button onClick={handleInsertGeneratedImage} disabled={isGeneratingImage}>Insert Image</Button>}
            </DialogFooter>
          </DialogContent>
       </Dialog>
      {isChatOpen && <OgeemoChatDialog isOpen={isChatOpen} onOpenChange={setIsChatOpen} />}
    </div>
  );
}

    
