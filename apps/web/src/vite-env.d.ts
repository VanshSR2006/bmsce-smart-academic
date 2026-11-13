/// <reference types="vite/client" />

// Augment ImportMetaEnv with the VITE_* variables used by this project
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SOCKET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

