import React, { useState } from 'react';
import axios from 'axios';

const UserActivity = () => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [currentLogs, setCurrentLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [sortOrder, setSortOrder] = useState('desc');

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const handleFileSelect = (event) => {
        clearMessages();
        const files = Array.from(event.target.files);
        setSelectedFiles(prevFiles => [...prevFiles, ...files]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const sortLogs = (logs, order) => {
        return [...logs].sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return order === 'asc' ? dateA - dateB : dateB - dateA;
        });
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select files to upload');
            return;
        }

        clearMessages();
        try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            setLoading(true);

            const response = await axios.post(
                'http://localhost:5002/api/upload/text',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total
                            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            : 0;
                        setUploadProgress(progress);
                    },
                }
            );

            setSuccess(`Successfully uploaded ${response.data.count} log entries`);
            setSelectedFiles([]);
            setCurrentLogs(sortLogs(response.data.logs, sortOrder));

        } catch (error) {
            console.error('Upload failed:', error);
            setError(error.response?.data?.error || error.message || 'Failed to upload files');
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const toggleSort = () => {
        const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(newOrder);
        setCurrentLogs(prev => sortLogs(prev, newOrder));
    };

    return (
        <div className="min-h-screen bg-ink-900 text-paper-50 pt-20 py-12 px-4">
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-2xl font-bold font-serif mb-4">Upload and View Logs</h1>

                {error && (
                    <div className="bg-ink-820 border-l-[3px] border-signal-err text-paper-50 px-4 py-3 rounded-sm mb-4">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-ink-820 border-l-[3px] border-signal-ok text-paper-50 px-4 py-3 rounded-sm mb-4">
                        {success}
                    </div>
                )}

                <div className="mb-6">
                    <div className="p-4 border border-ink-700 rounded-lg bg-ink-820 shadow">
                        <h2 className="text-lg font-semibold font-serif mb-2">Upload Text Logs</h2>
                        <div className="border border-dashed border-ink-700 rounded-sm p-4 bg-ink-850">
                            <input
                                type="file"
                                multiple
                                accept=".txt"
                                onChange={handleFileSelect}
                                className="block w-full text-sm text-mute file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rust-500/10 file:text-rust-300 hover:file:bg-rust-500/20"
                                disabled={loading}
                            />
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-mute mb-2">Selected Files: {selectedFiles.length}</h3>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-ink-820 border border-ink-700 p-2 rounded">
                                            <span className="text-sm font-mono text-paper-100 truncate">{file.name}</span>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="text-signal-err hover:text-rust-400 text-sm ml-2"
                                                disabled={loading}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleUpload}
                                    disabled={loading}
                                    className="mt-4 bg-rust-500 text-[#fdf3ee] px-4 py-2 rounded hover:bg-rust-400 disabled:opacity-50 transition-colors"
                                >
                                    Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {loading && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-mute text-sm">Uploading…</span>
                            <span className="font-mono text-rust-300 text-sm ml-auto">{uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
                        </div>
                        <div className="h-1.5 bg-ink-740 rounded overflow-hidden">
                            <div className="h-full bg-rust-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                )}

                {currentLogs.length > 0 && (
                    <div className="bg-ink-820 border border-ink-700 rounded-lg shadow">
                        <div className="p-4 border-b border-ink-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold font-serif">Current Upload ({currentLogs.length} entries)</h3>
                            <button
                                onClick={toggleSort}
                                className="px-4 py-2 bg-rust-500 text-[#fdf3ee] rounded hover:bg-rust-400 flex items-center space-x-2"
                            >
                                <span>Sort {sortOrder === 'asc' ? '↑' : '↓'}</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-ink-850">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">
                                            Platform
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">
                                            Activity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-mono font-semibold text-mute uppercase tracking-wider border-b border-ink-700">
                                            Source
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentLogs.map((log, index) => (
                                        <tr key={index} className="border-b border-ink-700 hover:bg-ink-820">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-paper-100">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-paper-100">
                                                {log.platform}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-paper-100">
                                                {log.activity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-mute">
                                                {log.source}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserActivity;