
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { removeWatermarkFromImage } from './services/geminiService';

// --- Helper Components (defined outside the main App component) ---

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const WandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.2929 2.29289C11.6834 1.90237 12.3166 1.90237 12.7071 2.29289L13.5 3.08579L14.2071 2.37868C14.5976 1.98816 15.2308 1.98816 15.6213 2.37868L16.5 3.25736L17.2071 2.55025C17.5976 2.15973 18.2308 2.15973 18.6213 2.55025L21.4497 5.37868C21.8403 5.7692 21.8403 6.40237 21.4497 6.79289L11.2929 16.9497C10.9024 17.3403 10.2692 17.3403 9.87868 16.9497L2.29289 9.36396C1.90237 8.97344 1.90237 8.34027 2.29289 7.94975L9.05025 1.19239C9.44077 0.801865 10.074 0.801865 10.4645 1.19239L11.2929 2.02081V2.29289ZM12 4.5L15.0607 7.56066L16.5 6.12132L13.4393 3.06066L12 4.5ZM9.87868 5.63604L11.2929 4.22183L5.63604 9.87868L4.22183 8.46447L9.87868 5.63604ZM18.3787 5.06066L19 5.68198L18.2929 6.38909L17.6716 5.76777L18.3787 5.06066ZM15.2574 4.68198L15.9645 3.97487L14.5 5.43934L13.7929 4.73223L15.2574 4.68198Z"/>
        <path d="M5.63604 14.1213L7.05025 15.5355L2.80761 19.7782C2.41709 20.1687 1.78392 20.1687 1.3934 19.7782C1.00287 19.3876 1.00287 18.7545 1.3934 18.3639L5.63604 14.1213Z"/>
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
);

interface ImageDisplayProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, imageUrl, isLoading = false }) => (
    <div className="w-full lg:w-1/2 p-4 flex flex-col items-center">
        <h3 className="text-xl font-semibold text-gray-300 mb-4">{title}</h3>
        <div className="w-full aspect-square bg-gray-800 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center overflow-hidden">
            {isLoading ? (
                <div className="flex flex-col items-center text-cyan-400">
                    <Spinner />
                    <p className="mt-4 text-lg">Procesando...</p>
                </div>
            ) : imageUrl ? (
                <img src={imageUrl} alt={title} className="object-contain w-full h-full" />
            ) : (
                <div className="text-center text-gray-500">
                    <UploadIcon className="mx-auto h-16 w-16" />
                    <p className="mt-2">Aquí se mostrará la imagen</p>
                </div>
            )}
        </div>
    </div>
);

// --- Main App Component ---

function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, sube un archivo de imagen válido.');
        return;
      }
      setOriginalFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setProcessedImage(null); // Reset processed image on new upload
        setError(null);
      };
      reader.onerror = () => {
        setError("Error al leer el archivo de imagen.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveWatermark = useCallback(async () => {
    if (!originalImage || !originalFile) {
      setError("Por favor, sube una imagen primero.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedImage(null);

    try {
        const base64Data = originalImage.split(',')[1];
        if(!base64Data) {
            throw new Error("Invalid image format.");
        }

        const newImageBase64 = await removeWatermarkFromImage(base64Data, originalFile.type);
        setProcessedImage(`data:image/png;base64,${newImageBase64}`);
        
    } catch (err) {
        console.error(err);
        setError("No se pudo procesar la imagen. Por favor, inténtalo de nuevo.");
    } finally {
        setIsLoading(false);
    }
  }, [originalImage, originalFile]);

  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `watermark_removed_${originalFile?.name || 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const resetApp = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setOriginalFile(null);
    setIsLoading(false);
    setError(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
            Removedor de Marcas de Agua
            </h1>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Sube una imagen generada por IA y nuestra tecnología eliminará la marca de agua de Gemini, dejando tu creación limpia y lista para usar.
            </p>
        </header>

        <main>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap items-center justify-center gap-6">
                <label htmlFor="file-upload" className="cursor-pointer flex-grow sm:flex-grow-0 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg">
                    <UploadIcon className="w-6 h-6" />
                    <span>{originalFile ? "Cambiar Imagen" : "Seleccionar Imagen"}</span>
                </label>
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                
                <button 
                    onClick={handleRemoveWatermark}
                    disabled={!originalImage || isLoading}
                    className="flex-grow sm:flex-grow-0 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <WandIcon className="w-6 h-6" />
                    <span>Eliminar Marca de Agua</span>
                </button>

                {processedImage && (
                    <button 
                        onClick={handleDownload}
                        className="flex-grow sm:flex-grow-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg"
                    >
                       <DownloadIcon className="w-6 h-6" />
                       <span>Descargar</span>
                    </button>
                )}
                {originalImage && (
                    <button 
                        onClick={resetApp}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                       Limpiar
                    </button>
                )}
            </div>
            {error && <p className="text-center text-red-400 mt-4 animate-pulse">{error}</p>}
            {originalFile && !error && <p className="text-center text-gray-400 mt-4">Archivo seleccionado: <span className="font-medium text-cyan-300">{originalFile.name}</span></p>}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
              <ImageDisplay title="Original" imageUrl={originalImage} />
              <ImageDisplay title="Resultado" imageUrl={processedImage} isLoading={isLoading} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
