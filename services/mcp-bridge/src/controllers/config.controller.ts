import { Controller, Post, Body, InternalServerErrorException } from '@nestjs/common';
import { SshTunnelService, TunnelConfigDto } from '../services/ssh-tunnel.service';
import { McpService } from '../services/mcp.service';

// Extended DTO to include DB credentials coming from the UI
export interface CompleteSetupDto extends TunnelConfigDto {
    dbUser: string;
    dbPass: string;
    dbName: string;
    localPort: number;
    sshHost: string;
}

@Controller('config')
export class ConfigController {
    constructor(
        private readonly tunnelService: SshTunnelService,
        private readonly mcpService: McpService
    ) { }

    @Post('setup')
    async connectSystem(@Body() payload: CompleteSetupDto) {
        try {
            // 1. Establish the SSH tunnel mapping the remote DB to a local port
            await this.tunnelService.establishTunnel(payload);

            // 2. Initialize the Database connection pool in the MCP service
            this.mcpService.initializeSystemState(
                payload.dbUser,
                payload.dbPass,
                payload.dbName,
                payload.localPort,
                payload.sshHost
            );

            return {
                success: true,
                message: 'System fully connected. MCP is ready for IDE queries.'
            };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    @Post('disconnect')
    async disconnectSystem() {
        try {
            // 1. Close the SSH tunnel and release the local port
            this.tunnelService.closeTunnel();

            // 2. Clear the database pool and active host in MCP Service
            await this.mcpService.disconnectSystem();

            return {
                success: true,
                message: 'Disconnected successfully. You can now configure a new server.'
            };
        } catch (error) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }
}