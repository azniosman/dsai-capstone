"""SkillsFuture Credit (SFC) and MCES subsidy calculator for SCTP courses."""

from app.models.sctp_course import SCTPCourse

# Standard SkillsFuture Credit applicable per person
SFC_AMOUNT = 500.0

# MCES (Mid-Career Enhanced Subsidy) raises subsidy to up to 90%
MCES_SUBSIDY_PERCENT = 90


def calculate_subsidies(
    course: SCTPCourse,
    is_career_switcher: bool = False,
) -> dict:
    """Calculate subsidies for a given SCTP course.

    Returns dict with:
      - course_fee: original fee
      - subsidy_percent: applied subsidy percentage
      - subsidy_amount: dollar amount subsidised
      - mces_applied: whether MCES enhancement was applied
      - sfc_applicable: SkillsFuture Credit offset amount
      - nett_payable: final out-of-pocket cost
    """
    fee = course.course_fee or 0.0
    base_subsidy_pct = course.subsidy_percent or 70

    # MCES enhancement for eligible courses (career switchers aged 40+)
    mces_applied = False
    if is_career_switcher and (course.mces_eligible or False):
        applied_pct = MCES_SUBSIDY_PERCENT
        mces_applied = True
    else:
        applied_pct = base_subsidy_pct

    subsidy_amount = round(fee * applied_pct / 100, 2)
    after_subsidy = round(fee - subsidy_amount, 2)

    # SFC offset (cannot reduce below zero)
    sfc = min(SFC_AMOUNT, after_subsidy)
    nett_payable = round(after_subsidy - sfc, 2)

    return {
        "course_fee": fee,
        "subsidy_percent": applied_pct,
        "subsidy_amount": subsidy_amount,
        "mces_applied": mces_applied,
        "sfc_applicable": sfc,
        "nett_payable": nett_payable,
    }
