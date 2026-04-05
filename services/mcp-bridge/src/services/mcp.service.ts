import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as mysql from 'mysql2/promise';
import { SshTunnelService } from './ssh-tunnel.service';

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
    private server: Server;
    private readonly logger = new Logger(McpService.name);
    private dbPool: mysql.Pool | null = null;
    private currentHost: string = '';

    constructor(private readonly sshTunnelService: SshTunnelService) {
        this.server = new Server(
            { name: 'NestJsMcpServer', version: '1.0.0' },
            { capabilities: { tools: {} } }
        );
    }

    public initializeSystemState(dbUser: string, dbPass: string, dbName: string, localPort: number, sshHost: string) {
        try {
            this.currentHost = sshHost;
            this.dbPool = mysql.createPool({
                host: '127.0.0.1',
                port: localPort,
                user: dbUser,
                password: dbPass,
                database: dbName,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
            });
            process.stderr.write(`✅ System configured for host: ${this.currentHost}\n`);
        } catch (error) {
            this.logger.error(`Initialization failed: ${(error as Error).message}`);
        }
    }

    async onModuleInit() {
        this.setupMcpHandlers();
        await this.startStdioTransport();
    }

    async onModuleDestroy() {
        await this.server.close();
        if (this.dbPool) {
            await this.dbPool.end();
        }
    }

    private setupMcpHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'execute_read_query',
                        description: 'Executes a safe SELECT query on the production database.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                sqlQuery: { type: 'string', description: 'The SELECT SQL statement.' },
                            },
                            required: ['sqlQuery'],
                        },
                    },
                    {
                        name: 'get_database_schema',
                        description: 'Get the list of all tables and columns in the database. CALL THIS TOOL FIRST if you are not sure about the table or column names when writing SQL.',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'search_api_logs',
                        description: 'Fetch and search multi-line API logs organized by date. Requires specific log type and exact date.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                logType: {
                                    type: 'string',
                                    enum: ['get', 'post', 'put', 'delete', 'response'],
                                    description: 'The specific log file category to read.'
                                },
                                date: {
                                    type: 'string',
                                    description: 'The exact date of the log file in YYYYMMDD format (e.g., 20260331).'
                                },
                                keywords: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Optional. Array of exact keywords to match within the SAME log block.'
                                },
                                tailLines: {
                                    type: 'number',
                                    description: 'Optional. Number of raw lines to fetch from the end of the file. Default is 2000.'
                                }
                            },
                            required: ['logType', 'date'],
                        },
                    }
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            return this.executeToolInternally(request.params.name, request.params.arguments);
        });
    }

    public async executeToolInternally(name: string, args: any): Promise<any> {
        this.logger.log(`Executing tool: ${name}`);
        if (name === 'execute_read_query') {
            return this.handleExecuteReadQuery(args?.sqlQuery);
        }
        if (name === 'get_database_schema') {
            return this.handleGetDatabaseSchema();
        }
        if (name === 'search_api_logs') {
            return this.handleSearchApiLogs(args);
        }
        throw new Error(`Tool ${name} is not recognized.`);
    }

    private async handleExecuteReadQuery(sqlQuery: string) {
        if (!sqlQuery || !sqlQuery.trim().toLowerCase().startsWith('select')) {
            return {
                content: [{ type: 'text', text: 'Security Violation: Only SELECT queries are permitted.' }],
                isError: true,
            };
        }
        if (!this.dbPool) {
            return {
                content: [{ type: 'text', text: 'Database is not connected. Please configure via UI first.' }],
                isError: true,
            };
        }
        try {
            const [rows] = await this.dbPool.query(sqlQuery);
            return {
                content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `SQL Execution Error: ${(error as Error).message}` }],
                isError: true,
            };
        }
    }

    private async handleGetDatabaseSchema() {
        if (!this.dbPool) {
            return {
                content: [{ type: 'text', text: 'Database is not connected. Please configure via UI first.' }],
                isError: true,
            };
        }
        try {
            const sqlQuery = `
                SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
                FROM information_schema.columns 
                WHERE table_schema = DATABASE()
            `;
            const [rows] = await this.dbPool.query(sqlQuery);
            return {
                content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error reading Schema: ${(error as Error).message}` }],
                isError: true,
            };
        }
    }

    private async handleSearchApiLogs(args: any) {
        const { logType, date, keywords, tailLines } = args;
        if (!this.currentHost) {
            return {
                content: [{ type: 'text', text: 'System Error: Host is not configured via Web UI.' }],
                isError: true,
            };
        }
        try {
            const allowedTypes = ['get', 'post', 'put', 'delete', 'response'];
            if (!allowedTypes.includes(String(logType).toLowerCase())) {
                throw new Error(`Security Violation: Log type '${logType}' is not allowed.`);
            }
            const isValidDate = /^\d{8}$/.test(String(date));
            if (!isValidDate) {
                throw new Error(`Security Violation: Invalid date format. Must be YYYYMMDD.`);
            }
            let absolutePath = '';
            if (String(logType).toLowerCase() === 'response') {
                absolutePath = `/home/HanbiroMailcore/GWDATA/${this.currentHost}/logs/${logType}/response_${date}.log`;
            } else {
                absolutePath = `/home/HanbiroMailcore/GWDATA/${this.currentHost}/logs/${logType}/${date}.log`;
            }
            const linesToFetch = Math.min(Number(tailLines) || 2000, 5000);
            let shellCommand = `tail -n ${linesToFetch} ${absolutePath}`;
            if (keywords && Array.isArray(keywords) && keywords.length > 0) {
                const sanitizedKeywords = keywords.map(kw => String(kw).replace(/[^a-zA-Z0-9_ \-\.\/]/g, '')).filter(kw => kw.trim() !== '');
                if (sanitizedKeywords.length > 0) {
                    const awkConditions = sanitizedKeywords.map(kw => `record ~ /${kw.replace(/\//g, '\\/')}/`).join(' && ');
                    const awkScript = `BEGIN { record = "" } /^Array/ { if (record != "" && ${awkConditions}) { print record; print "---"; } record = $0; next; } { record = record "\\n" $0 } END { if (record != "" && ${awkConditions}) { print record; print "---"; } }`;
                    shellCommand += ` | awk '${awkScript.replace(/\n/g, ' ').replace(/\s+/g, ' ')}'`;
                }
            }
            const logContent = await this.sshTunnelService.executeRemoteCommand(shellCommand);
            return {
                content: [{ type: 'text', text: logContent || 'No matches found.' }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Log Retrieval Failed: ${(error as Error).message}` }],
                isError: true,
            };
        }
    }

    private async startStdioTransport() {
        try {
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            process.stderr.write('🚀 MCP Stdio Transport is listening...\n');
        } catch (error) {
            this.logger.error(`Failed to start MCP Transport: ${error.message}`);
        }
    }

    public async disconnectSystem() {
        try {
            this.currentHost = '';
            if (this.dbPool) {
                await this.dbPool.end();
                this.dbPool = null;
            }
            process.stderr.write('🛑 System disconnected successfully.\n');
        } catch (error) {
            this.logger.error(`Error during disconnect: ${(error as Error).message}`);
        }
    }
}