
import Link from "next/link";
import { Logo } from "../logo";

export function SiteFooter() {
    return (
        <footer className="border-t py-6 md:py-8">
            <div className="container text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Ogeemo Inc. All rights reserved.</p>
            </div>
        </footer>
    )
}
