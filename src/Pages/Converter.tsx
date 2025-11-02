import React, { useState, useEffect } from "react";
import Dexie, { type Table } from "dexie";
import { Download, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useAlert } from "../Providers/Alerts";
// Define the structure of stored files
interface ConvertedFile {
    id?: number;
    name: string;
    url: string;
    size: number;
    quality?: number;
    progress?: number;
}

// Dexie database setup
class WebPDatabase extends Dexie {
    files!: Table<ConvertedFile, number>;
    constructor() {
        super("webpConverterDB");
        this.version(2).stores({
            files: "++id, name, size, quality",
        });
    }
}
const db = new WebPDatabase();

const ConvertToWebPPage: React.FC = () => {
    const [converted, setConverted] = useState<ConvertedFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [quality, setQuality] = useState(85);
    const { showAlert } = useAlert();
    // Load saved files from Dexie
    useEffect(() => {
        (async () => {
            const files = await db.files.toArray();
            setConverted(files);
        })();
    }, []);

    async function convertToWebP(
        blob: Blob,
        onProgress: (progress: number) => void
    ): Promise<Blob> {
        const imageBitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        // Simulated progress for smoother UX
        for (let p = 0; p <= 90; p += 10) {
            onProgress(p);
            await new Promise((r) => setTimeout(r, 60));
        }

        ctx.drawImage(imageBitmap, 0, 0);
        console.log("Converting to WebP with quality:", quality);
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => {
                    if (b) {
                        onProgress(100);
                        resolve(b);
                    } else reject(new Error("Conversion to WebP failed"));
                },
                "image/webp",
                quality / 100
            );
        });
    }

    const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        console.log("Files selected for conversion", files?.length);
        if (!files?.length) return;

        const pendingFiles: ConvertedFile[] = Array.from(files).map((file) => ({
            id: Math.random(),
            name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
            url: "",
            size: 0,
            progress: 0,
            quality: quality / 100,
        }));
        setConverted((prev) => [...prev, ...pendingFiles]);
        setLoading(true);

        for (let i = 0; i < pendingFiles.length; i++) {
            let newFile = pendingFiles[i];
            const id = newFile.id;
            const file = files[i];

            try {
                const webpBlob = await convertToWebP(file, (p) => {
                    setConverted((prev) =>
                        prev.map((f) => (f.id === id ? { ...f, progress: p } : f))
                    );
                });
                const webpUrl = URL.createObjectURL(webpBlob);
                newFile = {
                    ...newFile,
                    url: webpUrl,
                    size: webpBlob.size,
                    progress: 100,
                };
                await db.files.add(newFile);
                setConverted((prev) =>
                    prev.map((f) => (f.id === id ? newFile : f))
                );
            } catch (err) {
                console.error("Conversion failed:", err);
                showAlert('error', 'Conversion failed for ' + file.name + ': ' + (err as Error).message);
            }
        }

        setLoading(false);
        event.target.value = "";
    };

    const handleDownloadAll = () => {
        converted.forEach((file) => {
            const a = document.createElement("a");
            a.href = file.url;
            a.download = file.name;
            a.click();
        });
    };

    const handleClear = async () => {
        await db.files.clear();
        setConverted([]);
    };
    const clearById = async (id?: number) => {
        if (!id) return;
        await db.files.delete(id).then(() => {
            setConverted((prev) => prev.filter((file) => file.id !== id));
        }).catch((err) => {
            showAlert('error', 'Error deleting file: ' + err.message);
        });
    };
    return (
        <div className="p-8 max-w-4xl mx-auto text-center w-full">
            <h1 className="text-3xl font-bold mb-4">Image → WebP Converter</h1>
            <p className="text-gray-500 mb-6">
                Convert images to optimized WebP format directly in your browser.
            </p>

            <label className="block border-2 border-dashed border-blue-400 rounded-xl p-10 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition mb-4">
                <Upload className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <span className="font-medium">Click or drag files here</span>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    className="hidden"
                />
            </label>
            <div>
                <label className="block mb-2 font-medium">Quality: {quality}%</label>
                <input
                    disabled={loading}
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full mb-4"
                />
            </div>
            <div className="flex justify-center gap-3 mb-4">

                {converted.length > 0 && (
                    <>
                        <button
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Download size={18} />
                            Download All
                        </button>

                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            <Trash2 size={18} />
                            Clear All
                        </button>
                    </>
                )}
            </div>

            {loading && (
                <p className="text-gray-400 mb-4">Converting... please wait <LoaderCircle className="inline animate-spin" /></p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {converted.map((file) => (
                    <div
                        key={file.id}
                        className="border rounded-xl shadow-sm p-4 flex flex-col items-center transition hover:shadow-md"
                    >
                        <div className="w-full h-48 flex items-center justify-center bg-gray-50 rounded-lg mb-2">
                            {file.url ? (
                                <img
                                    src={file.url}
                                    alt={file.name}
                                    className="max-h-44 object-contain"
                                />
                            ) : (
                                <p className="text-gray-400 text-sm">Processing...</p>
                            )}
                        </div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500 mb-2">
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ""} ({file.quality ? file.quality * 100 : 0}%)
                        </p>

                        {/* Progress bar */}
                        {file.progress !== undefined && file.progress < 100 && (
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-2 bg-blue-600 transition-all duration-300"
                                    style={{ width: `${file.progress}%` }}
                                ></div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <a
                                href={file.url}
                                download={file.name}
                                className={`mt-1 px-3 py-1 text-white rounded-md text-sm ${file.url
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                Download
                            </a>
                            <button
                                onClick={() => clearById(file.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConvertToWebPPage;
