import React, { useState, useCallback, useMemo } from 'react';
import { generateImageAndAnalysis } from './services/geminiService';
import { AppStatus } from './types';
import type { GenerationResult } from './types';

// --- Helper Functions ---
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

// --- SVG Icons (defined outside components to prevent re-creation) ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const RedoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const ResetIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-3.181-4.991-3.182-3.182a8.25 8.25 0 0 0-11.664 0l-3.181 3.182m3.181 4.991h4.992" />
    </svg>
);


// --- UI Components ---

const Header: React.FC = () => (
    <header className="w-full p-4 text-center">
        <h1 className="text-4xl font-bold text-text-main tracking-tight sm:text-5xl">커리어 비전 <span className="text-primary">AI</span></h1>
        <p className="mt-2 text-lg text-text-muted">사진을 업로드하여 당신의 미래 직업을 확인해보세요!</p>
    </header>
);

interface ImageUploaderProps {
    onImageUpload: (file: File) => void;
    appStatus: AppStatus;
}
const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, appStatus }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
        }
    };
    
    return (
        <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-center p-8 border border-white/50 rounded-2xl bg-white/40 backdrop-blur-lg shadow-lg hover:bg-white/60 hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <UploadIcon className="w-16 h-16 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-text-main">사진 업로드</h2>
            <p className="mt-1 text-sm text-text-muted">파일을 드래그 앤 드롭하거나 클릭하여 선택하세요</p>
            <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={appStatus === AppStatus.PROCESSING}
            />
        </div>
    );
};

interface ResultDisplayProps {
    originalImage: string;
    result: GenerationResult;
    prompt: string;
    onPromptChange: (value: string) => void;
    onRegenerate: () => void;
    onReset: () => void;
    isLoading: boolean;
}
const ResultDisplay: React.FC<ResultDisplayProps> = ({ originalImage, result, prompt, onPromptChange, onRegenerate, onReset, isLoading }) => {
    
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = result.image;
        link.download = `${result.title.replace(/\s+/g, '_')}_career_vision.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col gap-4">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg border border-primary/20 bg-black/10 transform transition-transform duration-300 hover:scale-105">
                    <img src={originalImage} alt="원본 이미지" className="w-full h-full object-contain"/>
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold py-1 px-3 rounded-full">원본</div>
                </div>
                 <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-4 rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl">
                    <h3 className="text-lg font-semibold mb-2 text-primary">다른 직업으로 시도해보기</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => onPromptChange(e.target.value)}
                            placeholder="예: 우주비행사, 셰프, 개발자..."
                            className="flex-grow bg-white/80 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none transition text-text-main placeholder:text-text-muted"
                            disabled={isLoading}
                        />
                        <button onClick={onRegenerate} disabled={isLoading || !prompt} className="bg-primary hover:bg-primary-focus disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105">
                            <RedoIcon className="w-5 h-5" />
                            <span>생성하기</span>
                        </button>
                    </div>
                 </div>
                 <button onClick={onReset} className="w-full bg-gray-200 hover:bg-gray-300 text-text-main font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105">
                    <ResetIcon className="w-5 h-5"/>
                    새 이미지 업로드
                 </button>
            </div>
            <div className="flex flex-col gap-4">
                 <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg border-2 border-primary bg-black/10 transform transition-transform duration-300 hover:scale-105">
                    <img src={result.image} alt={result.title} className="w-full h-full object-contain"/>
                    <div className="absolute top-2 left-2 bg-primary text-white text-xs font-bold py-1 px-3 rounded-full">AI 생성</div>
                </div>
                <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl">
                    <h2 className="text-3xl font-bold text-text-main">{result.title}</h2>
                    <p className="mt-2 text-text-muted">{result.description}</p>
                    <button onClick={handleDownload} className="mt-4 bg-accent hover:bg-pink-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 w-full justify-center transform hover:scale-105">
                        <DownloadIcon className="w-5 h-5"/>
                        이미지 다운로드
                    </button>
                </div>
            </div>
        </div>
    );
};


const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xl text-text-main font-semibold">{message}</p>
    </div>
);


// --- Main App Component ---
export default function App() {
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [originalImage, setOriginalImage] = useState<{ file: File, base64: string } | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    const isLoading = useMemo(() => status === AppStatus.PROCESSING, [status]);

    const handleImageUpload = useCallback(async (file: File) => {
        setStatus(AppStatus.PROCESSING);
        setLoadingMessage('이미지 준비 중...');
        setError(null);
        try {
            const base64 = await toBase64(file);
            setOriginalImage({ file, base64 });
            setStatus(AppStatus.IDLE);
        } catch (e) {
            setError("이미지 파일을 읽는데 실패했습니다.");
            setStatus(AppStatus.ERROR);
        } finally {
            setLoadingMessage('');
        }
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!originalImage) return;

        setStatus(AppStatus.PROCESSING);
        setLoadingMessage(prompt ? `"${prompt}"(으)로 변신 중...` : '당신의 잠재력을 분석 중입니다...');
        setError(null);
        setResult(null);

        try {
            const apiResult = await generateImageAndAnalysis(originalImage.base64, originalImage.file.type, prompt);
            setResult(apiResult);
            setStatus(AppStatus.SUCCESS);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
            setError(errorMessage);
            setStatus(AppStatus.ERROR);
        } finally {
            setLoadingMessage('');
        }
    }, [originalImage, prompt]);
    
    const handleResetAll = useCallback(() => {
        setStatus(AppStatus.IDLE);
        setOriginalImage(null);
        setPrompt('');
        setResult(null);
        setError(null);
    }, []);
    
    return (
        <div className="min-h-screen w-full font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
            {isLoading && <Loader message={loadingMessage} />}
            <Header />
            <main className="w-full flex-grow flex flex-col items-center justify-center mt-8">
                {status === AppStatus.IDLE && !originalImage && (
                    <ImageUploader onImageUpload={handleImageUpload} appStatus={status} />
                )}

                {status !== AppStatus.SUCCESS && originalImage && (
                    <div className="w-full max-w-2xl flex flex-col items-center gap-6">
                        <div className="w-full max-w-lg p-2 bg-black/10 rounded-2xl shadow-xl border-2 border-primary/20">
                            <img src={originalImage.base64} alt="업로드된 이미지 미리보기" className="w-full h-full max-h-[40vh] object-contain rounded-xl" />
                        </div>
                        <div className="w-full p-6 bg-white/40 backdrop-blur-lg border border-white/50 rounded-xl shadow-md">
                             <label htmlFor="prompt-input" className="block text-lg font-medium mb-2 text-primary">원하는 직업을 입력하세요 (선택 사항)</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    id="prompt-input"
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="예: 우주비행사, 셰프, 개발자..."
                                    className="flex-grow bg-white/80 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition text-text-main placeholder:text-text-muted"
                                    disabled={isLoading}
                                />
                                <button onClick={handleGenerate} disabled={isLoading} className="bg-primary hover:bg-primary-focus disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg">
                                    {prompt ? "비전 생성하기" : "분석 및 생성"}
                                </button>
                            </div>
                        </div>
                         <button onClick={handleResetAll} className="text-text-muted hover:text-text-main transition underline">
                            또는 다른 이미지 업로드
                         </button>
                    </div>
                )}
                
                {status === AppStatus.SUCCESS && result && originalImage && (
                    <ResultDisplay 
                        originalImage={originalImage.base64}
                        result={result}
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        onRegenerate={handleGenerate}
                        onReset={handleResetAll}
                        isLoading={isLoading}
                    />
                )}
                
                {(status === AppStatus.ERROR || error) && (
                   <div className="mt-6 w-full max-w-2xl bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg">
                        <p className="font-semibold">오류가 발생했습니다</p>
                        <p className="text-sm">{error}</p>
                   </div>
                )}

            </main>
        </div>
    );
}