import React, { useState, useEffect } from "react";
import Dexie, { type Table } from "dexie";
import {Download, FileArchive, FileDown, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useAlert } from "../Providers/Alerts";
import JSZip from "jszip";
import heic2any from "heic2any";
import { useGlobals } from "@/Providers/Globals";
import { Card } from "@/components/ui/card";
import CountUp from "@/components/CountUp";
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
// Supported extensions
const availableExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif'];

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
    const { theme, onMobile } = useGlobals();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragState, setDragState] = useState<boolean>(false);
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

    async function convertAnyToWebP(
        blob: Blob,
        onProgress: (progress: number) => void
    ): Promise<Blob> {
        let inputBlob = blob;
        console.log("Input blob type:", blob.type);
        const extName = blob instanceof File ? blob.name.split('.').pop()?.toLowerCase() : undefined;
        // Detect HEIC/HEIF
        if (blob.type === "image/heic" || blob.type === "image/heif" || extName === "heic") {
            try {
                onProgress(5);
                const converted = await heic2any({ blob, toType: "image/png" });
                if (converted instanceof Blob) inputBlob = converted;
                else if (Array.isArray(converted)) inputBlob = converted[0] as Blob;
                onProgress(20);
            } catch (err) {
                console.error("HEIC conversion failed:", err);
                throw new Error("Failed to convert HEIC image.");
            }
        }

        // Decode and draw on canvas
        const imageBitmap = await createImageBitmap(inputBlob);
        const canvas = document.createElement("canvas");
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        for (let p = 20; p <= 90; p += 10) {
            onProgress(p);
            await new Promise((r) => setTimeout(r, 40));
        }

        ctx.drawImage(imageBitmap, 0, 0);

        // Convert to WebP
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => {
                    if (b) {
                        onProgress(100);
                        resolve(b);
                    } else reject(new Error("WebP conversion failed"));
                },
                "image/webp",
                quality / 100
            );
        });
    }
    // async function convertToWebP(
    //     blob: Blob,
    //     onProgress: (progress: number) => void
    // ): Promise<Blob> {
    //     const imageBitmap = await createImageBitmap(blob);
    //     const canvas = document.createElement("canvas");
    //     canvas.width = imageBitmap.width;
    //     canvas.height = imageBitmap.height;
    //     const ctx = canvas.getContext("2d");
    //     if (!ctx) throw new Error("Failed to get 2D context");

    //     // Simulated progress for smoother UX
    //     for (let p = 0; p <= 90; p += 10) {
    //         onProgress(p);
    //         await new Promise((r) => setTimeout(r, 60));
    //     }

    //     ctx.drawImage(imageBitmap, 0, 0);
    //     console.log("Converting to WebP with quality:", quality);
    //     return new Promise((resolve, reject) => {
    //         canvas.toBlob(
    //             (b) => {
    //                 if (b) {
    //                     onProgress(100);
    //                     resolve(b);
    //                 } else reject(new Error("Conversion to WebP failed"));
    //             },
    //             "image/webp",
    //             quality / 100
    //         );
    //     });
    // }

    const getSafeName = (name: string) => {
        if (name.length < 20) return name;
        else {
            let newname = name.split(".webp")[0];
            return newname.slice(0, 10) + "... .webp";
        }
    }

    // Handle file input change
    const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (loading) {
            showError('Conversion in progress', 'Please wait for the current conversion to finish before adding more files.');
            return;
        }
        const files = event.target.files;
        console.log("Files selected for conversion", files?.length);
        if (!files?.length) return;
        const pendingFiles: ConvertedFile[] = [];
        const controlFiles = [];

        for (let i = 0; i < files.length; i++) {

            const file = files[i];
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!ext || !availableExtensions.includes(ext)) {
                showError('Unsupported file type', 'The file ' + file.name + ' has an unsupported format.');
                continue;
            }
            const convertdFile: ConvertedFile = {
                id: Math.round(Math.random() * 1000000000),
                name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
                status: "waiting",
                size: 0,
                progress: 0,
                quality: quality / 100,
            }
            controlFiles.push({
                file: file,
                convertedFile: convertdFile,
                id: convertdFile.id
            });
            pendingFiles.push(convertdFile);
        }
        setConverted((prev) => [...prev, ...pendingFiles]);
        setLoading(true);

        for (let i = 0; i < controlFiles.length; i++) {
            let newFile = controlFiles[i].convertedFile;
            const id = controlFiles[i].id;
            const file = controlFiles[i].file;
            console.log("Starting conversion for file:", file.type, file.name);
            try {
                const webpBlob = await convertAnyToWebP(file, (p) => {
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

            <label
                className="block border-2 border-dashed border-blue-400 rounded-xl p-10 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition"

                style={{
                    backgroundColor: dragState ? (theme === "dark" ? "rgba(71, 200, 247, 0.2)" : "rgba(71, 200, 247, 0.3)") : undefined
                }}

                onDragEnter={() => setDragState(true)}
                onDragLeave={() => setDragState(false)}
                onDragOver={(event) => {
                    if (loading) return;// Disable drag if loading
                    // Prevent default to allow drop
                    event.preventDefault();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";

                    // Attach a one-time drop handler to transfer files into the hidden input and trigger change
                    const label = event.currentTarget as HTMLLabelElement;
                    const onDrop = (ev: DragEvent) => {
                        ev.preventDefault();
                        if (!fileInputRef.current) return;
                        const dt = ev.dataTransfer;
                        if (!dt) return;

                        try {
                            // Populate the file input's files (overrides the readonly property at runtime)
                            Object.defineProperty(fileInputRef.current, "files", {
                                value: dt.files,
                                configurable: true,
                            });
                            // Dispatch a native change event so the existing onChange handler runs
                            const changeEvent = new Event("change", { bubbles: true });
                            fileInputRef.current.dispatchEvent(changeEvent);
                        } catch (err) {
                            console.error("Drop handling failed:", err);
                        }
                    };

                    label.addEventListener("drop", onDrop, { once: true });
                }}
            >
                {
                    !dragState ? (
                        <>
                            <Upload className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                            <span className="font-medium"> Click or drag files here</span>
                        </>
                    ) : (
                        <>
                            <FileArchive className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                            <span className="font-medium"> Release files to load</span>
                        </>
                    )
                }

                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    className="hidden"
                />
            </label>
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 py-6">
                <Card className="px-6 h-[150px] w-[350px] flex flex-col justify-center gap-2">
                    <div className="">
                        <label className="block mb-1 font-medium">Quality: {quality}%</label>
                        <input
                            disabled={loading}
                            type="range"
                            min="1"
                            max="100"
                            value={quality}
                            onChange={(e) => setQuality(parseInt(e.target.value))}
                            className="w-full hover:cursor-grab active:cursor-grabbing"
                        />
                    </div>
                    <div className="">
                        <span className="block mb-1 font-medium">
                            Compatible File Types:
                        </span>
                        <div className="flex items-center justify-center gap-1">
                            {
                                availableExtensions.map((ext) => (
                                    <span key={ext} className="inline-block bg-gray-300 dark:bg-slate-800  dark:text-slate-300 text-xs px-2 py-1 rounded-full mr-2 mb
                                    hover:cursor-pointer hover:bg-blue-400 hover:text-white transition">
                                        .{ext}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                </Card>
                <Card
                    className="px-6 h-[150px] w-[350px]"
                >
                    <div className="text-center text-lg font-inter flex justify-center items-center gap-2">
                        Total Files:
                        <CountUp
                            from={0}
                            to={converted.length}
                            separator=","
                            direction="up"
                            duration={1}
                            className="count-up-text"
                        />
                    </div>
                    <div className="flex justify-center gap-3 ">

                        <>
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition  disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed"
                                disabled={zipping || converted.length === 0 || loading}
                            >
                                <FileDown size={18} />
                                {zipping ? 'Preparing...' : 'Download All'}
                                {zipping && <LoaderCircle className="inline animate-spin" />}
                            </button>

                            <button
                                onClick={handleClear}
                                disabled={converted.length === 0 || loading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-900 transition  disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={18} />
                                Clear All
                            </button>
                        </>

                    </div>

                </Card>
            </div>


            {loading && (
                <p className="text-gray-400 mb-4">Converting... please wait <LoaderCircle className="inline animate-spin" /></p>
            )}

            <div className={`grid gap-2 ${onMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}            >
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
                                    display: 'flex'
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
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-900 transition"
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
