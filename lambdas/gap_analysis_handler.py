"""Lambda handler — Bedrock structured gap analysis via direct invocation.

Accepts: {profile_id, target_role?}
Returns: {statusCode, body: GapAnalysisResponse JSON}

CMD override: lambdas.gap_analysis_handler.handler
"""

import json
import logging

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    try:
        profile_id = event.get("profile_id")
        if not profile_id:
            return {"statusCode": 400, "body": json.dumps({"error": "profile_id is required"})}

        target_role = event.get("target_role")

        from app.database import SessionLocal
        db = SessionLocal()
        try:
            # Re-use the router logic via service layer
            from app.routers.gap_analysis import analyze_gap
            from app.routers.gap_analysis import GapAnalysisRequest

            req = GapAnalysisRequest(profile_id=int(profile_id), target_role=target_role)
            result = analyze_gap(req, db=db)
            return {
                "statusCode": 200,
                "body": json.dumps(result.model_dump()),
            }
        finally:
            db.close()

    except Exception as e:
        logger.error("Gap analysis handler error: %s", e, exc_info=True)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
