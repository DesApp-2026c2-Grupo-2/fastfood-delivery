import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdateLoyaltyCampaignDto } from './dto/update-loyalty-campaign.dto';
import { UpdateTop3CampaignDto } from './dto/update-top3-campaign.dto';
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

  @Patch('top3-campaign')
  updateTopBuyerCampaign(@Body() dto: UpdateTop3CampaignDto) {
    return this.promotionsService.updateTopBuyerCampaign(dto);
  }

  @Get('loyalty-campaign')
  getLoyaltyCampaign() {
    return this.promotionsService.getLoyaltyCampaign();
  }

  @Post('loyalty-campaign/start')
  startLoyaltyCampaign() {
    return this.promotionsService.startLoyaltyCampaign();
  }

  @Post('loyalty-campaign/finish')
  finishLoyaltyCampaign() {
    return this.promotionsService.finishLoyaltyCampaign();
  }

  @Patch('loyalty-campaign')
  updateLoyaltyCampaign(@Body() dto: UpdateLoyaltyCampaignDto) {
    return this.promotionsService.updateLoyaltyCampaign(dto);
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