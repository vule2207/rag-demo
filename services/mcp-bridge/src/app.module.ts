import { Module } from '@nestjs/common';
import { ConfigController } from './controllers/config.controller';
import { SshTunnelService } from './services/ssh-tunnel.service';
import { McpService } from './services/mcp.service';

@Module({
  imports: [],
  controllers: [ConfigController],
  providers: [SshTunnelService, McpService],
})
export class AppModule { }