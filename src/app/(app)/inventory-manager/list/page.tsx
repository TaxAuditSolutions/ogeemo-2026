'use client';

import { redirect } from 'next/navigation';

export default function InventoryListPage() {
  // This page has been replaced by the new implementation at /inventory-manager/track
  // This redirect is for backward compatibility.
  redirect('/inventory-manager/track');
}
