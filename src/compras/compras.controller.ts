import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';

@UseGuards(JwtAuthGuard)
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  create(@Body() createCompraDto: CreateCompraDto) {
    return this.comprasService.create(createCompraDto);
  }

  @Get()
  findAll() {
    return this.comprasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.comprasService.findOne(id);
  }
}
