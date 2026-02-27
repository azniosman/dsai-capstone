import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { SCTPCourse } from '@app/entities/sctp-course.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(SCTPCourse)
    private readonly courseRepository: EntityRepository<SCTPCourse>,
  ) {}

  async findAll(tenantId: number): Promise<SCTPCourse[]> {
    return this.courseRepository.find({ tenant: tenantId });
  }

  async calculateSubsidy(payload: any, tenantId: number) {
    const course = await this.courseRepository.findOne({ id: payload.course_id, tenant: tenantId });
    if (!course) throw new NotFoundException('Course not found');
    
    const courseFee = course.courseFee;
    const subsidyPct = 0.7;
    const subsidyAmount = courseFee * subsidyPct;
    const nettPayable = courseFee - subsidyAmount;

    return {
      course_fee: courseFee,
      subsidy_amount: subsidyAmount,
      subsidy_pct: subsidyPct * 100,
      skillsfuture_credit: 500,
      nett_payable: Math.max(0, nettPayable - 500),
      mces_eligible: true,
    };
  }
}
