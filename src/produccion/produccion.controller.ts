import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProduccionService } from './produccion.service';
import { CreateProduccionDto } from './dto/create-produccion.dto';

@UseGuards(JwtAuthGuard)
@Controller('produccion')
export class ProduccionController {
  constructor(private readonly produccionService: ProduccionService) {}

  @Post()
  create(@Body() createProduccionDto: CreateProduccionDto): Promise<unknown> {
    return this.produccionService.create(createProduccionDto);
  }

  @Get()
  findAll() {
    return this.produccionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.produccionService.findOne(id);
  }

  // Igual que eliminar una compra: el front pide la contraseña (verify-password) antes.
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.produccionService.remove(id);
  }
}
