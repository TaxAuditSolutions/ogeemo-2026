
'use client';

import * as React from 'react';
import { LoaderCircle, Search as SearchIcon, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { httpsCallable } from 'firebase/functions';

import { ReportsPageHeader } from "@/components/reports/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type FileItem } from '@/data/files';
import { type Contact } from '@/data/contacts';
import { useAuth } from '@/context/auth-context';

type DataSource = 'contacts' | 'files';

const dataSources: { value: DataSource; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'files', label: 'Files' },
];

type SearchResult = (FileItem | Contact) & { resultType: 'Contact' | 'File' };

export default function AdvancedSearchPage() {
  const [selectedDataSources, setSelectedDataSources] = React.useState<DataSource[]>(['contacts', 'files']);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const { toast } = useToast();
  const { firebaseServices } = useAuth();
  
  const handleDataSourceChange = (sourceValue: DataSource) => {
    setSelectedDataSources(prev => 
        prev.includes(sourceValue)
            ? prev.filter(s => s !== sourceValue)
            : [...prev, sourceValue]
    );
  };

  const handleSelectAllDataSources = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedDataSources(dataSources.map(ds => ds.value));
    } else {
      setSelectedDataSources([]);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
        toast({ variant: 'destructive', title: "Search query cannot be empty." });
        return;
    }
    if (!firebaseServices) {
        toast({ variant: 'destructive', title: "Search Failed", description: "Firebase services are not available." });
        return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const searchFunction = httpsCallable(firebaseServices.functions, 'search');
      const result = await searchFunction({ query: searchQuery, sources: selectedDataSources });
      const data = result.data as { results?: SearchResult[]; error?: string; };

      if (data.error) {
        throw new Error(data.error);
      }

      setSearchResults(data.results || []);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const allSourcesSelected = selectedDataSources.length === dataSources.length;
  const someSourcesSelected = selectedDataSources.length > 0 && !allSourcesSelected;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full space-y-6">
      <ReportsPageHeader pageTitle="Advanced Search" />

      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Advanced Search
        </h1>
        <p className="text-muted-foreground">
          Use AI to find exactly what you're looking for across all your apps.
        </p>
      </header>

      <div className="space-y-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Search Criteria</CardTitle>
            <CardDescription>
              Select data sources and describe your search objective.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-base font-semibold">1. Select Data Sources</label>
              <div className="flex items-center space-x-2">
                 <Checkbox
                    id="select-all"
                    checked={allSourcesSelected ? true : someSourcesSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAllDataSources}
                  />
                  <label htmlFor="select-all" className="font-medium">
                    Select All
                  </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {dataSources.map(source => (
                  <div key={source.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={source.value}
                      checked={selectedDataSources.includes(source.value)}
                      onCheckedChange={() => handleDataSourceChange(source.value)}
                    />
                    <label htmlFor={source.value} className="font-normal w-full cursor-pointer">{source.label}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-semibold">2. Define Search Objective</label>
                <p className="text-sm text-muted-foreground">
                  Describe what you're looking for. For example, "find all emails from John Doe about Project Phoenix" or "show me all incomplete tasks".
                </p>
              </div>
              <div className="relative">
                <Textarea
                  placeholder="I'm looking for..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  rows={3}
                  disabled={isSearching}
                  className="pr-12"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSearch} className="w-full sm:w-auto" disabled={isSearching}>
              {isSearching ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : <SearchIcon className="mr-2 h-4 w-4"/>}
              {isSearching ? 'Searching...' : 'Search Now'}
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
                            <TableHead>Last Modified</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {searchResults.map(item => (
                            <TableRow key={(item.resultType === 'File' ? 'file-' : 'contact-') + item.id}>
                                <TableCell>
                                    {item.resultType === 'Contact' ? <User className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                                </TableCell>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{(item as Contact).email || (item as FileItem).type}</TableCell>
                                <TableCell>{(item as FileItem).modifiedAt ? format(new Date((item as FileItem).modifiedAt), 'PP') : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
