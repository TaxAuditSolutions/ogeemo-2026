
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PackageSearch, ShoppingCart, Truck, Wrench, Landmark, FileOutput } from "lucide-react";
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


export default function InventoryManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
       <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <PackageSearch className="h-8 w-8" />
          Inventory Manager
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mt-2">
          A flexible system for tracking everything your business uses and sells—from retail products to office supplies and project materials.
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Core Features (Coming Soon)</CardTitle>
                <CardDescription>This manager will be built around three key areas of asset tracking.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <FeatureDetail title="Item & Supply Tracking" icon={Wrench}>
                        <ul>
                            <li><strong>Centralized Item Catalog:</strong> Maintain a master list of all items, whether for resale, internal use, or project work.</li>
                            <li><strong>Real-Time Stock Levels:</strong> Track quantities on hand, set low-stock alerts, and view inventory valuation.</li>
                            <li><strong>Categorization:</strong> Organize items by type (e.g., Product, Supply, Material) for accurate accounting and reporting.</li>
                             <li><strong>Project Allocation:</strong> Assign materials and supplies directly to projects to track job costs accurately.</li>
                        </ul>
                    </FeatureDetail>
                    <FeatureDetail title="Supplier & Purchase Management" icon={ShoppingCart}>
                        <ul>
                            <li><strong>Supplier Database:</strong> Keep a record of all your vendors, their contact information, and the items they supply.</li>
                            <li><strong>Purchase Orders:</strong> Create and send professional purchase orders to your suppliers.</li>
                            <li><strong>Receiving & Stocking:</strong> Easily update stock levels when new orders arrive, ensuring your inventory count is always accurate.</li>
                        </ul>
                    </FeatureDetail>
                     <FeatureDetail title="Order Fulfillment & Sales" icon={Truck}>
                        <ul>
                            <li><strong>Sales Orders:</strong> Track customer orders and automatically deduct items from inventory.</li>
                            <li><strong>Invoice Integration:</strong> Generate invoices in the Accounting Hub directly from sales orders.</li>
                            <li><strong>Returns Management:</strong> Handle customer returns and update stock levels accordingly.</li>
                        </ul>
                    </FeatureDetail>
                </Accordion>
            </CardContent>
        </Card>

        <Card className="border-2 border-primary/20">
            <CardHeader>
                <CardTitle>Accounting Hub Integration</CardTitle>
                <CardDescription>The Inventory Manager will work seamlessly with your financial data to eliminate double-entry and provide a clear financial picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Landmark className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Automated Accounts Payable</h4>
                        <p className="text-sm text-muted-foreground">When you mark a Purchase Order as received, a corresponding bill will be automatically created in your <strong>Accounts Payable</strong> ledger, ready for payment. This ensures you never miss a payment and your expenses are recorded instantly.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <FileOutput className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Seamless Invoicing</h4>
                        <p className="text-sm text-muted-foreground">When an item is sold or materials are used for a client project, they can be added directly to an invoice in <strong>Accounts Receivable</strong>. The system will link the sale to the inventory reduction, keeping your stock and revenue perfectly in sync.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
