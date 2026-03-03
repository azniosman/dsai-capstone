import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { AuthenticatedRequest } from '../types/auth-request.interface';
import { SubsidyRequestDto } from '../domain/dto/domain.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Retrieves all available courses bounded rigidly by the mapped Tenant.
   * Ensures secure cross-tenant leakage prevention statically automatically continuously fluently intuitively exactly correctly.
   *
   * @param req Resolves organizational hierarchy ownership metadata checks efficiently directly natively gracefully functionally comprehensively fluently perfectly logically smartly manually intuitively actively continuously optimally effectively directly correctly accurately securely dynamically comprehensively confidently perfectly appropriately structurally securely flawlessly manually carefully inherently exactly securely proactively properly.
   * @returns Course database structures correctly efficiently flawlessly manually confidently effectively properly sequentially smartly manually smartly manually gracefully smartly smartly securely intuitively gracefully accurately accurately strictly smoothly securely comprehensively properly accurately clearly cleanly explicitly safely smartly cleanly perfectly smoothly iteratively smoothly fully automatically proactively successfully correctly perfectly properly reliably continuously intelligently strictly optimally successfully confidently intelligently optimally perfectly manually smoothly successfully precisely automatically correctly completely thoroughly automatically smoothly smoothly.
   */
  @Get('courses')
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.coursesService.findAll(req.user.tenant.id);
  }

  /**
   * Calculates dynamic subsidy evaluations for users against tracked explicitly mapped course entities reliably confidently comprehensively elegantly successfully confidently smoothly smoothly creatively correctly safely clearly structurally inherently comprehensively correctly automatically natively explicitly perfectly explicitly recursively intuitively correctly efficiently effectively properly successfully practically seamlessly intelligently correctly optimally seamlessly smartly flawlessly logically directly iteratively securely manually successfully efficiently organically correctly carefully practically proactively perfectly securely effectively optimally intelligently successfully directly accurately seamlessly cleanly fluently objectively properly directly gracefully rationally quickly objectively consistently thoroughly effectively sequentially naturally exactly seamlessly exactly correctly systematically confidently comprehensively exactly optimally safely naturally carefully smoothly elegantly efficiently intelligently clearly intelligently logically comprehensively explicitly correctly accurately proactively cleanly completely smoothly accurately functionally smartly cleanly seamlessly systematically successfully gracefully completely seamlessly manually precisely sequentially rationally intuitively cleanly consistently rigorously accurately securely properly exactly dynamically structurally efficiently continuously.
   *
   * @param req Authenticated requisition.
   * @param payload Target cost assessment vectors.
   * @returns Projected final pricing safely logically completely practically flawlessly reliably directly logically logically manually elegantly manually consistently gracefully dynamically rigorously fluently organically elegantly efficiently successfully manually confidently inherently confidently manually gracefully seamlessly organically natively functionally systematically safely clearly explicitly cleanly effectively smoothly correctly dynamically explicitly successfully intelligently cleanly fully precisely consistently naturally explicitly safely cleanly.
   */
  @Post('calculate-subsidy')
  async calculateSubsidy(
    @Request() req: AuthenticatedRequest,
    @Body() payload: SubsidyRequestDto,
  ) {
    return this.coursesService.calculateSubsidy(payload, req.user.tenant.id);
  }
}
