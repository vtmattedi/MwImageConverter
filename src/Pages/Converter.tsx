import React, { useState, useEffect } from "react";
import Dexie, { type Table } from "dexie";
import { Download, FileDown, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useAlert } from "../Providers/Alerts";
import JSZip from "jszip";
import { useGlobals } from "@/Providers/Globals";
// Define the structure of stored files
interface ConvertedFile {
    id?: number;
    name: string;
    base64?: string;
    size: number;
    quality?: number;
    progress?: number;
    status: string;
    errorMessage?: string;
}

// Dexie database setup
class WebPDatabase extends Dexie {
    files!: Table<ConvertedFile, number>;
    constructor() {
        super("webpConverterDB");
        this.version(5).stores({
            files: "++id, name, size, quality, base64",
        });
    }
}
const db = new WebPDatabase();

const ConvertToWebPPage: React.FC = () => {
    const [converted, setConverted] = useState<ConvertedFile[]>([].map((status, index) => {
        return {
            id: index + 1,
            name: `example${index + 1}.webp`,
            size: 12345,
            quality: 0.85,
            progress: 100,
            status: status,
        }
    }));
    const [loading, setLoading] = useState(false);
    const [quality, setQuality] = useState(85);
    const [zipping, setZipping] = useState(false);
    const { theme } = useGlobals();
    const { showError } = useAlert();
    // Load saved files from Dexie
    useEffect(() => {
        (async () => {
            const files = await db.files.toArray();
            setConverted((prev) => [...files, ...prev]);
        })();
    }, []);
    const getStatusColor = (status: string | undefined) => {
        const darkMode = theme === 'dark';
        switch (status) {
            case "waiting":
                return darkMode ? "yellow" : "#cc3d00";
            case "saving":
                return "green";
            case "error":
                return "red";
            case "converting":
                return darkMode ? "cyan" : "blue";
            default:
                return "gray";
        }
    };
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

    const getSafeName = (name: string) => {
        if (name.length < 20) return name;
        else {
            let newname = name.split(".webp")[0];
            return newname.slice(0, 10) + "... .webp";
        }
    }

    // Handle file input change
    const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (loading)
        {
            showError('Conversion in progress', 'Please wait for the current conversion to finish before adding more files.');
            return;
        }
        const files = event.target.files;
        console.log("Files selected for conversion", files?.length);
        if (!files?.length) return;

        const pendingFiles: ConvertedFile[] = Array.from(files).map((file) => ({
            id: Math.round(Math.random() * 1000000000),
            name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
            url: "",
            status: "waiting",
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
                        prev.map((f) => (f.id === id ? { ...f, progress: p, status: "converting" } : f))
                    );
                });
                setConverted((prev) =>
                    prev.map((f) => (f.id === id ? { ...f, progress: 100, status: "saving" } : f))
                );

                const b64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (reader.result) {
                            resolve(reader.result as string);
                        } else {
                            reject(new Error("Failed to read file"));
                        }
                    };
                    reader.readAsDataURL(webpBlob);
                });
                newFile.status = "done";
                newFile = {
                    ...newFile,
                    size: webpBlob.size,
                    base64: b64,
                    progress: 100,
                };
                await db.files.add(newFile);
                setConverted((prev) =>
                    prev.map((f) => (f.id === id ? newFile : f))
                );
            } catch (err) {
                console.error("Conversion failed:", err);
                newFile.status = "error";
                newFile.errorMessage = (err as Error).message;
                showError('Conversion failed!', 'Conversion failed for ' + file.name + '. Error: ' + (err as Error).message);
            }
        }

        setLoading(false);
        // Reset file input so that we can upload the same file again if needed
        event.target.value = "";
    };

    const handleDownloadAll = async () => {
        // Create a zip of all converted files
        const zip = new JSZip();
        setZipping(true);

        for (const file of converted) {
            const blob = await (await fetch(file.base64!)).blob();
            zip.file(file.name, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = "converted_images.zip";
        a.click();
        URL.revokeObjectURL(zipUrl);
        setZipping(false);
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
            showError('Error deleting file', 'Error: ' + (err as Error).message);
        });
    };
    return (
        <div className="p-8 max-w-[1200px] mx-auto text-center w-full">
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
            <div className="w-64 mx-auto">
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
                            disabled={zipping}
                        >
                            <FileDown size={18} />
                            {zipping ? 'Preparing...' : 'Download All'}
                            {zipping && <LoaderCircle className="inline animate-spin" />}
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {converted.map((file) => (
                    <div
                        key={file.id}
                        className="border rounded-xl shadow-sm p-4 flex flex-col items-center transition hover:shadow-md"
                    >
                        <div className="mb-2 w-full flex flex-col items-center h-55">
                            {file.status === "error" ? (
                                <div className="w-full flex items-center justify-start align-center h-full flex-col max-h-48 overflow-scroll">
                                    <p style={{ color: getStatusColor('error') }} className="text-lg text-center h-full items-center justify-center align-center border">Conversion Failed.</p>
                                    {/* {file.errorMessage && <p className="text-sm text-center mt-2 text-gray-500">Error: {file.errorMessage}</p>} */}
                                </div>
                            ) : (
                                <>
                                    <div className="w-full flex items-center justify-center rounded-lg mb-2">

                                        {
                                            file.base64 ? (
                                                <img
                                                    src={file.base64}
                                                    alt={file.name}
                                                    className="h-44 object-contain border rounded-lg"
                                                />
                                            ) : (
                                                <p
                                                    style={{
                                                        color: getStatusColor(file.status)
                                                    }}
                                                    className="text-lg text-center h-44 flex items-center justify-center"

                                                >{file.status?.charAt(0).toUpperCase() + file.status?.slice(1)} {file.status !== "waiting" && <LoaderCircle className="inline animate-spin ml-2" />}</p>
                                            )
                                        }
                                    </div>
                                    <p className="font-medium text-sm">{getSafeName(file.name)}</p>
                                    <p className="text-xs text-gray-500 mb-2">
                                        {file.size ? file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB` : ""}
                                        {/* ({file.quality ? file.quality * 100 : 0}%) */}
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
                                </>
                            )}
                        </div>
                        <div className="flex gap-3 flex-row">
                            <a
                                style={{
                                    display:'flex'
                                }}
                                href={file.base64}
                                download={file.name}
                                className={`mt-1 px-3 py-1 text-white rounded-md text-sm ${file.base64
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                <Download className="inline-block mr-1" /> Download
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
