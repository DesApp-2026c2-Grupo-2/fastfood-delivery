import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsService } from './promotions.service';

@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('top3-campaign')
  getTopBuyerCampaign() {
    return this.promotionsService.getTopBuyerCampaign();
  }

  @Post('top3-campaign/start')
  startTopBuyerCampaign() {
    return this.promotionsService.startTopBuyerCampaign();
  }

  @Post('top3-campaign/award')
  awardTopBuyerCampaign() {
    return this.promotionsService.awardTopBuyerCampaign();
  }

  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}