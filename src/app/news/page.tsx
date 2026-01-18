
import { redirect } from 'next/navigation';

export default function NewsPage() {
  // The "News" page has been renamed to "Blog".
  // This redirect ensures that old links continue to work.
  redirect('/blog');
}
