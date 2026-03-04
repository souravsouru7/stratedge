"use client";

import { useState } from "react";

export default function UploadPage(){

const [file,setFile] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);

const handleUpload = async () => {
  setError(null);
  setSuccess(null);

  // Validate file is selected
  if (!file) {
    setError("Please select a file first");
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Upload failed");
    }

    const data = await res.json();
    setSuccess("Upload successful! URL: " + data.url);
    console.log(data);

  } catch (err) {
    setError(err.message || "Failed to upload file");
    console.error("Upload error:", err);
  } finally {
    setLoading(false);
  }
};

return(

<div className="p-10">

<h1 className="text-2xl mb-6">Upload Trade Screenshot</h1>

<input
 type="file"
 onChange={(e)=>setFile(e.target.files[0])}
 className="mb-4"
/>

<button
 onClick={handleUpload}
 disabled={loading}
 className="bg-blue-600 text-white px-4 py-2 ml-4 disabled:bg-gray-400"
>
 {loading ? "Uploading..." : "Upload"}
</button>

{error && (
  <p className="text-red-500 mt-4">Error: {error}</p>
)}

{success && (
  <p className="text-green-500 mt-4">{success}</p>
)}

</div>

);

}
