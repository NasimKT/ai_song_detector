// frontend/src/App.js
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    setSelectedFile(acceptedFiles[0]);
    setResult(null);
    setIsNewTask(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: 'audio/*' });

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert("Please select a file.");
      return;
    }

    setLoading(true);
    setResult(null);
    setIsNewTask(false);

    const formData = new FormData();
    formData.append("audioFile", selectedFile);

    try {
      const response = await axios.post("https://ai-song-detector-server.onrender.com/api/upload-audio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const aiResult = response.data.aiReport;
      setResult({
        isAI: aiResult.isAi,
        confidence: aiResult.confidence,
      });
      setIsNewTask(true);
    } catch (error) {
      setResult({ error: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleNewTask = () => {
    setSelectedFile(null);
    setResult(null);
    setIsNewTask(false);
  };

  return (
    <div className="App">
      <h1 className="title">AI Song Detector</h1>

      {/* Hide dropzone when loading */}
      {!loading && (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the file here ...</p>
          ) : selectedFile ? (
            <p>Selected File: {selectedFile.name}</p>
          ) : (
            <p>Drag & Drop an audio file here, or click to select one</p>
          )}
        </div>
      )}

      <button onClick={isNewTask ? handleNewTask : handleSubmit} disabled={!selectedFile || loading}>
        <span>{loading ? "Processing..." : isNewTask ? "New Task" : "Check if AI"}</span>
      </button>


      {loading && <div className="loader"></div>} {/* Circular loader element */}

      {result && (
        <div className="result">
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <div>
              <p>AI-Generated: {result.isAI ? "Yes" : "No"}</p>
              <p>Confidence: {result.confidence}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
