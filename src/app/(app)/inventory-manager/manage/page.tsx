
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManageInventoryPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="relative text-center">
         <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline">
                <Link href="/inventory-manager">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inventory Hub
                </Link>
            </Button>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">
          Manage Inventory
        </h1>
      </header>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>This is where you will add, edit, and manage your inventory items.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                <p>Inventory management features are coming soon.</p>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
