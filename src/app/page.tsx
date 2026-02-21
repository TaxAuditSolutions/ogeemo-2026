import { redirect } from 'next/navigation';
import { getCurrentUserId } from './actions';

/**
 * @fileOverview The root landing page. 
 * Redirects to the welcome page if authenticated, otherwise to the marketing about page.
 */
export default async function Home() {
  const userId = await getCurrentUserId();
  
  if (userId) {
    redirect('/welcome');
  } else {
    redirect('/about');
  }
}
