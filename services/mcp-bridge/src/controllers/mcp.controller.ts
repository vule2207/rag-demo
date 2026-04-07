import { Controller, Get, Post, Body, InternalServerErrorException } from '@nestjs/common';
import { McpService } from '../services/mcp.service';

@Controller('mcp')
export class McpController {
    constructor(private readonly mcpService: McpService) {}

    @Get('tools')
    async getTools() {
        return this.mcpService.getTools();
    }

    @Post('execute')
    async executeTool(@Body() payload: { name: string; arguments: any }) {
        try {
            const result = await this.mcpService.executeToolInternally(payload.name, payload.arguments);
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }
}
