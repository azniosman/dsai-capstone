from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, func, ForeignKey
from app.database import Base


class MarketInsight(Base):
    __tablename__ = "market_insights"

    id = Column(Integer, primary_key=True, index=True)
    role_category = Column(String, nullable=False, index=True)
    trending_skills = Column(JSON, default=list)
    avg_salary_sgd = Column(Float)
    demand_level = Column(String)  # "high", "medium", "low"
    hiring_volume = Column(Integer)
    yoy_growth_pct = Column(Float)
    forecast_2026 = Column(String, nullable=True)  # "High Growth", "Stable", etc.
    outlook = Column(String, nullable=True)  # Brief text description of future trends
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
