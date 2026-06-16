import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventasService.create(createVentaDto);
  }

  @Get()
  findAll() {
    return this.ventasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id/cobrado')
  toggleCobrado(
    @Param('id', ParseIntPipe) id: number,
    @Body('cobrado') cobrado: boolean,
  ) {
    return this.ventasService.updateCobrado(id, cobrado);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.remove(id);
  }
}
