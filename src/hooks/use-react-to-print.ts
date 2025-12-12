
'use client';

import { useRef, useCallback } from 'react';

// Helper function to recursively clone nodes and apply computed styles
const cloneWithStyles = (node: HTMLElement, ownerDocument: Document): HTMLElement => {
    const computedStyle = window.getComputedStyle(node);
    const clone = node.cloneNode(false) as HTMLElement;

    // Apply all computed styles as inline styles
    for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i];
        clone.style.setProperty(prop, computedStyle.getPropertyValue(prop), computedStyle.getPropertyPriority(prop));
    }
    
    // Recurse for child nodes
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child instanceof HTMLElement) {
            clone.appendChild(cloneWithStyles(child, ownerDocument));
        } else {
            clone.appendChild(child.cloneNode(true));
        }
    }

    return clone;
};


export function useReactToPrint() {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const nodeToPrint = contentRef.current;
    if (!nodeToPrint) {
      console.error("Print Error: The content to print could not be found.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow pop-ups for this site to print the document.");
        return;
    }

    const doc = printWindow.document;
    doc.write('<!DOCTYPE html><html><head><title>Print</title></head><body></body></html>');

    // Get all style sheets from the main document
    const styleSheets = Array.from(document.styleSheets);
    let allCssRules = "";
    
    styleSheets.forEach(sheet => {
        try {
            // Some stylesheets might be cross-origin and will throw an error
            // when trying to access cssRules. We can safely ignore these.
            if (sheet.cssRules) {
                allCssRules += Array.from(sheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
            }
        } catch (e) {
            console.warn("Could not read stylesheet rules (likely cross-origin):", e);
        }
    });

    const styleEl = doc.createElement('style');
    styleEl.textContent = allCssRules;
    doc.head.appendChild(styleEl);

    // After styles are appended, clone the node and add to the body.
    // This needs a small delay to ensure the browser has processed the styles.
    setTimeout(() => {
      const clonedNode = cloneWithStyles(nodeToPrint, doc);
      doc.body.appendChild(clonedNode);
      
      // A further small delay to ensure the cloned node is rendered with styles
      // before printing. This is the key to avoiding the blank page.
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500); 
    }, 100);

  }, []);

  return { handlePrint, contentRef };
}
