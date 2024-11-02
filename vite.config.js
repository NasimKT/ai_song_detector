import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Export the Vite configuration
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Use 0.0.0.0 to allow access in cloud environments
        port: 3000, // Use the default Render port or change as needed
        strictPort: true, // Fail if port is already in use
    },
    build: {
        outDir: 'dist', // Default output folder for static files
    },
});
