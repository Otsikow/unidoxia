import { createContext } from 'react';
/** Shared pages inside AdminLayout reuse its navigation instead of nesting it. */
export const AdminShellContext = createContext(false);
