import { Controller, Get } from '@nestjs/common';

@Controller('assets')
export class AssetController {
    @Get()
    findAll() {
        return { message: 'AssetController is working!' };
    }
} 