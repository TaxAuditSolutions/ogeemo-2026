'use client';
import { useEffect, useState } from 'react';
import { getFirebaseServices } from '@/firebase';

export default function AuthTestRedirectPage() {
  const [result, setResult] = useState<string>('Loading...');
  
  useEffect(() => {
    try {
      const services = getFirebaseServices();
      setResult(JSON.stringify({
        hasApp: !!services?.app,
        hasAuth: !!services?.auth,
        hasDb: !!services?.db
      }, null, 2));
    } catch(e: any) {
      setResult('Error: ' + e.message);
    }
  }, []);

  return <pre id="result">{result}</pre>;
}
