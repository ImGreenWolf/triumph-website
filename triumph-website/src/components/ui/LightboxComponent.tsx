'use client'
import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

type LightboxImage = {
  src: string;
  alt?: string;
};

type ContextType = {
  openImage: (image: LightboxImage) => void;
};

const LightboxContext = createContext<ContextType | null>(null);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<LightboxImage | null>(null);

  return (
    <LightboxContext.Provider
      value={{
        openImage: setImage,
      }}
    >
      {children}

      {image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setImage(null)}
        >
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="absolute right-6 top-6 text-4xl text-white"
            onClick={() => setImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </LightboxContext.Provider>
  );
}

export function useLightbox() {
  const ctx = useContext(LightboxContext);

  if (!ctx) throw new Error("Wrap your app in LightboxProvider");

  return ctx;
}