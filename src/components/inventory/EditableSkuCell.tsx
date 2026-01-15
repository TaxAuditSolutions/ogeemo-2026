
'use client';

import React from 'react';
import { type Item as InventoryItem } from '@/services/inventory-service';

interface EditableSkuCellProps {
  item: InventoryItem;
  onEdit: () => void;
}

export function EditableSkuCell({ item, onEdit }: EditableSkuCellProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent the row's onClick from firing
        onEdit();
      }}
      className="hover:underline text-left"
      aria-label={`Edit item ${item.name}`}
    >
      {item.sku || 'N/A'}
    </button>
  );
}
