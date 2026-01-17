
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect the root path to the new marketing homepage
  redirect('/website-2');
}
