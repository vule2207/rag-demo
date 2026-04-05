export const ragService = {
  async chat(message: string) {
    const response = await fetch('/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error('RAG Chat failed');
    return response.json();
  },

  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/rag/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  async listDocuments() {
    const response = await fetch('/api/rag/documents');
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },

  async deleteDocument(filename: string) {
    const response = await fetch(`/api/rag/documents/${filename}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Delete failed');
    return response.json();
  }
};

export const mcpService = {
  async connect(config: any) {
    const response = await fetch('/api/config/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Connection failed');
    return response.json();
  },

  async disconnect() {
    const response = await fetch('/api/config/disconnect', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Disconnect failed');
    return response.json();
  }
};
