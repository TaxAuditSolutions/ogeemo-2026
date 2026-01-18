
import { BlogPost } from '@/services/blog-service';

export const mockBlogPosts: Omit<BlogPost, 'id' | 'authorId'>[] = [
  {
    title: 'Ogeemo is Now in Beta: The Future of Business Management',
    slug: 'ogeemo-beta-launch',
    content: `
      <p>We are thrilled to announce that Ogeemo is officially in open beta! After months of dedicated development, we're ready to invite you to experience the future of integrated business management.</p>
      <p>Ogeemo is more than just another software tool; it's a comprehensive command center designed to unify your accounting, project management, and client relationships into a single, intelligent platform.</p>
      <h3>What to Expect in the Beta</h3>
      <ul>
        <li><strong>Unified Dashboard:</strong> Get a bird's-eye view of your entire business at a glance.</li>
        <li><strong>AI-Powered Insights:</strong> Let our smart assistant handle tedious tasks and provide you with valuable insights.</li>
        <li><strong>Seamless Integration:</strong> Experience the power of a platform where every module works in perfect harmony.</li>
      </ul>
      <p>Your feedback is crucial during this phase. As a beta tester, you have the unique opportunity to shape the future of Ogeemo. We can't wait to hear what you think.</p>
    `,
    excerpt: 'We are thrilled to announce that Ogeemo is officially in open beta! Join us to experience the future of integrated business management.',
    imageUrl: 'https://picsum.photos/seed/101/600/400',
    authorName: 'Dan White',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'published',
    allowComments: true,
    category: 'Announcements',
  },
  {
    title: '5 Ways Ogeemo Streamlines Your Accounting',
    slug: '5-ways-ogeemo-streamlines-accounting',
    content: `
      <p>Accounting can be a headache for small business owners. Ogeemo's BKS (Bookkeeping Kept Simple) system is designed to change that. Here's how:</p>
      <ol>
        <li><strong>Audit-Ready by Default:</strong> Our system guides you to capture the necessary information, ensuring your books are clean and ready for tax time.</li>
        <li><strong>Cash & Accrual Harmony:</strong> Start with simple cash-based ledgers and seamlessly transition to accrual-based tracking as your business grows.</li>
        <li><strong>Integrated Invoicing:</strong> Time tracked on projects can be instantly converted into professional invoices, eliminating double entry.</li>
        <li><strong>AI-Powered Categorization:</strong> Ogeemo's AI helps suggest expense categories, saving you time and reducing errors.</li>
        <li><strong>Financial Snapshot:</strong> Get a clear, real-time view of your financial health without needing a degree in finance.</li>
      </ol>
      <p>Spend less time in spreadsheets and more time growing your business. That's the Ogeemo promise.</p>
    `,
    excerpt: "Discover how Ogeemo's unique BKS (Bookkeeping Kept Simple) system can transform your financial workflow and give you peace of mind.",
    imageUrl: 'https://picsum.photos/seed/102/600/400',
    authorName: 'Alex Chen',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    status: 'published',
    allowComments: true,
    category: 'Productivity',
  },
];
