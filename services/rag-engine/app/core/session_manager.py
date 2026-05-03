import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any

class SessionManager:
    def __init__(self, base_path: str = "./storage/sessions"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    def _get_session_path(self, session_id: str) -> str:
        return os.path.join(self.base_path, session_id)

    def create_session(self, title: str = "New Chat") -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        session_path = self._get_session_path(session_id)
        os.makedirs(session_path, exist_ok=True)

        metadata = {
            "id": session_id,
            "title": title,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        with open(os.path.join(session_path, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)

        with open(os.path.join(session_path, "messages.json"), "w") as f:
            json.dump([], f)

        return metadata

    def add_message(self, session_id: str, role: str, content: str, steps: Optional[List[Dict]] = None):
        session_path = self._get_session_path(session_id)
        if not os.path.exists(session_path):
            self.create_session() # Fallback or error

        messages_path = os.path.join(session_path, "messages.json")
        messages = []
        if os.path.exists(messages_path):
            with open(messages_path, "r") as f:
                messages = json.load(f)

        new_message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "steps": steps or []
        }
        messages.append(new_message)

        with open(messages_path, "w") as f:
            json.dump(messages, f, indent=2)

        # Update metadata timestamp
        metadata_path = os.path.join(session_path, "metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
            
            # Auto-update title if it's the first message
            if metadata.get("title") == "New Chat" and role == "user":
                metadata["title"] = content[:30] + "..." if len(content) > 30 else content
                
            metadata["updated_at"] = datetime.now().isoformat()
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)

    def get_messages(self, session_id: str) -> List[Dict]:
        messages_path = os.path.join(self._get_session_path(session_id), "messages.json")
        if not os.path.exists(messages_path):
            return []
        
        with open(messages_path, "r") as f:
            return json.load(f)

    def list_sessions(self) -> List[Dict]:
        sessions = []
        if not os.path.exists(self.base_path):
            return []

        for session_id in os.listdir(self.base_path):
            metadata_path = os.path.join(self.base_path, session_id, "metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, "r") as f:
                    sessions.append(json.load(f))
        
        # Sort by updated_at descending
        sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return sessions

    def delete_session(self, session_id: str):
        session_path = self._get_session_path(session_id)
        if os.path.exists(session_path):
            import shutil
            shutil.rmtree(session_path)
