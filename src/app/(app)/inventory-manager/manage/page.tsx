
'use client';

import { redirect } from 'next/navigation';

export default function ManageInventoryRedirectPage() {
  // This page is now obsolete and its functionality has been merged
  // into the enhanced inventory tracking page.
  redirect('/inventory-manager/track');
}
