import { defineConfig } from "vite"; import { resolve } from "path";
export default defineConfig({ build:{ outDir:"dist", emptyOutDir:true, rollupOptions:{ input:{ popup: resolve(__dirname,"popup.html") }, output:{ entryFileNames:"[name].js" } } } });
