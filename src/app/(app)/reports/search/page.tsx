'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Search as SearchIcon, Briefcase, User, Book, Mic, Square } from 'lucide-react';

import { ReportsPageHeader } from "@/components/reports/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';

import { getContacts, type Contact } from '@/services/contact-service';
import { getProjects, type Project } from '@/services/project-service';
import { allMenuItems, type MenuItem } from '@/lib/menu-items';

// Define a unified search result type
type SearchResult = 
    | ({ resultType: 'Menu Item' } & MenuItem)
    | ({ resultType: 'Contact' } & Contact)
    | ({ resultType: 'Project' } & Project);

const ResultIcon = ({ type }: { type: SearchResult['resultType'] }) => {
    switch (type) {
        case 'Menu Item': return <Book className="h-5 w-5 text-muted-foreground" />;
        case 'Contact': return <User className="h-5 w-5 text-muted-foreground" />;
        case 'Project': return <Briefcase className="h-5 w-5 text-muted-foreground" />;
        default: return <SearchIcon className="h-5 w-5 text-muted-foreground" />;
    }
};

export default function AdvancedSearchPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const searchInputRef = React.useRef<HTMLTextAreaElement>(null);
  const baseTextRef = React.useRef('');

  // Voice Recognition Logic
  const { isListening, startListening, stopListening, isSupported } = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = baseTextRef.current ? `${baseTextRef.current} ${transcript}` : transcript;
      setSearchQuery(newText);
    },
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      baseTextRef.current = searchQuery.trim();
      startListening();
      searchInputRef.current?.focus();
    }
  };

  // State to hold all searchable data
  const [searchableData, setSearchableData] = React.useState<SearchResult[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function loadData() {
        if (!user) {
            setIsDataLoading(false);
            return;
        }
        try {
            const [contactsData, projectsData] = await Promise.all([
                getContacts(user.uid),
                getProjects(user.uid),
            ]);

            const combinedData: SearchResult[] = [
                ...allMenuItems.map(item => ({ ...item, resultType: 'Menu Item' as const })),
                ...contactsData.map(item => ({ ...item, resultType: 'Contact' as const })),
                ...projectsData.map(item => ({ ...item, resultType: 'Project' as const })),
            ];

            setSearchableData(combinedData);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Data Loading Failed', description: error.message });
        } finally {
            setIsDataLoading(false);
        }
    }
    loadData();
  }, [user, toast]);
  
  const handleSearch = async () => {
    if (isListening) stopListening();
    
    if (!searchQuery.trim()) {
        toast({ variant: 'destructive', title: "Search query cannot be empty." });
        return;
    }

    setIsSearching(true);
    setSearchResults([]);

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const searchTerm = searchQuery.toLowerCase().trim();
        const terms = searchTerm.split(/\s+/).filter(Boolean); // Split into multiple keywords

        const results = searchableData.filter(item => {
            let searchableText = '';
            if (item.resultType === 'Menu Item') {
                searchableText = `${item.label}`.toLowerCase();
            } else if (item.resultType === 'Contact') {
                searchableText = `${item.name} ${item.email} ${item.businessName || ''}`.toLowerCase();
            } else if (item.resultType === 'Project') {
                searchableText = `${item.name} ${item.description || ''}`.toLowerCase();
            }
            
            return terms.every(term => searchableText.includes(term));
        });
        
        setSearchResults(results);
        
        if (results.length === 0) {
            toast({ title: "No Results", description: "Your search did not match any items." });
        }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: error.message || 'An unexpected error occurred during the client-side search.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (item: SearchResult) => {
    let path = '';
    if (item.resultType === 'Menu Item') {
        path = typeof item.href === 'string' ? item.href : item.href.pathname;
    } else if (item.resultType === 'Contact') {
        path = '/contacts';
    } else if (item.resultType === 'Project') {
        path = `/projects/${item.id}/tasks`;
    }
    
    if (path) {
        router.push(path);
    }
  };
  
  return (
    <div className="p-4 sm:p-6 flex flex-col h-full space-y-6">
      <ReportsPageHeader pageTitle="Advanced Search" />

      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Global Search
        </h1>
        <p className="text-muted-foreground">
          Find anything across Ogeemo using text or voice.
        </p>
      </header>

      <div className="space-y-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Search Ogeemo</CardTitle>
            <CardDescription>
              Enter a search query or use the microphone to find menu items, contacts, and projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
                <Textarea
                    ref={searchInputRef}
                    placeholder={isListening ? "Listening..." : "e.g., 'invoice' or 'project phoenix'"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                    }
                    }}
                    rows={2}
                    disabled={isSearching || isDataLoading}
                    className={cn(
                        "pr-12 resize-none transition-all",
                        isListening && "border-destructive ring-destructive shadow-destructive/10"
                    )}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute right-2 top-2 h-8 w-8 rounded-full",
                        isListening ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={handleMicClick}
                    disabled={isSearching || isDataLoading || isSupported === false}
                    title={isListening ? "Stop listening" : "Search by voice"}
                >
                    {isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSearch} className="w-full sm:w-auto" disabled={isSearching || isDataLoading}>
              {isSearching || isDataLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : <SearchIcon className="mr-2 h-4 w-4"/>}
              {isSearching ? 'Searching...' : isDataLoading ? 'Loading data...' : 'Search Now'}
            </Button>
          </CardFooter>
        </Card>
        
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>Found {searchResults.length} matching item(s).</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Type</TableHead>
                            <TableHead>Name / Title</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {searchResults.map((item, index) => {
                            let name = '';
                            let details = '';
                            if(item.resultType === 'Menu Item') {
                                name = item.label;
                                details = `Navigate to ${item.label}`;
                            } else if (item.resultType === 'Contact') {
                                name = item.name;
                                details = item.email || '';
                            } else if (item.resultType === 'Project') {
                                name = item.name;
                                details = item.description || '';
                            }
                            
                            return (
                            <TableRow key={`${item.resultType}-${index}`} onClick={() => handleResultClick(item)} className="cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                    <ResultIcon type={item.resultType} />
                                </TableCell>
                                <TableCell className="font-medium">{name}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-sm">{details}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
