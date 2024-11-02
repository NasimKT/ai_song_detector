// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os'; // Import os module to get local IP address

// Function to get the local IP address
const getLocalIp = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        for (const net of networkInterfaces[interfaceName]) {
            // Check if the address is IPv4 and not a loopback address
            if (net.family === 'IPv4' && !net.internal) {
                return net.address; // Return the first non-internal IPv4 address
            }
        }
    }
    return 'localhost'; // Fallback if no valid IP found
};

// Get the local IP address
const localIP = getLocalIp();

export default defineConfig({
    plugins: [react()],
    server: {
        host: localIP, // Use local IP for the server
        port: 5000, // Change this to your desired port
        open: true, // Automatically open the browser
    },
});
