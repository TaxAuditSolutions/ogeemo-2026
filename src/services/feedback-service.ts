
'use client';

// A simple service to simulate feedback submission.
// In a real application, this would send data to a backend,
// an email service, or a database.

interface FeedbackData {
    type: 'bug' | 'feature' | 'general';
    feedback: string;
}

export async function submitFeedback(data: FeedbackData): Promise<{ success: true }> {
    console.log("--- New Feedback Submitted ---");
    console.log("Type:", data.type);
    console.log("Feedback:", data.feedback);
    console.log("----------------------------");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, you might have error conditions, but for now we'll always succeed.
    // if (Math.random() > 0.8) {
    //     throw new Error("Failed to connect to the feedback server. Please try again.");
    // }

    return { success: true };
}
