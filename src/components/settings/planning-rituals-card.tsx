"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PlanningRitualsCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Planning Rituals</CardTitle>
                <CardDescription>Configure your automated daily and weekly planning sessions to build a routine of focus and clarity.</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button asChild>
                    <Link href="/settings/rituals">
                        Configure Rituals <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
