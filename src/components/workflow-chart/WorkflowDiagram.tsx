
'use client';

import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { LoaderCircle, AlertTriangle } from 'lucide-react';

// Generate a unique ID for each diagram instance
let currentId = 0;
const uniqueId = () => {
  currentId += 1;
  return `mermaid-diagram-${currentId}`;
};

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#F2F2F2',
    primaryTextColor: '#1A1A1A',
    primaryBorderColor: '#3B2F4A',
    lineColor: '#3B2F4A',
    secondaryColor: '#C3FFF9',
    tertiaryColor: '#FFFFFF',
    fontSize: '14px',
  },
});

interface WorkflowDiagramProps {
  chart: string;
}

export const WorkflowDiagram = ({ chart }: WorkflowDiagramProps) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const diagramId = useRef(uniqueId());

  useEffect(() => {
    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // First, check if the syntax is valid without rendering
        await mermaid.parse(chart);
        // If valid, render the SVG
        const { svg: renderedSvg } = await mermaid.render(diagramId.current, chart);
        setSvg(renderedSvg);
      } catch (e: any) {
        setError(e.message || 'Invalid Mermaid syntax.');
        setSvg(null); // Clear previous valid SVG on error
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce rendering to avoid flashing on every keystroke
    const timerId = setTimeout(() => {
        if (chart.trim()) {
            renderDiagram();
        } else {
            setError("The diagram is empty.");
            setSvg(null);
            setIsLoading(false);
        }
    }, 500);

    return () => clearTimeout(timerId);
  }, [chart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Could not render diagram</p>
        <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded-md max-w-full overflow-auto">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div 
        className="w-full h-full flex items-center justify-center" 
        dangerouslySetInnerHTML={{ __html: svg || '' }} 
    />
  );
};
