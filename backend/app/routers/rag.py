"""RAG query endpoint — POST /api/query."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["rag"])


class RAGQueryRequest(BaseModel):
    query: str
    profile_id: Optional[int] = None
    user_id: Optional[int] = None


class RAGQueryResponse(BaseModel):
    answer: str
    sources: list[int]
    engine: str


@router.post("/query", response_model=RAGQueryResponse)
def rag_query_endpoint(req: RAGQueryRequest, db: Session = Depends(get_db)):
    """Run a RAG query against stored embeddings and return a Bedrock-generated answer."""
    try:
        from app.services.rag_service import rag_query
        result = rag_query(
            db,
            query=req.query,
            profile_id=req.profile_id,
            user_id=req.user_id,
        )
        return RAGQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")
