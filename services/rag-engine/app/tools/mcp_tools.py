import os
import requests
from typing import Any, List, Optional
from langchain_core.tools import tool

MCP_URL = os.getenv("MCP_URL", "http://mcp-bridge:3000/api/mcp/execute")

def get_mcp_tools(retriever: Optional[Any] = None):
    """
    Factory function to create a list of tools for the LangChain agent.
    Using a factory function instead of a class avoids the 'self' validation error
    in LangChain's @tool decorator.
    """

    @tool
    def search_knowledge_base(query: str) -> str:
        """
        Search internal knowledge for procedures, company info, or document-specific details.
        """
        if not retriever:
            return "Knowledge base is empty. Upload documents first."
        
        docs = retriever.get_relevant_documents(query)
        if not docs:
            return "No relevant information found."
        
        # Limit the amount of text returned to avoid hitting model limits
        full_text = "\n\n---\n\n".join([d.page_content for d in docs])
        max_chars = 40000 
        if len(full_text) > max_chars:
            return full_text[:max_chars] + "\n\n[... Truncated for token limit ...]"
        return full_text

    @tool
    def query_database(sql_query: str) -> str:
        """
        Executes a safe SELECT SQL query on the production database. 
        Use this for structured business data, employee records, or current status. 
        DO NOT use this for raw activity logs or event history.
        """
        payload = {"name": "execute_read_query", "arguments": {"sqlQuery": sql_query}}
        try:
            response = requests.post(MCP_URL, json=payload, timeout=30)
            result = response.json()
            content = result['content'][0]['text'] if 'content' in result else 'MCP Error: No content found'
            
            # Truncate database outputs if they are huge
            max_chars = 30000
            if len(content) > max_chars:
                return content[:max_chars] + "\n\n[... Database result truncated ...]"
            return content
        except Exception as e:
            return f"MCP Connectivity Error: {str(e)}"

    @tool
    def get_database_schema() -> str:
        """
        Fetch database schema for all tables and columns. CALL THIS if unsure of names.
        """
        payload = {"name": "get_database_schema", "arguments": {}}
        try:
            response = requests.post(MCP_URL, json=payload, timeout=30)
            result = response.json()
            content = result['content'][0]['text'] if 'content' in result else 'MCP Error: No content found'
            
            # Schemas can be huge, but truncated ones might be useless for the AI. 
            # We'll allow up to 40k chars.
            if len(content) > 40000:
                return content[:40000] + "\n\n[... Schema truncated ...]"
            return content
        except Exception as e:
            return f"MCP Connectivity Error: {str(e)}"

    @tool
    def search_api_logs(log_type: str, date: str, keywords: List[str] = [], tail_lines: int = 1000) -> str:
        """
        Search system logs. log_type: 'get', 'post', 'put', 'delete', or 'response'. date: YYYYMMDD.
        """
        payload = {
            "name": "search_api_logs", 
            "arguments": {"logType": log_type, "date": date, "keywords": keywords, "tailLines": tail_lines}
        }
        try:
            response = requests.post(MCP_URL, json=payload, timeout=60)
            result = response.json()
            content = result['content'][0]['text'] if 'content' in result else 'MCP Error: No content found'
            
            # Logs are the biggest culprit for token overflow
            max_chars = 50000
            if len(content) > max_chars:
                return content[:max_chars] + "\n\n[... Log content truncated ...]"
            return content
        except Exception as e:
            return f"MCP Connectivity Error: {str(e)}"

    return [
        search_knowledge_base,
        query_database,
        get_database_schema,
        search_api_logs
    ]
