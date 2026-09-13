import { cn } from '@/lib/utils';

export function CoPilotMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            className={cn('h-6 w-6', className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M20 12H44C49.523 12 54 16.477 54 22V42C54 47.523 49.523 52 44 52H20C14.477 52 10 47.523 10 42V22C10 16.477 14.477 12 20 12Z" fill="currentColor" opacity="0.12" />
            <path d="M20 12H44C49.523 12 54 16.477 54 22V42C54 47.523 49.523 52 44 52H20C14.477 52 10 47.523 10 42V22C10 16.477 14.477 12 20 12Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <path d="M22 20H35V25H22V20Z" fill="currentColor" />
            <path d="M22 29H35V34H22V29Z" fill="currentColor" />
            <path d="M22 38H35V43H22V38Z" fill="currentColor" />
            <path d="M38 20H46V43H38V20Z" fill="currentColor" opacity="0.92" />
            <path d="M38 18L49 18L49 20L38 20V18Z" fill="currentColor" opacity="0.92" />
        </svg>
    );
}