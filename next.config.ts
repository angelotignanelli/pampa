import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fija la raíz del workspace a esta carpeta (hay otros lockfiles en directorios padre).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
