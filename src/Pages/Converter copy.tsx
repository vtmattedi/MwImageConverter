import React, { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, Download, Trash2 } from "lucide-react";

interface ConvertedFile {
  name: string;
  url: string;
  size: number;
  data: string; // base64 for persistence
  progress: number; // 0–100
  status: "pending" | "converting" | "done" | "error";
}

const STORAGE_KEY = "converted-webp-files";

const ConvertToWebPPage: React.FC = () => {
  const [converted, setConverted] = useState<ConvertedFile[]>([]);
  const [loading, setLoading] = useState(false);

  // 🧠 Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const files: ConvertedFile[] = JSON.parse(saved);
        const withURLs = files.map((f) => ({
          ...f,
          url: URL.createObjectURL(base64ToBlob(f.data)),
          progress: 100,
          status: "done",
        }));
        setConverted(withURLs);
      } catch (e) {
        console.error("Failed to parse saved files:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // 🧩 Helpers for base64 <-> Blob
  function base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(",")[1]);
    const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 🖼️ Convert image to WebP (simulated incremental progress)
  async function convertToWebP(blob: Blob, onProgress: (p: number) => void): Promise<Blob> {
    onProgress(20);
    const imageBitmap = await createImageBitmap(blob);
    onProgress(50);

    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    ctx.drawImage(imageBitmap, 0, 0);
    onProgress(80);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            onProgress(100);
            resolve(b);
          } else reject(new Error("Conversion to WebP failed"));
        },
        "image/webp",
        0.85
      );
    });
  }

  // 📤 Handle file uploads
  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);

    const pendingFiles: ConvertedFile[] = Array.from(files).map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
      url: "",
      size: 0,
      data: "",
      progress: 0,
      status: "pending",
    }));

    setConverted((prev) => [...prev, ...pendingFiles]);

    // Convert files one by one (can also be parallelized)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const index = converted.length + i;

      updateFileStatus(index, { status: "converting", progress: 10 });

      try {
        const webpBlob = await convertToWebP(file, (p) => updateFileStatus(index, { progress: p }));
        const base64 = await blobToBase64(webpBlob);
        const url = URL.createObjectURL(webpBlob);
        const newFile: Partial<ConvertedFile> = {
          url,
          size: webpBlob.size,
          data: base64,
          progress: 100,
          status: "done",
        };
        updateFileStatus(index, newFile);

        persistToLocalStorage();
      } catch (err) {
        console.error("Error converting file:", file.name, err);
        updateFileStatus(index, { status: "error" });
      }
    }

    setLoading(false);
  };

  const updateFileStatus = (index: number, changes: Partial<ConvertedFile>) => {
    setConverted((prev) => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], ...changes };
      return newArr;
    });
  };

  const persistToLocalStorage = () => {
    setConverted((prev) => {
      const savable = prev
        .filter((f) => f.status === "done")
        .map(({ name, size, data }) => ({ name, size, data }));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savable));
        } catch (error) {
           alert("Failed to save files to localStorage. Storage limit might have been reached.");
        }
      return prev;
    });
  };

  // ⬇️ Download all
  const handleDownloadAll = () => {
    for (const file of converted.filter((f) => f.status === "done")) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

  // 🧹 Clear all files
  const handleClearAll = () => {
    for (const file of converted) URL.revokeObjectURL(file.url);
    setConverted([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900/70 shadow-xl rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
        <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
          <ImageIcon className="w-8 h-8 text-blue-600" />
          Image → WebP Converter
        </h1>

        <label className="block border-2 border-dashed border-blue-400 rounded-xl p-10 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition">
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

        {loading && (
          <p className="text-blue-500 text-center mt-4 animate-pulse">
            Converting images to WebP...
          </p>
        )}

        {converted.length > 0 && (
          <>
            <div className="flex justify-between items-center mt-8 mb-3">
              <h2 className="text-lg font-semibold">
                Converted Images ({converted.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <Download className="w-4 h-4" /> Download All
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {converted.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow hover:shadow-lg transition flex flex-col"
                >
                  {file.url ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-48 object-contain bg-slate-50 dark:bg-slate-800"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm">
                      {file.status === "error" ? "Error" : "Processing..."}
                    </div>
                  )}

                  <div className="p-3 flex flex-col flex-grow justify-between">
                    <div>
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {file.status === "done"
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : `${file.progress}%`}
                      </p>
                      {file.status !== "done" && (
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                          <div
                            className={`h-2 bg-blue-600 transition-all duration-300`}
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {file.status === "done" && (
                      <a
                        href={file.url}
                        download={file.name}
                        className="mt-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-md transition"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConvertToWebPPage;
