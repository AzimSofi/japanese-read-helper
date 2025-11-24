'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    // Fetch the OpenAPI spec
    fetch('/api/swagger-spec')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error('Failed to load API spec:', err));
  }, []);

  if (!spec) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading API Documentation...</h1>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'auto' }}>
      <SwaggerUI spec={spec} />
    </div>
  );
}
