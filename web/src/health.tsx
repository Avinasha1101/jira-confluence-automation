import { createContext, useContext } from 'react';
import type { Health } from './api';

export const HealthContext = createContext<Health | null>(null);
export const useHealth = () => useContext(HealthContext);
