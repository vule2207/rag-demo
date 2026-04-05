# Hanbiro MCP Server

A specialized [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server built with [NestJS](https://nestjs.com). This server provides interactive tools for AI assistants (like Claude Desktop or this IDE) to securely explore and query Hanbiro's production databases and logs via SSH segments.

## 🚀 Overview

The **Hanbiro MCP Server** acts as a secure bridge between your AI development tools and remote infrastructure. It leverages SSH tunneling to provide real-time access to database schemas, execute read-only queries, and search complex multi-line API logs without exposing sensitive ports directly to the internet.

## ✨ Key Features

-   **Secure Database Exploration**: 
    -   `execute_read_query`: Runs strictly `SELECT` SQL statements on production databases.
    -   `get_database_schema`: Provides detailed table and column metadata for schema discovery.
-   **Advanced Log Searching**:
    -   `search_api_logs`: Tail and search multi-line Hanbiro API logs (GET, POST, PUT, DELETE, RESPONSE) using dynamic AWK parsing logic.
-   **SSH-First Connectivity**: Uses reliable SSH tunnels (`ssh2`) to wrap all database and log communication.
-   **Built-in Configuration UI**: A secondary React-based web interface at `http://localhost:3000` for managing connection credentials and monitoring status.

## 🛠 Project Setup

Ensure you have Node.js and npm installed before proceeding.

### Installation

```bash
$ npm install
```

### Running the Server

The server runs on two levels: as an MCP Stdout transport and as a Configuration Web API.

```bash
# 1. Start in development mode (with watch mode)
$ npm run start:dev

# 2. Production mode
$ npm run start:prod
```

### Configuration UI

Once the server is running, navigate to:
**[http://localhost:3000](http://localhost:3000)**

Use this UI to input your database credentials and SSH tunnel details. These settings are then used dynamically by the MCP tools.

## 🤖 MCP Tools

The server exposes the following tools to MCP-compatible clients:

### 1. `execute_read_query`
Executes a safe `SELECT` query on the production database.
-   **Arguments**: `sqlQuery` (string)
-   *Restriction*: Only `SELECT` statements are permitted for security.

### 2. `get_database_schema`
Retrieves a complete list of all tables and columns in the active database. Useful for initial context gathering before writing queries.

### 3. `search_api_logs`
Search multi-line API logs organized by date.
-   **Arguments**: 
    -   `logType`: ('get' | 'post' | 'put' | 'delete' | 'response')
    -   `date`: YYYYMMDD format (e.g., 20260331)
    -   `keywords`: (Optional) Array of keywords to match within the same log block.
    -   `tailLines`: (Optional) Number of lines to fetch from the end.

## 🛡 Security

-   **Read-Only Database Access**: The database tool strictly prevents any modification queries (INSERT, UPDATE, DELETE).
-   **Input Sanitization**: Log search keywords and parameters are sanitized to prevent shell injection.
-   **SSH Tunneling**: Transparently manages secure connections to remote hosts without requiring global VPNs.

## 📦 Deployment

The project includes a `Dockerfile` for easy containerization. Ensure your environment variables for the SSH key and DB paths are correctly mapped if deploying via Docker.

## 📄 License

This project is [MIT licensed](LICENSE).
