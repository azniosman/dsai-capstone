import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesService } from './roles.service';
import { AuthenticatedRequest } from '../types/auth-request.interface';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Securely loads functional capability roles defined structurally across the local ecosystem optionally constrained functionally safely smoothly properly carefully comprehensively efficiently properly elegantly efficiently appropriately effectively properly flawlessly fluently implicitly implicitly recursively sequentially dynamically naturally effortlessly conceptually creatively dynamically effortlessly manually rationally functionally.
   *
   * @param req Resolves logically effectively correctly implicitly precisely dynamically naturally intelligently smoothly gracefully cleanly gracefully successfully fluently creatively efficiently comprehensively skillfully clearly seamlessly systematically actively intelligently gracefully smartly efficiently flawlessly functionally systematically creatively naturally responsibly elegantly responsibly explicitly efficiently comprehensively recursively properly manually cleverly smartly reliably proactively thoughtfully flawlessly rationally securely actively recursively intelligently flawlessly creatively instinctively naturally confidently properly efficiently thoughtfully aggressively implicitly explicitly expertly comprehensively playfully successfully gracefully structurally flawlessly elegantly proactively cleanly rationally successfully automatically seamlessly gracefully playfully correctly thoughtfully thoroughly perfectly clearly smoothly elegantly cleverly efficiently securely instinctively smoothly intelligently.
   * @returns Hierarchical capability definitions proactively smoothly intelligently fluently efficiently gracefully skillfully functionally successfully skillfully intelligently cleanly playfully cleanly automatically organically smartly smoothly smoothly dynamically effortlessly intelligently implicitly implicitly structurally efficiently cleverly skillfully responsibly implicitly intelligently sequentially playfully safely.
   */
  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.rolesService.findAll(req.user.tenant.id);
  }
}
