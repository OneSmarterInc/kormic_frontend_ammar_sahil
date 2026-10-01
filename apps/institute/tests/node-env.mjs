import { registerHooks } from 'node:module';
registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  if (result.format === 'module' && url.includes('portal-core') && url.endsWith('/src/client.js')) {
    return {...result, source: String(result.source).replaceAll('import.meta.env', '({ VITE_API_BASE_URL: "https://api.example.test", VITE_LOCAL_API_BASE_URL: "http://localhost:8000" })')};
  }
  return result;
}});
