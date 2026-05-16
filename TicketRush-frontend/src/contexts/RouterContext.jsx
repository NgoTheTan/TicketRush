// src/contexts/RouterContext.jsx
// Hash-based router — no external dependency needed
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RouterContext = createContext(null);

function parseHash() {
  const hash = window.location.hash.replace('#', '') || '/';
  const [path, search] = hash.split('?');
  const params = {};
  if (search) {
    new URLSearchParams(search).forEach((v, k) => { params[k] = v; });
  }
  return { path, params };
}

export function RouterProvider({ children }) {
  const [{ path, params }, setRoute] = useState(parseHash);

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((to, queryParams) => {
    let hash = to;
    if (queryParams) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v != null))
      ).toString();
      if (qs) hash += `?${qs}`;
    }
    window.location.hash = hash;
    setRoute(parseHash());
  }, []);

  const goBack = useCallback(() => window.history.back(), []);

  return (
    <RouterContext.Provider value={{ path, params, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}

// Route matcher — supports /events/:id etc.
export function matchRoute(pattern, path) {
  const patParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patParts.length !== pathParts.length) return null;
  const vars = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      vars[patParts[i].slice(1)] = pathParts[i];
    } else if (patParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return vars;
}
