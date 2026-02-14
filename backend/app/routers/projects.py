"""Portfolio project suggestions for missing skills."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_tenant, get_current_user
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(tags=["projects"])


class ProjectSuggestion(BaseModel):
    skill: str
    title: str
    description: str
    difficulty: str  # "beginner", "intermediate", "advanced"
    estimated_hours: int
    technologies: list[str]
    learning_outcomes: list[str]


class ProjectSuggestionsResponse(BaseModel):
    profile_id: int
    suggestions: list[ProjectSuggestion]


# Curated project suggestions mapped to skills
PROJECT_CATALOG = {
    "python": ProjectSuggestion(
        skill="Python",
        title="Build a CLI Data Pipeline Tool",
        description="Create a command-line tool that extracts data from CSV/JSON, transforms it, and loads into a SQLite database. Add logging and error handling.",
        difficulty="beginner",
        estimated_hours=15,
        technologies=["Python", "SQLite", "argparse", "pandas"],
        learning_outcomes=["File I/O", "Data transformation", "CLI design", "Error handling"],
    ),
    "sql": ProjectSuggestion(
        skill="SQL",
        title="E-commerce Analytics Dashboard Database",
        description="Design a normalized database schema for an e-commerce platform. Write complex queries for sales analytics, customer segmentation, and inventory management.",
        difficulty="intermediate",
        estimated_hours=20,
        technologies=["PostgreSQL", "SQL", "pgAdmin"],
        learning_outcomes=["Schema design", "Complex JOINs", "Window functions", "Query optimization"],
    ),
    "react": ProjectSuggestion(
        skill="React",
        title="Real-time Task Management App",
        description="Build a Trello-like kanban board with drag-and-drop, real-time updates, and user authentication using React and a REST API.",
        difficulty="intermediate",
        estimated_hours=30,
        technologies=["React", "MUI", "React DnD", "REST API"],
        learning_outcomes=["Component architecture", "State management", "API integration", "Responsive design"],
    ),
    "docker": ProjectSuggestion(
        skill="Docker",
        title="Containerize a Multi-Service Application",
        description="Take an existing web app and containerize it with Docker Compose — web server, API, database, and Redis cache. Add health checks and volumes.",
        difficulty="intermediate",
        estimated_hours=12,
        technologies=["Docker", "Docker Compose", "nginx", "PostgreSQL"],
        learning_outcomes=["Dockerfile best practices", "Multi-stage builds", "Networking", "Volume management"],
    ),
    "aws": ProjectSuggestion(
        skill="AWS",
        title="Serverless API with AWS Lambda",
        description="Build a serverless REST API using AWS Lambda, API Gateway, and DynamoDB. Add CI/CD with GitHub Actions deploying via SAM.",
        difficulty="intermediate",
        estimated_hours=20,
        technologies=["AWS Lambda", "API Gateway", "DynamoDB", "SAM", "GitHub Actions"],
        learning_outcomes=["Serverless architecture", "IAM policies", "CloudWatch monitoring", "CI/CD"],
    ),
    "kubernetes": ProjectSuggestion(
        skill="Kubernetes",
        title="Deploy a Microservices App on K8s",
        description="Deploy a multi-container application on Kubernetes with deployments, services, ingress, and ConfigMaps. Use Minikube for local development.",
        difficulty="advanced",
        estimated_hours=25,
        technologies=["Kubernetes", "Minikube", "Docker", "Helm"],
        learning_outcomes=["Pod management", "Service discovery", "Scaling", "Rolling updates"],
    ),
    "spark": ProjectSuggestion(
        skill="Spark",
        title="Big Data ETL Pipeline with PySpark",
        description="Process a large public dataset (e.g., NYC taxi data) using PySpark. Perform data cleaning, feature engineering, and aggregations. Write to Parquet.",
        difficulty="intermediate",
        estimated_hours=20,
        technologies=["PySpark", "Jupyter", "Parquet", "S3"],
        learning_outcomes=["Distributed computing", "DataFrame API", "Partitioning", "Performance tuning"],
    ),
    "tensorflow": ProjectSuggestion(
        skill="TensorFlow",
        title="Image Classification Web App",
        description="Train a CNN for image classification using TensorFlow/Keras, then deploy it as a web app with FastAPI and a simple React frontend.",
        difficulty="intermediate",
        estimated_hours=25,
        technologies=["TensorFlow", "Keras", "FastAPI", "React"],
        learning_outcomes=["Model training", "Transfer learning", "Model serving", "Full-stack ML"],
    ),
    "pytorch": ProjectSuggestion(
        skill="PyTorch",
        title="Sentiment Analysis API",
        description="Fine-tune a pre-trained transformer model for sentiment analysis on product reviews. Deploy as an API with batch prediction support.",
        difficulty="advanced",
        estimated_hours=30,
        technologies=["PyTorch", "Transformers", "FastAPI", "Docker"],
        learning_outcomes=["Fine-tuning", "NLP pipelines", "Model optimization", "API deployment"],
    ),
    "nlp": ProjectSuggestion(
        skill="NLP",
        title="Resume Skills Extractor",
        description="Build an NLP pipeline that extracts skills, education, and experience from resume PDFs using spaCy and regex patterns.",
        difficulty="intermediate",
        estimated_hours=20,
        technologies=["spaCy", "Python", "PyPDF2", "regex"],
        learning_outcomes=["Named Entity Recognition", "Text processing", "Pattern matching", "Pipeline design"],
    ),
    "ci/cd": ProjectSuggestion(
        skill="CI/CD",
        title="Full CI/CD Pipeline with GitHub Actions",
        description="Set up a complete CI/CD pipeline: lint, test, build Docker image, push to registry, and deploy to staging/production environments.",
        difficulty="intermediate",
        estimated_hours=15,
        technologies=["GitHub Actions", "Docker", "pytest", "ESLint"],
        learning_outcomes=["Pipeline design", "Automated testing", "Container registry", "Deployment strategies"],
    ),
    "mongodb": ProjectSuggestion(
        skill="MongoDB",
        title="Content Management System API",
        description="Build a flexible CMS backend with MongoDB for dynamic content types, full-text search, and aggregation pipelines.",
        difficulty="intermediate",
        estimated_hours=20,
        technologies=["MongoDB", "FastAPI", "Motor", "Pydantic"],
        learning_outcomes=["Document modeling", "Aggregation pipelines", "Indexing", "Full-text search"],
    ),
    "network security": ProjectSuggestion(
        skill="Network Security",
        title="Network Traffic Analyzer",
        description="Build a Python tool that captures and analyzes network packets, detects suspicious patterns, and generates security reports.",
        difficulty="advanced",
        estimated_hours=25,
        technologies=["Python", "Scapy", "Wireshark", "pandas"],
        learning_outcomes=["Packet analysis", "Threat detection", "Network protocols", "Security reporting"],
    ),
    "machine learning": ProjectSuggestion(
        skill="Machine Learning",
        title="Predictive Maintenance System",
        description="Build an ML system that predicts equipment failures using sensor data. Include data preprocessing, model training, and a monitoring dashboard.",
        difficulty="advanced",
        estimated_hours=35,
        technologies=["Scikit-learn", "pandas", "Streamlit", "PostgreSQL"],
        learning_outcomes=["Time series analysis", "Feature engineering", "Model evaluation", "Dashboarding"],
    ),
    "airflow": ProjectSuggestion(
        skill="Airflow",
        title="Automated Data Pipeline Orchestrator",
        description="Build an Airflow DAG that orchestrates a daily ETL pipeline: fetch API data, validate, transform, load to warehouse, and send alerts.",
        difficulty="intermediate",
        estimated_hours=20,
        technologies=["Apache Airflow", "Python", "PostgreSQL", "Slack API"],
        learning_outcomes=["DAG design", "Task dependencies", "Error handling", "Monitoring"],
    ),
}


@router.get("/project-suggestions/{profile_id}", response_model=ProjectSuggestionsResponse)
def get_project_suggestions(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    from app.models.user_profile import UserProfile
    from app.services.gap_analyzer import analyze_gaps
    from app.config import settings

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    gaps = analyze_gaps(profile, db, tenant_id=tenant.id)
    
    # Identify top 3 unique skill gaps
    target_skills = []
    seen = set()
    for role_gap in gaps:
        for gap in role_gap.gaps:
            if gap.gap_severity in ("high", "medium") and gap.skill.lower() not in seen:
                seen.add(gap.skill.lower())
                target_skills.append(gap.skill)
                if len(target_skills) >= 3:
                    break
        if len(target_skills) >= 3:
            break

    if not target_skills:
        # No major gaps? Suggest advanced projects based on existing skills
        target_skills = profile.skills[:3] if profile.skills else ["Python", "SQL"]

    suggestions = []

    # 1. Try to generate dynamic suggestions if API key exists
    # 1. Try to generate dynamic suggestions if API key exists
    if settings.gemini_api_key:
        try:
            import google.generativeai as genai
            import json
            genai.configure(api_key=settings.gemini_api_key)

            prompt = (
                f"Suggest 3 unique portfolio projects for a developer who needs to learn: {', '.join(target_skills)}. "
                "The projects should be distinct and practical. "
                "Output ONLY valid JSON in the following format: "
                '{"suggestions": [{"title": "...", "skill": "...", "description": "...", "difficulty": "...", "estimated_hours": 0, "technologies": ["..."], "learning_outcomes": ["..."]}]}'
            )

            model = genai.GenerativeModel(
                model_name=settings.gemini_model,
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt)
            
            parsed = json.loads(response.text)
            for item in parsed.get("suggestions", []):
                suggestions.append(ProjectSuggestion(**item))
        except Exception as e:
            # logging.warning(f"LLM project generation failed: {e}")
            pass

    # 2. Fallback to static catalog if LLM failed or returned nothing
    if not suggestions:
        for skill in target_skills:
            project = PROJECT_CATALOG.get(skill.lower())
            if project:
                suggestions.append(project)
            else:
                 suggestions.append(ProjectSuggestion(
                    skill=skill,
                    title=f"Build a {skill} Portfolio Project",
                    description=f"Create a project that demonstrates your proficiency in {skill}. Focus on a real-world use case.",
                    difficulty="intermediate",
                    estimated_hours=20,
                    technologies=[skill],
                    learning_outcomes=[f"{skill} fundamentals", "Project documentation"],
                ))

    # Dedupe by title
    unique_suggestions = {s.title: s for s in suggestions}.values()
    return ProjectSuggestionsResponse(profile_id=profile_id, suggestions=list(unique_suggestions)[:6])
