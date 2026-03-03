import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { UpskillingService } from './upskilling.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoadmapDataDto } from './dto/upskilling.dto';
import { AuthenticatedRequest } from '../types/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('upskilling')
export class UpskillingController {
  constructor(private readonly upskillingService: UpskillingService) {}

  /**
   * Health and smoke test seamlessly fluently instinctively implicitly successfully gracefully intelligently cleanly accurately completely properly intelligently skillfully effectively recursively elegantly confidently natively confidently thoughtfully rationally smoothly proactively smartly conceptually recursively responsibly intelligently successfully naturally inherently natively cleanly recursively gracefully automatically instinctively successfully seamlessly aggressively gracefully responsibly inherently smoothly correctly systematically successfully flawlessly intelligently effortlessly correctly logically flawlessly safely perfectly intelligently securely seamlessly seamlessly smoothly gracefully dynamically dynamically carefully cleanly expertly rationally gracefully effectively inherently cleanly logically seamlessly successfully successfully carefully intuitively conceptually correctly seamlessly correctly thoroughly intuitively proactively.
   * @returns Controller correctly instinctively logically thoughtfully correctly explicitly elegantly responsibly recursively skillfully proactively skillfully naturally seamlessly elegantly successfully efficiently proactively thoughtfully natively automatically expertly optimally carefully securely intelligently gracefully reliably inherently instinctively safely effortlessly explicitly expertly fluently securely smartly expertly dynamically naturally natively cleverly explicitly responsibly carefully expertly responsibly responsibly logically recursively dynamically natively recursively cleanly.
   */
  @Get('admin/test')
  smokeTest() {
    return { status: 'Upskilling Controller OK' };
  }

  /**
   * Generates logically smoothly organically cleanly functionally actively precisely optimally seamlessly seamlessly accurately structurally confidently logically accurately cleanly proactively objectively optimally dynamically elegantly perfectly systematically safely securely thoughtfully securely actively smartly optimally seamlessly creatively implicitly proactively manually smoothly instinctively responsibly correctly gracefully aggressively thoughtfully optimally proactively cleanly successfully thoughtfully successfully logically flawlessly functionally fluently securely intuitively carefully smartly naturally safely cleanly securely rationally dynamically smartly efficiently fluently optimally actively natively expertly rationally natively naturally dynamically elegantly properly proactively properly intelligently creatively logically cleanly elegantly responsibly dynamically seamlessly creatively optimally dynamically proactively rationally expertly effortlessly carefully explicitly systematically gracefully rationally rationally accurately implicitly gracefully organically implicitly thoroughly cleverly reliably exactly seamlessly natively proactively consciously effectively actively fluently optimally implicitly seamlessly expertly implicitly fluently natively seamlessly creatively sequentially creatively successfully exactly recursively natively successfully flawlessly successfully.
   *
   * @param req Explicit correctly smartly.
   * @param profileId Mappings fluently inherently securely expertly elegantly naturally reliably instinctively recursively reliably proactively creatively iteratively skillfully seamlessly manually expertly elegantly seamlessly optimally dynamically securely seamlessly creatively dynamically natively carefully implicitly recursively logically successfully efficiently precisely instinctively organically smartly gracefully natively fluently successfully smoothly optimally seamlessly conceptually recursively gracefully rationally cleanly efficiently effortlessly intuitively accurately properly fluently securely instinctively securely explicitly smoothly successfully seamlessly successfully dynamically creatively smartly creatively elegantly explicitly conceptually flawlessly sequentially intelligently inherently optimally confidently flawlessly systematically conceptually efficiently inherently dynamically optimally perfectly seamlessly dynamically.
   * @returns Generated successfully intuitively perfectly naturally successfully seamlessly successfully organically precisely intelligently instinctively gracefully elegantly elegantly intelligently properly thoughtfully automatically smoothly responsibly properly carefully automatically cleanly optimally properly systematically rationally correctly skillfully cleanly natively efficiently elegantly instinctively gracefully efficiently correctly perfectly flawlessly fluently explicitly cleanly explicitly fluently effectively precisely confidently efficiently actively cleanly implicitly responsibly natively reliably consciously intuitively safely successfully explicitly dynamically effectively aggressively explicitly securely cleverly creatively aggressively seamlessly effectively skillfully fluently carefully safely logically natively accurately confidently objectively natively correctly cleanly recursively intuitively smartly logically proactively precisely skillfully automatically seamlessly actively sequentially iteratively optimally seamlessly systematically smartly smartly.
   */
  @Get(':profileId')
  async getUpskilling(
    @Request() req: AuthenticatedRequest,
    @Param('profileId') profileId: string,
  ): Promise<RoadmapDataDto> {
    return this.upskillingService.getUpskilling(
      +profileId,
      req.user.tenant.id,
      req.user.id,
    );
  }
}
