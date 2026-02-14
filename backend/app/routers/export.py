"""Export roadmap as PDF."""

import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_tenant, get_current_user
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(tags=["export"])


@router.get("/export/roadmap/{profile_id}")
def export_roadmap_pdf(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    from app.models.user_profile import UserProfile
    from app.services.roadmap_generator import generate_roadmap
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    roadmap = generate_roadmap(profile, db, tenant_id=tenant.id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(f"Upskilling Roadmap for {profile.name}", styles["Title"]))
    elements.append(Spacer(1, 10*mm))

    if not roadmap:
        elements.append(Paragraph("No upskilling items identified. Your skills are well-matched!", styles["Normal"]))
    else:
        # Summary
        total_weeks = roadmap[-1].week_end if roadmap else 0
        elements.append(Paragraph(
            f"Total estimated timeline: {total_weeks} weeks ({(total_weeks + 3) // 4} months)",
            styles["Normal"],
        ))
        elements.append(Spacer(1, 5*mm))

        # Table
        data = [["Week", "Skill Gap", "Course", "Provider", "Duration", "Level"]]
        for item in roadmap:
            week_range = f"{item.week_start}-{item.week_end}" if item.week_start != item.week_end else str(item.week_start)
            data.append([
                week_range,
                item.skill,
                item.course_title,
                item.provider,
                f"{item.duration_weeks}w",
                item.level,
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1976d2")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 10*mm))

        # Certifications section
        certs = [item for item in roadmap if item.certification]
        if certs:
            elements.append(Paragraph("Certifications to Earn:", styles["Heading2"]))
            for item in certs:
                elements.append(Paragraph(f"• {item.certification} ({item.provider})", styles["Normal"]))

    doc.build(elements)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=roadmap_{profile_id}.pdf"},
    )
