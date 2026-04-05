import { useState, useEffect } from 'react';
import { ragService } from '../services/api';

export const useKnowledgeBase = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState<string[]>([]);

    const fetchDocuments = async () => {
        try {
            const data = await ragService.listDocuments();
            setDocuments(data.documents);
        } catch (error) {
            console.error("Failed to fetch docs", error);
        }
    };

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        try {
            await ragService.upload(file);
            setDocuments(prev => [...prev, file.name]);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (filename: string) => {
        try {
            await ragService.deleteDocument(filename);
            setDocuments(prev => prev.filter(f => f !== filename));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    return {
        documents,
        isUploading,
        handleUpload,
        handleDelete,
        fetchDocuments
    };
};
