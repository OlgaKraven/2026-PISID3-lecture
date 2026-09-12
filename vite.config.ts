import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:process.env.BASE_PATH || '/2026-PISID3-lecture/',build:{sourcemap:false}});
