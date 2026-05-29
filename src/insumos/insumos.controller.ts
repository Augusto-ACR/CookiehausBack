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
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { InsumosService } from './insumos.service';

@UseGuards(JwtAuthGuard)
@Controller('insumos')
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Post()
  create(@Body() createInsumoDto: CreateInsumoDto) {
    return this.insumosService.create(createInsumoDto);
  }

  @Get()
  findAll() {
    return this.insumosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.insumosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInsumoDto: UpdateInsumoDto,
  ) {
    return this.insumosService.update(id, updateInsumoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.insumosService.remove(id);
  }
}
