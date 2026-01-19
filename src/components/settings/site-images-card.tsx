
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Image } from "lucide-react";

export function SiteImagesSettingsCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Site Images</CardTitle>
                <CardDescription>Manage the images used across your marketing website, such as the hero banner.</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button asChild>
                    <Link href="/settings/site-images">
                        <Image className="mr-2 h-4 w-4" /> Manage Site Images
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
