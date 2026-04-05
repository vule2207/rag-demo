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
        
        return "\n\n---\n\n".join([d.page_content for d in docs])

    @tool
    def query_database(sql_query: str) -> str:
        """
        Executes a safe SELECT SQL query on the production database.
        """
        payload = {"name": "execute_read_query", "arguments": {"sqlQuery": sql_query}}
        try:
            response = requests.post(MCP_URL, json=payload, timeout=30)
            result = response.json()
            return result['content'][0]['text'] if not result.get("isError") else result['content'][0]['text']
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
            return result['content'][0]['text'] if not result.get("isError") else result['content'][0]['text']
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
            return result['content'][0]['text'] if not result.get("isError") else result['content'][0]['text']
        except Exception as e:
            return f"MCP Connectivity Error: {str(e)}"

    return [
        search_knowledge_base,
        query_database,
        get_database_schema,
        search_api_logs
    ]
