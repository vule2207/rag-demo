import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Client } from 'ssh2';
import * as net from 'net';

// 1. Update DTO to strictly expect a password instead of a private key
export interface TunnelConfigDto {
    sshHost: string;
    sshPort: number;
    sshUser: string;
    sshPassword: string; // Enforced for CentOS password-based auth
    dbHost: string;
    dbPort: number;
    localPort: number;
}

@Injectable()
export class SshTunnelService {
    private readonly logger = new Logger(SshTunnelService.name);
    private activeTunnel: net.Server | null = null;
    private sshClient: Client | null = null;

    public async establishTunnel(config: TunnelConfigDto): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                this.closeTunnel();
                this.sshClient = new Client();

                this.sshClient.on('ready', () => {
                    this.activeTunnel = net.createServer((socket: any) => {
                        this.sshClient!.forwardOut(
                            '127.0.0.1',
                            socket.remotePort,
                            config.dbHost,
                            config.dbPort,
                            (err, stream) => {
                                if (err) {
                                    this.logger.error(`Port forwarding error: ${err.message}`);
                                    socket.end();
                                    return;
                                }
                                socket.pipe(stream).pipe(socket);
                            }
                        );
                    });

                    this.activeTunnel.listen(config.localPort, '127.0.0.1', () => {
                        resolve(`SSH Tunnel successfully established on local port ${config.localPort}`);
                    });
                });

                this.sshClient.on('error', (err) => {
                    this.logger.error(`SSH Connection Error: ${err.message}`);
                    reject(new InternalServerErrorException(`SSH failed: ${err.message}`));
                });

                // 2. Pass the user and password directly to the SSH Client configuration
                this.sshClient.connect({
                    host: config.sshHost,
                    port: config.sshPort,
                    username: config.sshUser,
                    password: config.sshPassword, // Use password directly
                });

            } catch (error) {
                this.logger.error(`Failed to setup tunnel: ${error.message}`);
                reject(new InternalServerErrorException('Critical error during tunnel setup.'));
            }
        });
    }

    /**
   * Executes a safe, pre-built shell command on the remote CentOS server.
   * @param command The exact shell command string to execute.
   * @returns A promise that resolves with the stdout string.
   */
    public async executeRemoteCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.sshClient) {
                return reject(new Error('SSH Client is not connected.'));
            }

            this.sshClient.exec(command, (err, stream) => {
                if (err) return reject(err);

                let outputData = '';
                let errorData = '';

                // Capture standard output (stdout)
                stream.on('data', (data: Buffer) => {
                    outputData += data.toString();
                });

                // Capture standard error (stderr)
                stream.stderr.on('data', (data: Buffer) => {
                    errorData += data.toString();
                });

                stream.on('close', (code: number) => {
                    // Some commands like grep return code 1 if no matches are found, 
                    // which is normal, not a system error.
                    if (code !== 0 && errorData.trim() !== '') {
                        // Log for backend debugging, but return friendly message
                        this.logger.warn(`Remote Command executed with code ${code}. Stderr: ${errorData}`);
                    }
                    resolve(outputData || 'No results found matching your criteria.');
                });
            });
        });
    }

    /**
     * Gracefully terminates the SSH tunnel and client connections.
     */
    public closeTunnel(): void {
        try {
            if (this.activeTunnel) {
                this.activeTunnel.close();
                this.activeTunnel = null;
            }
            if (this.sshClient) {
                this.sshClient.end();
                this.sshClient = null;
            }
        } catch (error) {
            this.logger.error(`Error while closing tunnel: ${error.message}`);
        }
    }
}