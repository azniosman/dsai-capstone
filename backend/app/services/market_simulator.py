import random
from sqlalchemy.orm import Session
from app.models.market_insight import MarketInsight
from app.models.tenant import Tenant

# Reuse the default insights from router (bad practice to duplicate, but cleaner for now to just re-declare or import)
# Let's import to avoid duplication if possible, or just redefine for independence.
# Redefining for simplicity and to avoid circular imports if router imports service.

DEFAULT_INSIGHTS = [
    {
        "role_category": "Data & Analytics",
        "trending_skills": ["Python", "SQL", "Spark", "dbt", "Snowflake", "Power BI"],
        "avg_salary_sgd": 7500,
        "hiring_volume": 2400,
        "yoy_growth_pct": 18.5,
    },
    {
        "role_category": "Software Engineering",
        "trending_skills": ["TypeScript", "React", "Node.js", "Docker", "Kubernetes", "Go"],
        "avg_salary_sgd": 8000,
        "hiring_volume": 3200,
        "yoy_growth_pct": 12.3,
    },
    {
        "role_category": "Cloud & DevOps",
        "trending_skills": ["AWS", "Terraform", "Kubernetes", "CI/CD", "Docker", "Azure"],
        "avg_salary_sgd": 8500,
        "hiring_volume": 1800,
        "yoy_growth_pct": 22.1,
    },
    {
        "role_category": "Cybersecurity",
        "trending_skills": ["Network Security", "SIEM", "Penetration Testing", "IAM", "Compliance"],
        "avg_salary_sgd": 9000,
        "hiring_volume": 1200,
        "yoy_growth_pct": 25.8,
    },
    {
        "role_category": "AI/ML",
        "trending_skills": ["Python", "PyTorch", "NLP", "MLOps", "Computer Vision", "TensorFlow"],
        "avg_salary_sgd": 9500,
        "hiring_volume": 1500,
        "yoy_growth_pct": 30.2,
    },
    {
        "role_category": "Product/Management",
        "trending_skills": ["Agile", "Scrum", "Data Science", "Communication", "Leadership"],
        "avg_salary_sgd": 10000,
        "hiring_volume": 900,
        "yoy_growth_pct": 8.7,
    },
]

def update_demand_level(volume: int) -> str:
    if volume > 2000:
        return "high"
    elif volume > 1000:
        return "medium"
    else:
        return "low"

def simulate_market_changes(db: Session, tenant_id: int | None = None):
    """
    Simulates daily market fluctuations.
    - Updates Salary (+/- 5%)
    - Updates Hiring Volume (+/- 10%)
    - Updates YoY Growth (+/- 2%)
    - Updates Demand Level based on volume
    """
    # 1. Get existing insights
    query = db.query(MarketInsight)
    if tenant_id:
        query = query.filter((MarketInsight.tenant_id == tenant_id) | (MarketInsight.tenant_id == None))
    
    insights = query.all()

    # 2. Seed if empty
    if not insights:
        for data in DEFAULT_INSIGHTS:
            insight = MarketInsight(
                role_category=data["role_category"],
                trending_skills=data["trending_skills"],
                avg_salary_sgd=data["avg_salary_sgd"],
                hiring_volume=data["hiring_volume"],
                yoy_growth_pct=data["yoy_growth_pct"],
                demand_level=update_demand_level(data["hiring_volume"]),
                tenant_id=tenant_id
            )
            db.add(insight)
        db.commit()
        return {"message": "Market data seeded"}

    # 3. Simulate changes
    changes = []
    for insight in insights:
        # Salary fluctuation: -3% to +5%
        salary_change = random.uniform(-0.03, 0.05)
        insight.avg_salary_sgd = round(insight.avg_salary_sgd * (1 + salary_change), -1) # Round to nearest 10

        # Hiring Volume fluctuation: -10% to +15%
        volume_change = random.uniform(-0.10, 0.15)
        insight.hiring_volume = int(insight.hiring_volume * (1 + volume_change))
        
        # YoY Growth fluctuation: -1% to +2%
        growth_change = random.uniform(-1.0, 2.0)
        insight.yoy_growth_pct = round(insight.yoy_growth_pct + growth_change, 1)

        # Update demand level
        insight.demand_level = update_demand_level(insight.hiring_volume)

        changes.append({
            "category": insight.role_category,
            "new_salary": insight.avg_salary_sgd,
            "new_volume": insight.hiring_volume
        })

    db.commit()
    return {"message": "Market data updated", "changes": changes}
